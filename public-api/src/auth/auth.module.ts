import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AwsCognitoService } from "./aws-cognito.service";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";
import {AwsConfigModule} from "../config/aws-config.module";

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        UsersModule,
        AwsConfigModule,
    ],
    providers: [AuthService, AwsCognitoService, JwtStrategy],
    controllers: [AuthController],
    exports: [AuthService, PassportModule]
})
export class AuthModule {}