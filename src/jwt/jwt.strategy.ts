import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

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
  validate(payload: { sub: number; username: string; type?: string }) {
    // 只接受 access token。refresh/file token 用不同 secret 签名本就过不了验签，这里做纵深防御
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('token 类型不正确');
    }
    return { userId: payload.sub, username: payload.username };
  }
}
