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
    private serverStatus: ServerStatus = 'STOPPED';
    private lastActivityTimestamp: Date = new Date();
    private inactivityCheckInterval: NodeJS.Timeout | null = null;
    private currentServerIP: string | null = null;

    constructor() {
        this.startInactivityMonitor();
    }

    private startInactivityMonitor() {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
        }

        this.inactivityCheckInterval = setInterval(async () => {
            if (this.serverStatus === 'RUNNING') {
                const inactiveTime = Date.now() - this.lastActivityTimestamp.getTime();
                if (inactiveTime > 60 * 60 * 1000) { // 1 hour
                    this.logger.log('ML server inactive for 1 hour, shutting down...');
                    await this.stopServer();
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    async getServerStatus(): Promise<ServerStatus> {
        try {
            const { stdout } = await exec(
                `aws ec2 describe-instances --instance-ids ${this.ML_INSTANCE_ID} ` +
                `--query 'Reservations[0].Instances[0].State.Name' --output text`
            );
            const instanceStatus = stdout.trim();
            switch (instanceStatus) {
                case 'running':
                    return 'RUNNING';
                case 'stopping':
                case 'stopped':
                    return 'STOPPED';
                default:
                    return 'STARTING';
            }
        } catch (error) {
            this.logger.error('Failed to get server status', error);
            return 'STOPPED';
        }
    }

    async getServerIP(): Promise<string | null> {
        return this.currentServerIP;
    }

    async startServer(): Promise<void> {
        const currentStatus = await this.getServerStatus();
        if (currentStatus !== 'STOPPED') {
            this.logger.log(`Server already ${currentStatus.toLowerCase()}`);
            return;
        }

        this.serverStatus = 'STARTING';
        this.logger.log('Starting ML server...');

        try {
            // Start the EC2 instance
            await exec(`aws ec2 start-instances --instance-ids ${this.ML_INSTANCE_ID}`);
            await exec(`aws ec2 wait instance-running --instance-ids ${this.ML_INSTANCE_ID}`);

            // Get the server IP
            const { stdout } = await exec(
                `aws ec2 describe-instances --instance-ids ${this.ML_INSTANCE_ID} ` +
                `--query 'Reservations[0].Instances[0].PrivateIpAddress' --output text`
            );

            this.currentServerIP = stdout.trim();
            this.logger.log(`ML server starting at IP: ${this.currentServerIP}`);

            // Wait for ML service to be ready
            await this.waitForHealthCheck();

            this.serverStatus = 'RUNNING';
            this.updateLastActivity();
            this.logger.log('ML server is now running and ready');
        } catch (error) {
            this.logger.error('Failed to start ML server', error);
            this.serverStatus = 'STOPPED';
            this.currentServerIP = null;
            throw new MLServerStartupException();
        }
    }

    async stopServer(): Promise<void> {
        const currentStatus = await this.getServerStatus();
        if (currentStatus !== 'RUNNING') {
            this.logger.log('Server is not running, skipping stop');
            return;
        }

        this.logger.log('Stopping ML server...');
        try {
            await exec(`aws ec2 stop-instances --instance-ids ${this.ML_INSTANCE_ID}`);
            await exec(`aws ec2 wait instance-stopped --instance-ids ${this.ML_INSTANCE_ID}`);
            this.serverStatus = 'STOPPED';
            this.currentServerIP = null;
            this.logger.log('ML server stopped successfully');
        } catch (error) {
            this.logger.error('Failed to stop ML server', error);
            throw error;
        }
    }

    private async waitForHealthCheck(maxRetries = 30): Promise<void> {
        if (!this.currentServerIP) {
            throw new Error('No server IP available for health check');
        }

        this.logger.log('Waiting for ML server health check...');
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(`http://${this.currentServerIP}:${this.ML_PORT}/health`);
                if (response.ok) {
                    this.logger.log('Health check passed');
                    return;
                }
            } catch (error) {
                this.logger.debug(`Health check attempt ${i + 1}/${maxRetries} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between attempts
            }
        }
        throw new Error('ML server health check failed after maximum retries');
    }

    updateLastActivity(): void {
        this.lastActivityTimestamp = new Date();
        this.logger.debug('Updated last activity timestamp');
    }

    onApplicationShutdown() {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
        }
    }
}