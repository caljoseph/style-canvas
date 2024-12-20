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
    private readonly ML_PORT = 3000;
    private readonly CLEAN_QUEUE_INTERVAL = 60 * 60 * 1000; // 1 hour
    private readonly SERVER_START_TIMEOUT = 600000; // 10 minutes
    private readonly SERVER_START_RETRY_INTERVAL = 5000; // 5 seconds
    private isProcessing = false;

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
                this.logger.error('[QueueCleaner] Failed to clean old requests', error);
            });
        }, this.CLEAN_QUEUE_INTERVAL);
    }

    private async ensureDirectoriesExist() {
        try {
            await fs.mkdir(this.queuedDir, { recursive: true });
            await fs.mkdir(this.completedDir, { recursive: true });
        } catch (error) {
            this.logger.error('[Init] Error creating directories', error);
            throw new HttpException("Failed to initialize image directories", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async addToQueue(userID: string, modelName: string, image: Express.Multer.File): Promise<string> {
        const requestHash = crypto.randomBytes(16).toString('hex');
        const filePath = path.join(this.queuedDir, `${requestHash}.png`);

        try {
            await fs.writeFile(filePath, image.buffer);
            await this.queueService.addRequestToQueue(requestHash, userID, modelName, filePath);

            const queuePosition = await this.queueService.getQueuePosition(requestHash);
            this.logger.log(`[Queue] Added request ${requestHash} at position ${queuePosition}`);

            if (!this.isProcessing) {
                this.processQueue().catch(error => {
                    this.logger.error('[Queue] Error initiating queue processing', error);
                });
            }

            return requestHash;
        } catch (error) {
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                this.logger.error('[Queue] Failed to cleanup file after error', cleanupError);
            }
            throw error;
        }
    }

    async processQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        let currentRequest: any = null;

        try {
            while ((currentRequest = await this.queueService.getNextPendingRequest())) {
                const { requestHash, userID, modelName, filePath } = currentRequest;
                this.logger.log(`[Queue] Processing request ${requestHash}`);

                try {
                    // Wait for server to be ready
                    await this.ensureServerRunning(requestHash);

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

                    this.logger.debug(`[Process] Sending request to ML server at http://${serverIP}:${this.ML_PORT}/generate/image`);
                    const response = await fetch(`http://${serverIP}:${this.ML_PORT}/generate/image`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            ...formData.getHeaders(),
                        },
                    });

                    this.mlServerService.updateLastActivity();

                    switch (response.status) {
                        case HttpStatus.CREATED:
                            const styledImage = await response.buffer();
                            const completedFilePath = path.join(this.completedDir, `${requestHash}.png`);
                            await fs.writeFile(completedFilePath, styledImage);
                            await this.queueService.markRequestCompleted(requestHash);
                            await fs.unlink(filePath);
                            this.logger.log(`[Process] Successfully completed request ${requestHash}`);
                            break;

                        case HttpStatus.BAD_REQUEST:
                            throw new InvalidModelNameException();

                        case HttpStatus.INTERNAL_SERVER_ERROR:
                            throw new InternalMLServerErrorException();

                        default:
                            throw new HttpException(
                                "Unexpected response from ML server",
                                HttpStatus.INTERNAL_SERVER_ERROR
                            );
                    }
                } catch (error) {
                    this.logger.error(`[Process] Error processing request ${requestHash}:`, error);
                    await this.queueService.markRequestFailed(requestHash);
                    if (error instanceof HttpException) {
                        throw error;
                    }
                    throw new HttpException("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
                }
            }
        } catch (error) {
            this.logger.error("[Queue] Processing encountered an error", error);
        } finally {
            this.isProcessing = false;
            const queueLength = await this.queueService.getQueueLength();

            if (queueLength > 0) {
                this.logger.log(`[Queue] Processing ended with ${queueLength} items remaining`);
                setImmediate(() => this.processQueue());
            } else {
                this.logger.log('[Queue] Processing completed - no items remaining');
            }
        }
    }

    private async ensureServerRunning(requestHash: string): Promise<void> {
        const startTime = Date.now();
        let lastStatus = '';
        let attemptCount = 0;

        this.logger.log(`[ServerStatus] Request ${requestHash}: Beginning server startup sequence`);

        while (Date.now() - startTime < this.SERVER_START_TIMEOUT) {
            attemptCount++;
            try {
                const status = await this.mlServerService.getServerStatus();

                if (status !== lastStatus) {
                    this.logger.log(
                        `[ServerStatus] Request ${requestHash}: ` +
                        `Server status changed from ${lastStatus || 'unknown'} to ${status} ` +
                        `(attempt ${attemptCount}, elapsed ${Math.round((Date.now() - startTime)/1000)}s)`
                    );
                    lastStatus = status;
                }

                switch (status) {
                    case 'RUNNING':
                        this.logger.log(
                            `[ServerStatus] Request ${requestHash}: ` +
                            `Server is running after ${Math.round((Date.now() - startTime)/1000)}s`
                        );
                        this.mlServerService.updateLastActivity();
                        return;

                    case 'STOPPED':
                        this.logger.log(
                            `[ServerStatus] Request ${requestHash}: ` +
                            `Initiating server startup (attempt ${attemptCount})`
                        );
                        await this.mlServerService.startServer();
                        break;

                    case 'STOPPING':
                        this.logger.log(
                            `[ServerStatus] Request ${requestHash}: ` +
                            `Waiting for server to finish stopping (${Math.round((Date.now() - startTime)/1000)}s elapsed)`
                        );
                        break;

                    case 'STARTING':
                        this.logger.log(
                            `[ServerStatus] Request ${requestHash}: ` +
                            `Waiting for server startup to complete (${Math.round((Date.now() - startTime)/1000)}s elapsed)`
                        );
                        break;
                }

                // For any non-RUNNING state, wait before checking again
                await new Promise(resolve => setTimeout(resolve, this.SERVER_START_RETRY_INTERVAL));

            } catch (error) {
                this.logger.error(
                    `[ServerStatus] Request ${requestHash}: ` +
                    `Error during startup attempt ${attemptCount}: ${error.message}`
                );

                if (Date.now() - startTime >= this.SERVER_START_TIMEOUT) {
                    throw new MLServerOfflineException(
                        `Server failed to start after ${Math.round((Date.now() - startTime)/1000)}s ` +
                        `and ${attemptCount} attempts`
                    );
                }

                await new Promise(resolve => setTimeout(resolve, this.SERVER_START_RETRY_INTERVAL));
            }
        }

        const timeoutSeconds = Math.round((Date.now() - startTime)/1000);
        this.logger.error(
            `[ServerStatus] Request ${requestHash}: ` +
            `Server startup timed out after ${timeoutSeconds}s and ${attemptCount} attempts. ` +
            `Final status: ${lastStatus}`
        );

        throw new MLServerOfflineException(
            `Server failed to start within timeout period (${timeoutSeconds}s, ${attemptCount} attempts)`
        );
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
            this.logger.log(`[Retrieve] Successfully retrieved image for request ${requestHash}`);
            return imageBuffer;
        } catch (error) {
            this.logger.error(`[Retrieve] Failed to retrieve image for request ${requestHash}`, error);
            throw new HttpException('Image not found or already retrieved', HttpStatus.NOT_FOUND);
        }
    }
}