import { Injectable, Logger } from '@nestjs/common';
import { JwtService as SJwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private fileSignOptions: JwtSignOptions;
  private refreshSignOptions: JwtSignOptions;

  constructor(
    private readonly jwtService: SJwtService,
    private readonly configService: ConfigService,
  ) {
    this.fileSignOptions = {
      secret: this.configService.get<string>('FILE_SECRET'),
      expiresIn: this.configService.get<number>('FILE_TOKEN_EXPIRED'),
    };
    this.refreshSignOptions = {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: this.configService.get<number>('REFRESH_TOKEN_EXPIRED'),
    };
  }

  async generateToken(user: { sub: number; username: string }) {
    // 日志只记录用户标识，token 本身和签名内容绝不能落日志（日志可能被收集/转发）
    this.logger.debug(`生成 access token: userId=${user.sub} username=${user.username}`);
    const token = await this.jwtService.signAsync({
      sub: user.sub,
      username: user.username,
      type: 'access',
    });
    // decode 是同步方法且带泛型，直接拿到过期时间
    const decoded = this.jwtService.decode<{ exp: number }>(token);
    return {
      token,
      expiresIn: decoded.exp - Math.floor(Date.now() / 1000), // 剩余的秒数
    };
  }

  verifyToken(token: string) {
    this.logger.debug('校验 access token');
    return this.jwtService.verifyAsync<{ sub: number; username: string; type: BKS.JWTType }>(token);
  }

  generateFileToken(info: BKS.DownloadFileTokenInfo) {
    this.logger.debug(`生成文件下载 token: userId=${info.userId} object=${info.objectName ?? info.filepath}`);
    return this.jwtService.signAsync({ ...info, type: 'file' }, this.fileSignOptions);
  }

  verifyFile(token: string) {
    this.logger.debug('校验文件下载 token');
    return this.jwtService.verifyAsync<BKS.DownloadFileTokenInfo>(token, this.fileSignOptions);
  }

  generateRefreshToken(user: { sub: number; username: string; tokenVersion: number }) {
    this.logger.debug(`生成 refresh token: userId=${user.sub} username=${user.username}`);
    return this.jwtService.signAsync(
      {
        sub: user.sub,
        username: user.username,
        type: 'refresh',
        // 记录签发时的令牌版本：登出/改密码时版本 +1，旧 refresh token 校验即失效
        tokenVersion: user.tokenVersion,
      },
      this.refreshSignOptions,
    );
  }

  verifyRefreshToken(token: string) {
    this.logger.debug('校验 refresh token');
    return this.jwtService.verifyAsync<{ sub: number; username: string; type: BKS.JWTType }>(
      token,
      this.refreshSignOptions,
    );
  }
}
