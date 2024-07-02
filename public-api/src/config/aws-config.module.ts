import { Module } from '@nestjs/common';
import { AwsConfigService } from './aws-config.service';

@Module({
    providers: [AwsConfigService],
    exports: [AwsConfigService],
})
export class AwsConfigModule {}