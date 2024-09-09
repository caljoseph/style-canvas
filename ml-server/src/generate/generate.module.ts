import { Module } from '@nestjs/common';
import { GenerateController } from './generate.controller';

@Module({
  controllers: [GenerateController]
})
export class GenerateModule {}
