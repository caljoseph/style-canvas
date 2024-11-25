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

@Controller('image')
export class ImageController {
    private readonly logger = new Logger(ImageController.name);

    constructor(
        private readonly imageService: ImageService,
        private readonly mlServerService: MLServerService
    ) {}

    @Get('/server-status')
    @UseGuards(AuthGuard('jwt'))
    async getMLServerStatus() {
        const status = await this.mlServerService.getServerStatus();
        return { status };
    }

    @Get('/server-config')
    @UseGuards(AuthGuard('jwt'))
    async getMLServerConfig() {
        const config = await this.mlServerService.getServerConfig()
        return { config }
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
            if (!image) {
                throw new HttpException('Image file is required', HttpStatus.BAD_REQUEST);
            }

            const serverStatus = await this.mlServerService.getServerStatus();
            const requestHash = await this.imageService.addToQueue(user.cognitoId, generateImageDto.modelName, image);

            let estimatedWaitTime = '30 seconds';
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
                estimatedWaitTime
            });
        } catch (error) {
            this.logger.error(`Failed to queue image generation request for user: ${user.cognitoId}`, error.stack);
            throw error;
        }
    }

    @Get('/status/:requestHash')
    @UseGuards(AuthGuard('jwt'))
    async getStatus(@Param('requestHash') requestHash: string, @UserDecorator() user: User) {
        const queueInfo = await this.imageService.getRequestStatus(requestHash, user.cognitoId);
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