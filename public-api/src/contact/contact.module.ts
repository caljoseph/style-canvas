import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import {AwsConfigModule} from "../config/aws-config.module";

@Module({
  imports: [
    AwsConfigModule,
    ThrottlerModule.forRoot([{
      ttl: 60,           // Time window (1 minute)
      limit: 3,          // Max 3 requests per minute
    }]),
  ],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}