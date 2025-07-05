import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'

/**
 * 配置jwt策略
 * 
 * - 策略作为统一验证入口（专注验证）
 * - 模块中注册主要用来配置（提供签名能力）
 */

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
        });
    }
    // jwt 验证成功后，这里返回的对象会被附加到请求的对象中，可以通过装饰器@Req()获取
    async validate(payload: any) {
        return { userId: payload.sub, username: payload.username };
    }
}