import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from 'src/jwt/jwt.service';
import { UserService } from 'src/user/user.service';
import { User } from 'src/entity/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  /** 校验通过返回除密码外的用户信息，失败返回 null */
  async validateUser(username: string, pass: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.userService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // _password 只为从结果里剔除密码哈希
      const { password: _password, ...result } = user;
      return result;
    }
    return null;
  }
  async login(user: Pick<User, 'id' | 'username' | 'tokenVersion'>) {
    const payload = { username: user.username, sub: user.id };
    const token = await this.jwtService.generateToken(payload);
    return {
      access_token: token.token,
      expires_in: token.expiresIn,
      refresh_token: await this.jwtService.generateRefreshToken({
        ...payload,
        tokenVersion: user.tokenVersion,
      }),
      // 客户端启用同步时依赖 user 字段拿到服务端用户 id / 用户名（此前缺失，前端拿不到）
      user: { id: user.id, username: user.username },
    };
  }

  /**
   * 刷新令牌：校验签名后还要比对 tokenVersion ——
   * 登出/改密码会让版本 +1，旧 refresh token 即使在有效期内也会被拒绝
   */
  async refresh(token: string) {
    const payload = await this.jwtService.verifyRefreshToken(token);
    const user = await this.userService.findOneById(payload.sub);
    if (!user || user.tokenVersion !== (payload as { tokenVersion?: number }).tokenVersion) {
      return null;
    }
    // JWT payload 里用户 id 字段名是 sub（见 jwt.service 的签名逻辑），映射回 login 需要的形状
    return this.login({ id: user.id, username: user.username, tokenVersion: user.tokenVersion });
  }
}
