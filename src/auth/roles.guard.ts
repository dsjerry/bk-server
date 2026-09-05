import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取接口所需的角色
    const requireRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requireRoles) return true;

    // 从请求中获取用户角色（JWT 策略校验通过后挂到 req.user 上）
    const request = context.switchToHttp().getRequest<{ user?: { roles?: string[] } }>();
    return requireRoles.some((role) => request.user?.roles?.includes(role) ?? false);
  }
}
