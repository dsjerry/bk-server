import { Injectable } from '@nestjs/common';
import { JwtService as SJwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtService {
    private readonly fileJwtSignOptions: JwtSignOptions;
    constructor(private readonly jwtService: SJwtService, private readonly configService: ConfigService) {

        this.fileJwtSignOptions = {
            secret: this.configService.get<string>("FILE_SECRET"),
            expiresIn: this.configService.get<number>("FILE_TOKEN_EXPIRED"),
        };
    }

    generateToken(user: { sub: number, username: string }) {
        return this.jwtService.signAsync({
            sub: user.sub,
            username: user.username,
        });
    }

    verifyToken(token: string) {
        return this.jwtService.verifyAsync(token);
    }

    generateFileToken(info: BKS.DownloadFileTokenInfo) {
        return this.jwtService.signAsync(info, this.fileJwtSignOptions);
    }

    verifyFile(token: string) {
        return this.jwtService.verify<BKS.DownloadFileTokenInfo>(token, this.fileJwtSignOptions);
    }
}
