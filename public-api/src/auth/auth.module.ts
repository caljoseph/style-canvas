import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {AwsCognitoService} from "./aws-cognito.service";
import {PassportModule} from "@nestjs/passport";
import {JwtStrategy} from "./jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [AuthService, AwsCognitoService, JwtStrategy],
  controllers: [AuthController],
  exports: [PassportModule]
})
export class AuthModule {}
