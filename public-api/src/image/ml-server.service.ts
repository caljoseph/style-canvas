import { Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import fetch from 'node-fetch';

const exec = promisify(execCallback);

export class MLServerStartupException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MLServerStartupException';
    }
}

export type ServerStatus = 'STOPPING' | 'STOPPED' | 'STARTING' | 'RUNNING';

@Injectable()
export class MLServerService {
    private readonly logger = new Logger(MLServerService.name);
    private readonly ML_INSTANCE_ID = 'i-00dacca11c59a3374';
    private readonly ML_PORT = 3000;
    private readonly STATE_CHECK_INTERVAL = 5000; // 5 seconds
    private readonly MAX_TRANSITION_ATTEMPTS = 60; // 5 minutes with 5-second intervals
    private readonly INACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutes

    private lastActivityTimestamp: Date = new Date();
    private inactivityCheckInterval: NodeJS.Timeout | null = null;
    private currentServerIP: string | null = null;
    private isStarting = false;

    constructor() {
        this.logger.log('[Init] Initializing MLServerService');
        this.startInactivityMonitor();
    }

    async getServerConfig(): Promise<{ instanceId: string; port: number; ipAddress: string | null }> {
        return {
            instanceId: this.ML_INSTANCE_ID,
            port: this.ML_PORT,
            ipAddress: this.currentServerIP,
        };
    }

    async getServerStatus(): Promise<ServerStatus> {
        try {
            const { stdout } = await exec(
                `aws ec2 describe-instances --instance-ids ${this.ML_INSTANCE_ID} ` +
                `--query 'Reservations[0].Instances[0].State.Name' --output text`
            );
            const instanceStatus = stdout.trim();

            if (instanceStatus === 'running') {
                if (!this.currentServerIP) {
                    const ip = await this.fetchServerIP();
                    if (ip) this.currentServerIP = ip;
                }
                return 'RUNNING';
            }

            if (instanceStatus === 'stopping') return 'STOPPING';
            if (instanceStatus === 'stopped') {
                this.currentServerIP = null;
                return 'STOPPED';
            }
            if (instanceStatus === 'pending') return 'STARTING';

            this.logger.warn(`[Status] Unexpected AWS status: ${instanceStatus}`);
            return 'STOPPED';
        } catch (error) {
            this.logger.error('[Status] Failed to retrieve server status', error);
            this.currentServerIP = null;
            return 'STOPPED';
        }
    }

    async getServerIP(): Promise<string | null> {
        return this.currentServerIP;
    }

