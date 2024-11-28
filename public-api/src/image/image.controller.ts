import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Logger,
    Param,
    Post,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    ValidationPipe
} from '@nestjs/common';
import { ImageService } from './image.service';
import { GenerateImageDto } from './dto/image-generate-image.dto';
import { UserDecorator } from '../users/user.decorator';
import { User } from '../users/user.model';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MLServerService } from './ml-server.service';
import { QueueService } from './queue.service';
import { validateImage } from './image-validation';

@Controller('image')
export class ImageController {
    private readonly logger = new Logger(ImageController.name);

    constructor(
        private readonly imageService: ImageService,
        private readonly mlServerService: MLServerService,
        private readonly queueService: QueueService
    ) {}

    @Get('/server-status')
    @UseGuards(AuthGuard('jwt'))
    async getMLServerStatus() {
        const status = await this.mlServerService.getServerStatus();
        return { status };
    }

    @Post('/generate')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('image'))
    async generate(
        @UserDecorator() user: User,
        @UploadedFile() image: Express.Multer.File,
        @Body(ValidationPipe) generateImageDto: GenerateImageDto,
        @Res() res: Response,
    ) {
        try {
            validateImage(image);

            const serverStatus = await this.mlServerService.getServerStatus();
            const requestHash = await this.imageService.addToQueue(user.cognitoId, generateImageDto.modelName, image);

            // Get queue info using QueueService
            const queueInfo = await this.queueService.getRequestStatus(requestHash, user.cognitoId);
            const queueLength = await this.queueService.getQueueLength();

            let estimatedWaitTime = queueInfo.position === 1 ? '30 seconds' :
                `approximately ${queueInfo.position * 30} seconds`;

            if (serverStatus === 'STOPPED') {
                estimatedWaitTime = '2-3 minutes';
                // Start server if it's stopped
                this.mlServerService.startServer().catch(error => {
                    this.logger.error('Failed to start ML server', error);
                });
            }

            res.status(HttpStatus.ACCEPTED).json({
                requestHash,
                serverStatus,
                estimatedWaitTime,
                queuePosition: queueInfo.position,
                queueLength
            });
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Failed to queue image generation request for user: ${user.cognitoId}`, error.stack);
            throw new HttpException(error.message || 'Failed to process request', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('/status/:requestHash')
    @UseGuards(AuthGuard('jwt'))
    async getStatus(@Param('requestHash') requestHash: string, @UserDecorator() user: User) {
        const queueInfo = await this.queueService.getRequestStatus(requestHash, user.cognitoId);
        const serverStatus = await this.mlServerService.getServerStatus();

        let estimatedWaitTime: string;
        if (serverStatus === 'STOPPED') {
            estimatedWaitTime = '2-3 minutes plus queue time';
        } else if (serverStatus === 'STARTING') {
            estimatedWaitTime = '1-2 minutes plus queue time';
        } else {
            estimatedWaitTime = queueInfo.position > 1
                ? `approximately ${queueInfo.position * 30} seconds`
                : 'less than 30 seconds';
        }

        return {
            status: queueInfo.status,
            queuePosition: queueInfo.position,
            totalQueueLength: queueInfo.queueLength,
            serverStatus,
            estimatedWaitTime
        };
    }

    @Get('/retrieve/:requestHash')
    @UseGuards(AuthGuard('jwt'))
    async retrieveImage(@Param('requestHash') requestHash: string, @UserDecorator() user: User, @Res() res: Response) {
        try {
            const imageBuffer = await this.imageService.retrieveCompletedImage(requestHash, user.cognitoId);
            res.status(HttpStatus.OK).contentType('image/png').send(imageBuffer);
        } catch (error) {
            this.logger.error(`Failed to retrieve image for request hash: ${requestHash}`, error.stack);
            throw error;
        }
    }
}