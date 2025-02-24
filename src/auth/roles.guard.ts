import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // 获取接口所需的角色
        const requireRoles = this.reflector.get<string[]>(
            'roles',
            context.getHandler()
        )
        if (!requireRoles) return true

        // 模拟从请求中获取用户角色（实际应从 JWT 解析）
        const request = context.switchToHttp().getRequest()
        const user = request.user // 假设用户已经通过 JWT 中间件注入
        return requireRoles.some((role) => user.roles?.includes(role))
    }
    
}