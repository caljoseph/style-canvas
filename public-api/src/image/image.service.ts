import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TokensService } from '../tokens/tokens.service';
import { InsufficientTokensException } from "./exceptions/insufficient-tokens.exception";
import { InvalidModelNameException } from "./exceptions/invalid-model-name.exception";
import { InternalMLServerErrorException } from "./exceptions/internal-image-server-error.exception";
import { MLServerOfflineException } from "./exceptions/ml-server-offline.exception";
import fetch from 'node-fetch'; // Ensure node-fetch is installed
import * as FormData from 'form-data';
import { QueueService } from './queue.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ImageService {
    private readonly logger = new Logger(ImageService.name);
    private readonly queuedDir = path.join(__dirname, '../queued_images');
    private readonly completedDir = path.join(__dirname, '../completed_images');
    private isProcessing = false;  // Flag to track active processing

    constructor(
        private readonly tokensService: TokensService,
        private readonly queueService: QueueService,
    ) {
        this.ensureDirectoriesExist();
    }

    private async ensureDirectoriesExist() {
        try {
            // Ensure the queued_images directory exists
            await fs.mkdir(this.queuedDir, { recursive: true });
            // Ensure the completed_images directory exists
            await fs.mkdir(this.completedDir, { recursive: true });
        } catch (error) {
            this.logger.error('Error creating necessary directories', error);
            throw new HttpException("Failed to set up image directories", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async addToQueue(userID: string, modelName: string, image: Express.Multer.File): Promise<string> {
        const requestHash = crypto.randomBytes(16).toString('hex');
        const filePath = path.join(this.queuedDir, `${requestHash}.png`);

        // Save the unstyled image to the queued directory
        await fs.writeFile(filePath, image.buffer);

        // Add request info to the queue
        await this.queueService.addRequestToQueue(requestHash, userID, modelName, filePath);

        // Trigger queue processing if not already running
        if (!this.isProcessing) {
            this.processQueue(); // Note: No `await` so it doesn't block
        }

        return requestHash;
    }


    async getRequestStatus(requestHash: string, userID: string) {
        return this.queueService.getRequestStatus(requestHash, userID);
    }

    async retrieveCompletedImage(requestHash: string, userID: string): Promise<Buffer> {
        // Make sure to look in the completed_images directory, not queued_images
        const completedFilePath = path.join(this.completedDir, `${requestHash}.png`);

        try {
            const imageBuffer = await fs.readFile(completedFilePath);

            // Deduct tokens and delete the image after serving
            await this.tokensService.adjustTokens(userID, -1);
            await fs.unlink(completedFilePath);

            return imageBuffer;
        } catch (error) {
            this.logger.error(`Failed to retrieve image for request hash: ${requestHash}`, error.stack);
            throw new HttpException('Image not found or already retrieved', HttpStatus.NOT_FOUND);
        }
    }

    async processQueue() {
        if (this.isProcessing) {
            return; // If already processing, do nothing
        }

        this.isProcessing = true; // Mark as processing

        try {
            let request = await this.queueService.getNextPendingRequest();

            while (request) {
                const { requestHash, userID, modelName, filePath } = request;
                this.logger.log(`Processing request: ${requestHash} for user: ${userID}`);

                try {
                    // Check if the user has enough tokens
                    const numTokens = await this.tokensService.getTokenBalance(userID);
                    if (numTokens < 1) {
                        throw new InsufficientTokensException();
                    }

                    const imageBuffer = await fs.readFile(filePath);

                    // Prepare the image for sending to the ML server
                    const formData = new FormData();
                    formData.append('modelName', modelName);
                    formData.append('image', imageBuffer, `${requestHash}.png`);

                    const response = await fetch(`http://localhost:3001/generate/image`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            ...formData.getHeaders(),
                        },
                    });

                    this.logger.log(`ML server response status: ${response.status}`);

                    switch (response.status) {
                        case HttpStatus.CREATED:
                            const styledImage = await response.buffer();

                            // Save the styled image in the completed directory
                            const completedFilePath = path.join(this.completedDir, `${requestHash}.png`);
                            await fs.writeFile(completedFilePath, styledImage);

                            // Mark the request as completed in the queue
                            await this.queueService.markRequestCompleted(requestHash);
                            await fs.unlink(filePath); // Delete the original unstyled image

                            break;

                        case HttpStatus.BAD_REQUEST:
                            throw new InvalidModelNameException();

                        case HttpStatus.INTERNAL_SERVER_ERROR:
                            throw new InternalMLServerErrorException();

                        case HttpStatus.NOT_FOUND:
                            throw new HttpException("Not found", HttpStatus.NOT_FOUND);

                        default:
                            throw new HttpException("An unknown error was received from the ML server", HttpStatus.INTERNAL_SERVER_ERROR);
                    }
                } catch (error) {
                    this.logger.error(`Error during image generation for request: ${requestHash}`, error);

                    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
                        await this.queueService.markRequestFailed(requestHash);
                        throw new MLServerOfflineException();
                    }

                    // Rethrow the error if it's one of our custom exceptions
                    if (error instanceof HttpException) {
                        await this.queueService.markRequestFailed(requestHash);
                        throw error;
                    }

                    // For any other unexpected errors
                    await this.queueService.markRequestFailed(requestHash);
                    throw new HttpException("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
                }

                // Get the next request from the queue
                request = await this.queueService.getNextPendingRequest();
            }
        } catch (error) {
            this.logger.error("Queue processing encountered an error", error);
        } finally {
            this.isProcessing = false; // Mark as not processing
        }
    }
}
