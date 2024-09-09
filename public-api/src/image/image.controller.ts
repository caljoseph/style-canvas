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

@Controller('image')
export class ImageController {
    private readonly logger = new Logger(ImageController.name);

    constructor(private readonly imageService: ImageService) {}

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

            // Add the request to the queue
            const requestHash = await this.imageService.addToQueue(user.cognitoId, generateImageDto.modelName, image);

            // Return the request hash to the user for tracking
            res.status(HttpStatus.ACCEPTED).json({ requestHash });
        } catch (error) {
            this.logger.error(`Failed to queue image generation request for user: ${user.cognitoId}`, error.stack);
            throw error;
        }
    }

    @Get('/status/:requestHash')
    @UseGuards(AuthGuard('jwt'))
    async getStatus(@Param('requestHash') requestHash: string, @UserDecorator() user: User) {
        const status = await this.imageService.getRequestStatus(requestHash, user.cognitoId);
        return { status };
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
