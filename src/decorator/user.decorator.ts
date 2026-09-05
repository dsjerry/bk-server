import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 获取请求用户信息
 */
export const ReqUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
  // JwtStrategy.validate 的返回值会被 Passport 挂到 req.user 上
  const request = ctx.switchToHttp().getRequest<{ user: BKS.ReqUser }>();
  return request.user;
});
