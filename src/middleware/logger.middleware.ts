import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/** 全局日志必须脱敏的字段：中间件对所有路由生效后，登录/注册的密码不能明文落日志 */
const SENSITIVE_FIELDS = ['password', 'oldPassword', 'newPassword', 'refreshToken', 'token'];

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  // 浅拷贝后替换敏感字段，不改写原始请求体
  const cloned = { ...(body as Record<string, unknown>) };
  for (const field of SENSITIVE_FIELDS) {
    if (field in cloned) cloned[field] = '***';
  }
  return cloned;
}

@Injectable()
export class LoggerMiddleWare implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startAt = process.hrtime.bigint();

    // 在 finish 事件（响应已写回客户端）时才打日志，才能拿到真实状态码和耗时
    res.on('finish', () => {
      const costMs = Number(process.hrtime.bigint() - startAt) / 1e6;
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${costMs.toFixed(1)}ms body: ${JSON.stringify(sanitizeBody(req.body))}`,
      );
    });

    next();
  }
}
