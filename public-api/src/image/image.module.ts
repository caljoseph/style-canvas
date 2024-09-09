import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import {TokensModule} from "../tokens/tokens.module";
import {ImageController} from "./image.controller";
import {QueueService} from "./queue.service";

@Module({
  imports: [TokensModule],
  providers: [ImageService, QueueService],
  controllers: [ImageController]
})
export class ImageModule {}
