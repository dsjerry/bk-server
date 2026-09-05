import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from 'src/jwt/jwt.service';
import { UserService } from 'src/user/user.service';
import { User } from 'src/entity/user.entity';
import { CreateUserDto } from 'src/dto/user.dto';

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
  async login(user: Pick<User, 'id' | 'username'>) {
    const payload = { username: user.username, sub: user.id };
    const token = await this.jwtService.generateToken(payload);
    return {
      access_token: token.token,
      expires_in: token.expiresIn,
      refresh_token: await this.jwtService.generateRefreshToken(payload),
      // 客户端启用同步时依赖 user 字段拿到服务端用户 id / 用户名（此前缺失，前端拿不到）
      user: { id: user.id, username: user.username },
    };
  }
  async signup(user: CreateUserDto & Pick<User, 'id'>) {
    const payload = { username: user.username, sub: user.id };
    const isUserExist = await this.userService.findOne(user.username);
    if (isUserExist) {
      throw new Error('用户已存在');
    }
    const userCreated = await this.userService.createUser(user);
    const token = await this.jwtService.generateToken(payload);
    return {
      access_token: token.token,
      expires_in: token.expiresIn,
      refresh_token: await this.jwtService.generateRefreshToken(payload),
      user: userCreated,
    };
  }

  async refresh(token: string) {
    const userInfo = await this.jwtService.verifyRefreshToken(token);
    // JWT payload 里用户 id 字段名是 sub（见 jwt.service 的签名逻辑），映射回 login 需要的形状
    return this.login({ id: userInfo.sub, username: userInfo.username });
  }
}
