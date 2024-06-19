import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {AwsCognitoService} from "./aws-cognito.service";

@Module({
  providers: [AuthService, AwsCognitoService],
  controllers: [AuthController]
})
export class AuthModule {}
