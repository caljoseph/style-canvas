import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable parsing of JSON payloads
  app.useBodyParser('json');

  // Enable parsing of URL-encoded bodies
  app.useBodyParser('urlencoded', { extended: true });

  await app.listen(3000);
}
bootstrap();