import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import * as cors from 'cors'; // Import CORS if using advanced options

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:63343'],  // Allow requests from frontend in dev mode
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,  // Allows cookies to be sent with requests
    allowedHeaders: 'Content-Type, Authorization',  // Specify allowed headers
  });


  // Middleware for stripe webhooks
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
