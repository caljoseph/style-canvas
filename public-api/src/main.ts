import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {json} from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/payments/webhook', (req, res, next) => {
    json({
      verify: (req: any, _res, buffer) => {
        req.rawBody = buffer;
      }
    })(req, res, next);
  });
  await app.listen(3000);
}
bootstrap();
