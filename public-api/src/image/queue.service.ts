import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

interface RequestInfo {
    requestHash: string;
    userID: string;
    modelName: string;
    filePath: string;
    status: 'pending' | 'completed' | 'failed';
    timestamp: Date;
}

@Injectable()
export class QueueService {
    private readonly logger = new Logger(QueueService.name);
    private readonly queueFilePath = path.join(__dirname, '../queue.json');

    async addRequestToQueue(requestHash: string, userID: string, modelName: string, filePath: string) {
        const queue = await this.getQueue();
        queue.push({
            requestHash,
            userID,
            modelName,
            filePath,
            status: 'pending',
            timestamp: new Date(),
        });
        await this.saveQueue(queue);

        // Log queue position for new request
        const position = await this.getQueuePosition(requestHash);
        this.logger.log(`Added request ${requestHash} to queue at position ${position}`);
    }

    async getQueue(): Promise<RequestInfo[]> {
        try {
            const data = await fs.readFile(this.queueFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async saveQueue(queue: RequestInfo[]) {
        await fs.writeFile(this.queueFilePath, JSON.stringify(queue, null, 2));
    }

    async getQueuePosition(requestHash: string): Promise<number> {
        const queue = await this.getQueue();
        const pendingRequests = queue.filter(req => req.status === 'pending');
        const position = pendingRequests.findIndex(req => req.requestHash === requestHash) + 1;
        return position || -1; // Return -1 if not found in pending requests
    }

    async getQueueLength(): Promise<number> {
        const queue = await this.getQueue();
        return queue.filter(req => req.status === 'pending').length;
    }

    async getRequestStatus(requestHash: string, userID: string): Promise<{
        status: string;
        position: number;
        queueLength: number;
    }> {
        const queue = await this.getQueue();
        const request = queue.find(req => req.requestHash === requestHash && req.userID === userID);

        if (!request) {
            return {
                status: 'not found',
                position: -1,
                queueLength: await this.getQueueLength()
            };
        }

        const position = request.status === 'pending' ? await this.getQueuePosition(requestHash) : -1;

        return {
            status: request.status,
            position,
            queueLength: await this.getQueueLength()
        };
    }

    async getCompletedImagePath(requestHash: string, userID: string) {
        const queue = await this.getQueue();
        const request = queue.find(req =>
            req.requestHash === requestHash &&
            req.userID === userID &&
            req.status === 'completed'
        );
        if (!request) throw new Error('Completed image not found');
        return request.filePath;
    }

    async getNextPendingRequest() {
        const queue = await this.getQueue();
        const pendingRequests = queue
            .filter(req => req.status === 'pending')
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return pendingRequests[0];
    }

    async markRequestCompleted(requestHash: string) {
        const queue = await this.getQueue();
        const request = queue.find(req => req.requestHash === requestHash);
        if (request) {
            request.status = 'completed';
            await this.saveQueue(queue);
            this.logger.log(`Marked request ${requestHash} as completed`);
        }
    }

    async markRequestFailed(requestHash: string) {
        const queue = await this.getQueue();
        const request = queue.find(req => req.requestHash === requestHash);
        if (request) {
            request.status = 'failed';
            await this.saveQueue(queue);
            this.logger.log(`Marked request ${requestHash} as failed`);
        }
    }

    async cleanOldRequests(maxAgeHours = 24) {
        const queue = await this.getQueue();
        const now = new Date();
        const filtered = queue.filter(req => {
            const age = now.getTime() - new Date(req.timestamp).getTime();
            return age < maxAgeHours * 60 * 60 * 1000;
        });

        if (filtered.length !== queue.length) {
            await this.saveQueue(filtered);
            this.logger.log(`Cleaned ${queue.length - filtered.length} old requests from queue`);
        }
    }
}