import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import epxress from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggerMiddleWare } from './middleware/logger.middleware';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('Manage user API')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  app.useGlobalFilters(new HttpExceptionFilter())

  app.use(LoggerMiddleWare)

  app.use('/static', epxress.static(join(__dirname, '..', 'uploads')))

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
