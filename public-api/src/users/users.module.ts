import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserRepository } from "./user.repository";
import {AwsConfigModule} from "../config/aws-config.module";

@Module({
  imports: [AwsConfigModule],
  providers: [UserRepository],
  controllers: [UsersController],
  exports: [UserRepository]
})
export class UsersModule {}