import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    constructor() {
        super();
    }

    async canActivate(context: ExecutionContext) {
        let result: any = false
        try {
            result = await super.canActivate(context);
            return result
        } catch (error) {
            throw new UnauthorizedException('TOKEN验证不通过', error);
        }
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException('验证不通过', info);
        }
        return user;
    }
}
