import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with dynamic origin handling
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3001',
        'http://localhost:63343',
        'https://stylecanvasai.com',
        'https://www.stylecanvasai.com'
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);  // Allow the origin if it's in the list or no origin (e.g., server-side requests)
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,  // Allows cookies with requests
    allowedHeaders: 'Content-Type, Authorization',
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
