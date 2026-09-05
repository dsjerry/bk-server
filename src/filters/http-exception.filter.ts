import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  // 全局兜底过滤器：非预期异常（未 throw HttpException 的错误）在这里才有机会留下堆栈
  private readonly logger = new Logger(HttpExceptionFilter.name);

  // catch-all 过滤器拿到的是 unknown：先收敛成 Error/HttpException 再取字段，避免 any 透传
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpError = exception instanceof HttpException;
    const status = isHttpError ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (status >= 500) {
      // 5xx 属于服务端问题，带堆栈记成 error，方便排查
      this.logger.error(message, stack, `${request.method} ${request.url}`);
    } else {
      // 4xx 是客户端问题（校验失败/未授权等），warn 级别即可
      this.logger.warn(`${request.method} ${request.url} ${status} ${message}`);
    }

    let data: unknown = null;
    if (exception instanceof BadRequestException) {
      data = exception.getResponse();
    }

    response.status(status).json({
      code: status,
      data,
      message,
      success: false,
      timestamp: new Date().toISOString(),
    });
  }
}
