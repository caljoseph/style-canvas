import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import {TokensModule} from "../tokens/tokens.module";
import {ImageController} from "./image.controller";

@Module({
  imports: [TokensModule],
  providers: [ImageService],
  controllers: [ImageController]
})
export class ImageModule {}
