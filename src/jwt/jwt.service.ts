import { Injectable } from '@nestjs/common';
import { JwtService as SJwtService } from '@nestjs/jwt';

@Injectable()
export class JwtService {
    constructor(private readonly jwtService: SJwtService) { }

    generateToken(user: { sub: number, username: string }) {
        return this.jwtService.signAsync({
            sub: user.sub,
            username: user.username,
        });
    }

    verifyToken(token: string) {
        return this.jwtService.verifyAsync(token);
    }
}
