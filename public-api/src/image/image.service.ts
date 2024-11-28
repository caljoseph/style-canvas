import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TokensService } from '../tokens/tokens.service';
import { InsufficientTokensException } from "./exceptions/insufficient-tokens.exception";
import { InvalidModelNameException } from "./exceptions/invalid-model-name.exception";
import { InternalMLServerErrorException } from "./exceptions/internal-image-server-error.exception";
import { MLServerOfflineException } from "./exceptions/ml-server-offline.exception";
import fetch from 'node-fetch';
import * as FormData from 'form-data';
import { QueueService } from './queue.service';
import { MLServerService } from './ml-server.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ImageService {
    private readonly logger = new Logger(ImageService.name);
    private readonly queuedDir = path.join(__dirname, '../queued_images');
    private readonly completedDir = path.join(__dirname, '../completed_images');
    private isProcessing = false;
    private readonly ML_PORT = 3000;
    private readonly CLEAN_QUEUE_INTERVAL = 60 * 60 * 1000; // 1 hour

    constructor(
        private readonly tokensService: TokensService,
        private readonly queueService: QueueService,
        private readonly mlServerService: MLServerService,
    ) {
        this.ensureDirectoriesExist();
        this.startQueueCleaner();
    }

    private startQueueCleaner() {
        setInterval(() => {
            this.queueService.cleanOldRequests(24).catch(error => {
                this.logger.error('Failed to clean old requests', error);
            });
        }, this.CLEAN_QUEUE_INTERVAL);
    }

    private async ensureDirectoriesExist() {
        try {
            await fs.mkdir(this.queuedDir, { recursive: true });
            await fs.mkdir(this.completedDir, { recursive: true });
        } catch (error) {
            this.logger.error('Error creating necessary directories', error);
            throw new HttpException("Failed to set up image directories", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async addToQueue(userID: string, modelName: string, image: Express.Multer.File): Promise<string> {
        const requestHash = crypto.randomBytes(16).toString('hex');
        const filePath = path.join(this.queuedDir, `${requestHash}.png`);

        try {
            await fs.writeFile(filePath, image.buffer);
            await this.queueService.addRequestToQueue(requestHash, userID, modelName, filePath);

            const queuePosition = await this.queueService.getQueuePosition(requestHash);
            this.logger.log(`Added request ${requestHash} to queue at position ${queuePosition}`);

            if (!this.isProcessing) {
                this.processQueue().catch(error => {
                    this.logger.error('Error processing queue', error);
                });
            }

            return requestHash;
        } catch (error) {
            // Cleanup if queue addition fails
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                this.logger.error('Failed to cleanup file after queue addition error', cleanupError);
            }
            throw error;
        }
    }

    async getRequestStatus(requestHash: string, userID: string) {
        return this.queueService.getRequestStatus(requestHash, userID);
    }

    async retrieveCompletedImage(requestHash: string, userID: string): Promise<Buffer> {
        const completedFilePath = path.join(this.completedDir, `${requestHash}.png`);

        try {
            const imageBuffer = await fs.readFile(completedFilePath);
            await this.tokensService.adjustTokens(userID, -1);
            await fs.unlink(completedFilePath);
            this.logger.log(`Successfully retrieved and cleaned up image for request ${requestHash}`);
            return imageBuffer;
        } catch (error) {
            this.logger.error(`Failed to retrieve image for request hash: ${requestHash}`, error.stack);
            throw new HttpException('Image not found or already retrieved', HttpStatus.NOT_FOUND);
        }
    }

    async processQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        let currentRequest: any = null;

        try {
            // Process queue items one by one
            while ((currentRequest = await this.queueService.getNextPendingRequest())) {
                const { requestHash, userID, modelName, filePath } = currentRequest;
                const queuePosition = await this.queueService.getQueuePosition(requestHash);
                this.logger.log(`Processing request ${requestHash} (position ${queuePosition} in queue)`);

                try {
                    // Ensure server is running
                    while (true) {
                        const serverStatus = await this.mlServerService.getServerStatus();
                        if (serverStatus === 'RUNNING') {
                            this.mlServerService.updateLastActivity(); // Update activity when server is found running
                            break;
                        }
                        if (serverStatus === 'STOPPED') {
                            this.logger.log('Starting ML server for request processing...');
                            await this.mlServerService.startServer();
                        }
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }

                    // Verify tokens
                    const numTokens = await this.tokensService.getTokenBalance(userID);
                    if (numTokens < 1) {
                        throw new InsufficientTokensException();
                    }

                    // Process image
                    const imageBuffer = await fs.readFile(filePath);
                    const formData = new FormData();
                    formData.append('modelName', modelName);
                    formData.append('image', imageBuffer, `${requestHash}.png`);

                    const serverIP = await this.mlServerService.getServerIP();
                    if (!serverIP) throw new MLServerOfflineException();

                    this.logger.debug(`Sending request to ML server at http://${serverIP}:${this.ML_PORT}/generate/image`);
                    const response = await fetch(`http://${serverIP}:${this.ML_PORT}/generate/image`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            ...formData.getHeaders(),
                        },
                    });

                    this.mlServerService.updateLastActivity();
                    this.logger.log(`ML server response status: ${response.status} for request ${requestHash}`);

                    switch (response.status) {
                        case HttpStatus.CREATED:
                            const styledImage = await response.buffer();
                            const completedFilePath = path.join(this.completedDir, `${requestHash}.png`);
                            await fs.writeFile(completedFilePath, styledImage);
                            await this.queueService.markRequestCompleted(requestHash);
                            await fs.unlink(filePath);
                            this.logger.log(`Successfully completed request ${requestHash}`);
                            // Update activity after successful processing
                            this.mlServerService.updateLastActivity();
                            break;

                        case HttpStatus.BAD_REQUEST:
                            throw new InvalidModelNameException();

                        case HttpStatus.INTERNAL_SERVER_ERROR:
                            throw new InternalMLServerErrorException();

                        default:
                            throw new HttpException(
                                "An unknown error was received from the ML server",
                                HttpStatus.INTERNAL_SERVER_ERROR
                            );
                    }
                } catch (error) {
                    this.logger.error(`Error processing request ${requestHash}:`, error);
                    await this.queueService.markRequestFailed(requestHash);

                    if (error instanceof HttpException) {
                        throw error;
                    }
                    throw new HttpException("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
                }
            }
        } catch (error) {
            this.logger.error("Queue processing encountered an error", error);
        } finally {
            this.isProcessing = false;

            // Check if there are any remaining items in queue
            const queueLength = await this.queueService.getQueueLength();
            if (queueLength > 0) {
                this.logger.log(`Queue processing ended with ${queueLength} items remaining`);
                // Restart processing if items remain
                setImmediate(() => this.processQueue());
            } else {
                this.logger.log('Queue processing completed - no items remaining');
            }
        }
    }
}