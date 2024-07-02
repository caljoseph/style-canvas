import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config";
import {config} from "rxjs";
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TokensService } from './tokens/tokens.service';
import { TokensModule } from './tokens/tokens.module';
import { ImageController } from './image/image.controller';
import { ImageModule } from './image/image.module';
import {AwsCognitoService} from "./auth/aws-cognito.service";
import {UserRepository} from "./users/user.repository";
import {AwsConfigModule} from "./config/aws-config.module";

@Module({
  imports: [
      ConfigModule.forRoot({
        envFilePath: '.env',
        isGlobal: true,
      }),
      AuthModule,
      UsersModule,
      TokensModule,
      ImageModule,
      AwsConfigModule
  ],
  controllers: [AppController, ImageController],
  providers: [AppService, TokensService, AwsCognitoService, UserRepository],
})
export class AppModule {}
