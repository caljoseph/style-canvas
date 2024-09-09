import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Logger,
    Post,
    Res,
    UploadedFile,
    UseGuards, UseInterceptors,
    UsePipes, ValidationPipe
} from '@nestjs/common';
import {ImageService} from "./image.service";
import {GenerateImageDto} from "./dto/image-generate-image.dto";
import {UserDecorator} from "../users/user.decorator";
import {User} from "../users/user.model";
import {AuthGuard} from "@nestjs/passport";
import { Response } from 'express';
import {FileInterceptor} from "@nestjs/platform-express";

@Controller('image')
export class ImageController {
    private readonly logger = new Logger(ImageController.name)

    constructor(private readonly imageService: ImageService) {}

    @Post('/generate')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('image'))
    async generate(
        @UserDecorator() user: User,
        @UploadedFile() image: Express.Multer.File,
        @Body() generateImageDto: GenerateImageDto,
        @Res() res: Response, // Import from 'express'

    ) {
        try {
            if (!image) {
                throw new HttpException('Image file is required', HttpStatus.BAD_REQUEST);
            }

            // Call the service to generate an image, passing the image buffer
            const styledImage = await this.imageService.generateImage(user.cognitoId, generateImageDto.modelName, image);

            // Send the image buffer directly as a response
            res.status(HttpStatus.CREATED)
                .contentType('image/png')
                .send(styledImage);
        } catch (error) {
            this.logger.error(`Failed to generate image for user: ${user.cognitoId} with model type "${generateImageDto.modelName}"`, error.stack);
            throw error;
        }
    }

}
