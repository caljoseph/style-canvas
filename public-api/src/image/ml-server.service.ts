import { Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import fetch from 'node-fetch';

const exec = promisify(execCallback);

export class MLServerStartupException extends Error {
    constructor() {
        super('Failed to start ML server');
    }
}

export type ServerStatus = 'STOPPED' | 'STARTING' | 'RUNNING';

@Injectable()
export class MLServerService {
    private readonly logger = new Logger(MLServerService.name);
    private readonly ML_INSTANCE_ID = 'i-00dacca11c59a3374';
    private readonly ML_PORT = 3000;
    private lastActivityTimestamp: Date = new Date();
    private inactivityCheckInterval: NodeJS.Timeout | null = null;
    private currentServerIP: string | null = null;

    constructor() {
        this.logger.log('Initializing MLServerService...');
        this.startInactivityMonitor();
    }

    private startInactivityMonitor() {
        this.logger.log('Starting inactivity monitor...');
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
            this.logger.warn('Existing inactivity monitor cleared.');
        }

        this.inactivityCheckInterval = setInterval(async () => {
            this.logger.debug('Inactivity monitor triggered.');
            const currentStatus = await this.getServerStatus();
            if (currentStatus === 'RUNNING') {
                const inactiveTime = Date.now() - this.lastActivityTimestamp.getTime();
                this.logger.debug(`Inactive time: ${inactiveTime}ms`);
                if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
                    this.logger.warn('ML server inactive for over 30 minutes. Initiating shutdown...');
                    await this.stopServer().catch((error) =>
                        this.logger.error('Error shutting down ML server in inactivity monitor', error)
                    );
                }
            } else {
                this.logger.debug('Server is not running; no action taken by inactivity monitor.');
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    async getServerConfig(): Promise<{ instanceId: string; port: number; ipAddress: string | null }> {
        this.logger.debug('Fetching server configuration...');
        return {
            instanceId: this.ML_INSTANCE_ID,
            port: this.ML_PORT,
            ipAddress: this.currentServerIP,
        };
    }

    async getServerStatus(): Promise<ServerStatus> {
        this.logger.debug('Checking server status via AWS CLI...');
        try {
            const { stdout } = await exec(
                `aws ec2 describe-instances --instance-ids ${this.ML_INSTANCE_ID} ` +
                `--query 'Reservations[0].Instances[0].State.Name' --output text`
            );
            const instanceStatus = stdout.trim();
            this.logger.log(`AWS CLI returned server status: ${instanceStatus}`);

            if (instanceStatus === 'running') {
                // Get IP if instance is running
                const { stdout: ipStdout } = await exec(
                    `aws ec2 describe-instances --instance-ids ${this.ML_INSTANCE_ID} ` +
                    `--query 'Reservations[0].Instances[0].PrivateIpAddress' --output text`
                );
                this.currentServerIP = ipStdout.trim();
                this.logger.log(`Updated ML server IP: ${this.currentServerIP}`);
                return 'RUNNING';
            }

            if (instanceStatus === 'stopping' || instanceStatus === 'stopped') {
                this.currentServerIP = null;
                return 'STOPPED';
            }

            return 'STARTING';
        } catch (error) {
            this.logger.error('Failed to retrieve server status via AWS CLI', error);
            this.currentServerIP = null;
            return 'STOPPED';
        }
    }

    async getServerIP(): Promise<string | null> {
        this.logger.debug(`Returning current server IP: ${this.currentServerIP}`);
        return this.currentServerIP;
    }

    async startServer(): Promise<void> {
        const currentStatus = await this.getServerStatus();
        if (currentStatus !== 'STOPPED') {
            this.logger.log(`Server already ${currentStatus.toLowerCase()}; skipping start.`);
            return;
        }

        this.logger.log('Starting ML server...');

        try {
            // Start the EC2 instance
            this.logger.log(`Sending start request for EC2 instance: ${this.ML_INSTANCE_ID}`);
            await exec(`aws ec2 start-instances --instance-ids ${this.ML_INSTANCE_ID}`);
            this.logger.debug('Waiting for EC2 instance to reach "running" state...');
            await exec(`aws ec2 wait instance-running --instance-ids ${this.ML_INSTANCE_ID}`);

            // Get the server IP
            const { stdout } = await exec(
                `aws ec2 describe-instances --instance-ids ${this.ML_INSTANCE_ID} ` +
                `--query 'Reservations[0].Instances[0].PrivateIpAddress' --output text`
            );

            this.currentServerIP = stdout.trim();
            this.logger.log(`ML server IP obtained: ${this.currentServerIP}`);

            // Wait for ML service to be ready
            await this.waitForHealthCheck();

            this.updateLastActivity();
            this.logger.log('ML server is now running and ready.');
        } catch (error) {
            this.logger.error('Failed to start ML server', error);
            this.currentServerIP = null;
            throw new MLServerStartupException();
        }
    }

    async stopServer(): Promise<void> {
        const currentStatus = await this.getServerStatus();
        if (currentStatus !== 'RUNNING') {
            this.logger.warn('Server is not running; skipping stop operation.');
            return;
        }

        this.logger.log('Stopping ML server...');
        try {
            await exec(`aws ec2 stop-instances --instance-ids ${this.ML_INSTANCE_ID}`);
            this.logger.debug('Waiting for EC2 instance to reach "stopped" state...');
            await exec(`aws ec2 wait instance-stopped --instance-ids ${this.ML_INSTANCE_ID}`);
            this.currentServerIP = null;
            this.logger.log('ML server stopped successfully.');
        } catch (error) {
            this.logger.error('Failed to stop ML server', error);
            throw error;
        }
    }

    private async waitForHealthCheck(maxRetries = 30): Promise<void> {
        if (!this.currentServerIP) {
            throw new Error('No server IP available for health check.');
        }

        this.logger.log('Waiting for ML server health check...');
        for (let i = 0; i < maxRetries; i++) {
            try {
                this.logger.debug(`Health check attempt ${i + 1}/${maxRetries} for IP: ${this.currentServerIP}`);
                const response = await fetch(`http://${this.currentServerIP}:${this.ML_PORT}/health`);
                if (response.ok) {
                    this.logger.log('Health check passed.');
                    return;
                } else {
                    this.logger.warn(`Health check failed with status: ${response.status}`);
                }
            } catch (error) {
                this.logger.debug(`Health check attempt ${i + 1} failed, error: ${error.message}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
        throw new Error('ML server health check failed after maximum retries.');
    }

    updateLastActivity(): void {
        this.lastActivityTimestamp = new Date();
        this.logger.debug(`Last activity timestamp updated to: ${this.lastActivityTimestamp.toISOString()}`);
    }

    onApplicationShutdown() {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
            this.logger.log('Inactivity monitor cleared on application shutdown.');
        }
    }
}