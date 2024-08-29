import { Module } from '@nestjs/common';
import { GenerateService } from './generate.service';
import { GenerateController } from './generate.controller';

@Module({
  providers: [GenerateService],
  controllers: [GenerateController]
})
export class GenerateModule {}
