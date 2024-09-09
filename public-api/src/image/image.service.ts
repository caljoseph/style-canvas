import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { TokensService } from "../tokens/tokens.service";
import { InsufficientTokensException } from "./exceptions/insufficient-tokens.exception";
import fetch from 'node-fetch';
import * as FormData from 'form-data';
import { InvalidModelNameException } from "./exceptions/invalid-model-name.exception";
import { InternalMLServerErrorException } from "./exceptions/internal-image-server-error.exception";
import { MLServerOfflineException } from "./exceptions/ml-server-offline.exception";

@Injectable()
export class ImageService {
    private readonly logger = new Logger(ImageService.name);

    constructor(private tokensService: TokensService) {}

    async generateImage(userID: string, modelName: string, image: Express.Multer.File): Promise<Buffer> {
        // Check if the user has any tokens
        const hasTokens = await this.tokensService.getTokenBalance(userID);
        if (!hasTokens) {
            throw new InsufficientTokensException();
        }

        // Prepare the image for sending to the ML server
        const formData = new FormData();
        formData.append('modelName', modelName);
        formData.append('image', image.buffer, image.originalname);

        try {
            // Send a request to the ML server
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
                    const imageBuffer = await response.buffer();
                    await this.tokensService.adjustTokens(userID, -1);
                    return imageBuffer;
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
            this.logger.error('Error during image generation:', error);

            if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
                throw new MLServerOfflineException();
            }

            // Rethrow the error if it's one of our custom exceptions
            if (error instanceof HttpException) {
                throw error;
            }

            // For any other unexpected errors
            throw new HttpException("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}