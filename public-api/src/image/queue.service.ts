import { Injectable } from '@nestjs/common';
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

    async getRequestStatus(requestHash: string, userID: string) {
        const queue = await this.getQueue();
        const request = queue.find(req => req.requestHash === requestHash && req.userID === userID);
        return request ? request.status : 'not found';
    }

    async getCompletedImagePath(requestHash: string, userID: string) {
        const queue = await this.getQueue();
        const request = queue.find(req => req.requestHash === requestHash && req.userID === userID && req.status === 'completed');
        if (!request) throw new Error('Completed image not found');
        return request.filePath;
    }

    async getNextPendingRequest() {
        const queue = await this.getQueue();
        return queue.find(req => req.status === 'pending');
    }

    async markRequestCompleted(requestHash: string) {
        const queue = await this.getQueue();
        const request = queue.find(req => req.requestHash === requestHash);
        if (request) {
            request.status = 'completed';
            await this.saveQueue(queue);
        }
    }

    async markRequestFailed(requestHash: string) {
        const queue = await this.getQueue();
        const request = queue.find(req => req.requestHash === requestHash);
        if (request) {
            request.status = 'failed';
            await this.saveQueue(queue);
        }
    }
}
