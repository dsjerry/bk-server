import { Injectable } from '@nestjs/common';
import { JwtService as SJwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtService {
    private fileSignOptions: JwtSignOptions;
    private refreshSignOptions: JwtSignOptions;

    constructor(private readonly jwtService: SJwtService, private readonly configService: ConfigService) {
        this.fileSignOptions = {
            secret: this.configService.get<string>("FILE_SECRET"),
            expiresIn: this.configService.get<number>("FILE_TOKEN_EXPIRED"),
        }
        this.refreshSignOptions = {
            secret: this.configService.get<string>("REFRESH_SECRET"),
            expiresIn: this.configService.get<number>("REFRESH_TOKEN_EXPIRED"),
        }
    }

    async generateToken(user: { sub: number, username: string }) {
        console.log('[JWT] generateToken', user);
        const token = await this.jwtService.signAsync({
            sub: user.sub,
            username: user.username,
            type: "access"
        });
        const decoded = await this.jwtService.decode(token) as { exp: number };
        return {
            token,
            expiresIn: decoded.exp - Math.floor(Date.now() / 1000) // 剩余的秒数
        }
    }

    verifyToken(token: string) {
        console.log('[JWT] verifyToken', token);
        return this.jwtService.verifyAsync(token);
    }

    generateFileToken(info: BKS.DownloadFileTokenInfo) {
        console.log('[JWT] generateFileToken', info);
        return this.jwtService.signAsync({ ...info, type: "file" }, this.fileSignOptions);
    }

    verifyFile(token: string) {
        console.log('[JWT] verifyFile', token);
        return this.jwtService.verifyAsync<BKS.DownloadFileTokenInfo>(token, this.fileSignOptions);
    }

    generateRefreshToken(user: { sub: number, username: string }) {
        console.log('[JWT] generateRefreshToken', user);
        return this.jwtService.signAsync({
            sub: user.sub,
            username: user.username,
            type: "refresh"
        }, this.refreshSignOptions);
    }

    verifyRefreshToken(token: string) {
        console.log('[JWT] verifyRefreshToken', token);
        return this.jwtService.verifyAsync(token, this.refreshSignOptions);
    }
}
