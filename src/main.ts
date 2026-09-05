import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptor/response.interceptor';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // URI 版本控制：所有路由挂到 /v1/ 下（如 /v1/keeping）。
  // 将来做不兼容的接口变更时新增 v2 并存即可，老客户端不受影响。
  // 注意：这是破坏性变更 —— 存量客户端的 BASE_URL 需要同步加 /v1 前缀
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle('BKServer API')
    .setDescription('BKServer API')
    .setVersion('0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 全局入参校验：DTO 上的 class-validator 装饰器由此生效。
  // whitelist 剔除 DTO 未声明的字段（防多余字段写入数据库），transform 把
  // 路径/查询参数的字符串转换成 DTO 声明的类型（如 number）
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.use('/static', express.static(join(__dirname, '..', 'uploads')));

  // 容器里监听 0.0.0.0，否则端口映射后宿主机访问不到容器内的服务
  await app.listen(process.env.PORT ?? 3031, '0.0.0.0');

  new Logger('Bootstrap').log(`服务已启动: http://localhost:${process.env.PORT ?? 3031}/v1，文档: /api-docs`);
}

// void 显式声明不等待启动 promise（启动失败由进程退出码体现）
void bootstrap();
