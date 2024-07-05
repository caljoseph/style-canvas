import {forwardRef, Module} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserRepository } from "./user.repository";
import {AwsConfigModule} from "../config/aws-config.module";
import {TokensModule} from "../tokens/tokens.module";

@Module({
  imports: [forwardRef(() => TokensModule), AwsConfigModule],
  providers: [UserRepository],
  controllers: [UsersController],
  exports: [UserRepository]
})
export class UsersModule {}