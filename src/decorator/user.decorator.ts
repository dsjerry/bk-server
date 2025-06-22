import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * 获取请求用户信息
 */
export const ReqUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<BKS.ReqUser>();
    return request.user;
});