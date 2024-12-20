import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import * as cors from 'cors'; // Import CORS if using advanced options
import * as express from 'express';  // Add this import

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:63343'],  // Allow requests from frontend in dev mode
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,  // Allows cookies to be sent with requests
    allowedHeaders: 'Content-Type, Authorization',  // Specify allowed headers
  });


// Raw body parser for Stripe webhooks
  app.use('/payments/webhook', express.raw({ type: 'application/json' }));

// Regular JSON parser for all other routes
  app.use((req, res, next) => {
    if (req.originalUrl === '/payments/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  await app.listen(3000);
}

bootstrap();
