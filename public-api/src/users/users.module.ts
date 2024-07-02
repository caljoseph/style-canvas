import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserRepository } from "./user.repository";
import {AwsConfigModule} from "../config/aws-config.module";

@Module({
  imports: [AwsConfigModule],
  providers: [UsersService, UserRepository],
  controllers: [UsersController],
  exports: [UsersService, UserRepository]
})
export class UsersModule {}