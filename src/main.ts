import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('BKServer API')
    .setDescription('BKServer API')
    .setVersion('0.1')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document)

  app.useGlobalFilters(new HttpExceptionFilter())

  app.use('/static', express.static(join(__dirname, '..', 'uploads')))

  await app.listen(process.env.PORT ?? 3031);
}

bootstrap();
