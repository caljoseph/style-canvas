import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config";
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TokensService } from './tokens/tokens.service';
import { TokensModule } from './tokens/tokens.module';
import { ImageModule } from './image/image.module';
import {AwsCognitoService} from "./auth/aws-cognito.service";
import {UserRepository} from "./users/user.repository";
import {AwsConfigModule} from "./config/aws-config.module";
import { PaymentsModule } from './payments/payments.module';

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
      AwsConfigModule,
      PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, TokensService, AwsCognitoService, UserRepository],
})
export class AppModule {}