    async startServer(): Promise<void> {
        if (this.isStarting) {
            this.logger.warn('[StartServer] Start operation already in progress');
            await this.waitForHealthCheck();
            return;
        }

        try {
            this.isStarting = true;
            const initialStatus = await this.getServerStatus();
            this.logger.log(`[StartServer] Initial server status: ${initialStatus}`);

            switch (initialStatus) {
                case 'RUNNING':
                    this.logger.log('[StartServer] Server already running');
                    return;

                case 'STARTING':
                    this.logger.log('[StartServer] Server in starting state, waiting for health check');
                    await this.waitForHealthCheck();
                    return;

                case 'STOPPING':
                    this.logger.log('[StartServer] Server is stopping, waiting for stopped state');
                    await this.waitForStateTransition('STOPPED');
                    break;

                case 'STOPPED':
                    break;

                default:
                    throw new MLServerStartupException(`Invalid initial state: ${initialStatus}`);
            }

            this.logger.log('[StartServer] Initiating server start sequence');
            await this.initiateStartSequence();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`[StartServer] Failed to start server: ${errorMessage}`, error);
            throw new MLServerStartupException(`Start sequence failed: ${errorMessage}`);
        } finally {
            this.isStarting = false;
        }
    }

    async stopServer(): Promise<void> {
        const currentStatus = await this.getServerStatus();
        if (currentStatus !== 'RUNNING') {
            this.logger.warn('[StopServer] Server is not running, current status:', currentStatus);
            return;
        }

        try {
            this.logger.log('[StopServer] Initiating server shutdown');
            await exec(`aws ec2 stop-instances --instance-ids ${this.ML_INSTANCE_ID}`);
            await this.waitForStateTransition('STOPPED');
            this.currentServerIP = null;
            this.logger.log('[StopServer] Server stopped successfully');
        } catch (error) {
            this.logger.error('[StopServer] Failed to stop server', error);
            throw error;
        }
    }

    private async initiateStartSequence(): Promise<void> {
        try {
            this.logger.log(`[StartSequence] Starting EC2 instance ${this.ML_INSTANCE_ID}`);
            await exec(`aws ec2 start-instances --instance-ids ${this.ML_INSTANCE_ID}`);

            await this.waitForStateTransition('RUNNING');

            const ip = await this.fetchServerIP();
            if (!ip) {
                throw new MLServerStartupException('Failed to obtain server IP');
            }
            this.currentServerIP = ip;
            this.logger.log(`[StartSequence] Server IP obtained: ${ip}`);

            this.logger.log('[StartSequence] Waiting for service health check');
            await this.waitForHealthCheck();

            this.updateLastActivity();
            this.logger.log('[StartSequence] Server start sequence completed successfully');
        } catch (error) {
            this.currentServerIP = null;
            throw error;
        }
    }

    private async waitForStateTransition(targetState: ServerStatus): Promise<void> {
        this.logger.log(`[StateTransition] Waiting for transition to ${targetState}`);
        let attempts = 0;

        while (attempts < this.MAX_TRANSITION_ATTEMPTS) {
            const currentStatus = await this.getServerStatus();

            if (currentStatus === targetState) {
                this.logger.log(`[StateTransition] Successfully reached ${targetState} state`);
                return;
            }

            const isValidTransition = this.isValidStateTransition(currentStatus, targetState);
            if (!isValidTransition) {
                throw new MLServerStartupException(
                    `Invalid state transition: ${currentStatus} → ${targetState}`
                );
            }

            attempts++;
            if (attempts % 6 === 0) { // Log every 30 seconds
                this.logger.log(
                    `[StateTransition] Still waiting for ${targetState} state. ` +
                    `Current: ${currentStatus}, Attempt: ${attempts}/${this.MAX_TRANSITION_ATTEMPTS}`
                );
            }

            await new Promise(resolve => setTimeout(resolve, this.STATE_CHECK_INTERVAL));
        }

        throw new MLServerStartupException(
            `Timeout waiting for ${targetState} state after ${this.MAX_TRANSITION_ATTEMPTS} attempts`
        );
    }

    private isValidStateTransition(currentState: ServerStatus, targetState: ServerStatus): boolean {
        const validTransitions = {
            'STOPPING': ['STOPPED'],
            'STOPPED': ['STARTING', 'RUNNING'],
            'STARTING': ['RUNNING'],
            'RUNNING': ['STOPPING', 'STOPPED']
        };

        return validTransitions[currentState]?.includes(targetState) ?? false;
    }

    private async fetchServerIP(): Promise<string | null> {
        try {
            const { stdout } = await exec(
                `aws ec2 describe-instances --instance-ids ${this.ML_INSTANCE_ID} ` +
                `--query 'Reservations[0].Instances[0].PrivateIpAddress' --output text`
            );
            return stdout.trim() || null;
        } catch (error) {
            this.logger.error('[FetchIP] Failed to fetch server IP', error);
            return null;
        }
    }

    private async waitForHealthCheck(maxRetries = 30): Promise<void> {
        if (!this.currentServerIP) {
            throw new MLServerStartupException('No server IP available for health check');
        }

        this.logger.log('[HealthCheck] Starting health check sequence');
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(`http://${this.currentServerIP}:${this.ML_PORT}/health`);
                if (response.ok) {
                    this.logger.log('[HealthCheck] Service is healthy');
                    this.updateLastActivity();
                    return;
                }
                this.logger.warn(`[HealthCheck] Attempt ${i + 1}/${maxRetries} failed: ${response.status}`);
            } catch (error) {
                if ((i + 1) % 6 === 0) { // Log every minute
                    this.logger.warn(
                        `[HealthCheck] Attempt ${i + 1}/${maxRetries} failed: ${error.message}`
                    );
                }
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        throw new MLServerStartupException('Health check failed after maximum retries');
    }

    private startInactivityMonitor(): void {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
        }

        this.inactivityCheckInterval = setInterval(async () => {
            try {
                const currentStatus = await this.getServerStatus();
                if (currentStatus !== 'RUNNING') return;

                const inactiveTime = Date.now() - this.lastActivityTimestamp.getTime();
                if (inactiveTime > this.MAX_INACTIVITY_TIME) {
                    this.logger.warn(
                        `[InactivityMonitor] Server inactive for ${Math.floor(inactiveTime / 60000)} minutes. ` +
                        `Last activity: ${this.lastActivityTimestamp.toISOString()}. Initiating shutdown.`
                    );
                    await this.stopServer();
                }
            } catch (error) {
                this.logger.error('[InactivityMonitor] Error during inactivity check', error);
            }
        }, this.INACTIVITY_CHECK_INTERVAL);
    }

    updateLastActivity(): void {
        const previousTimestamp = this.lastActivityTimestamp;
        this.lastActivityTimestamp = new Date();
        this.logger.debug(
            `[Activity] Updated from ${previousTimestamp.toISOString()} to ${this.lastActivityTimestamp.toISOString()}`
        );
    }

    onApplicationShutdown(): void {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
            this.logger.log('[Shutdown] Cleared inactivity monitor');
        }
    }
}