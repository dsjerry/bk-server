import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      throw new UnauthorizedException('TOKEN验证不通过', error as Error);
    }
  }

  // 泛型签名对齐 passport 的 IAuthGuard，验证结果原样挂到 req.user 上
  handleRequest<TUser = BKS.ReqUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('验证不通过', info as Error);
    }
    return user;
  }
}
