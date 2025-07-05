import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt'
import { JwtService } from 'src/jwt/jwt.service'
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
    constructor(private userService: UserService,
        private jwtService: JwtService
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.userService.findOne(username)
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user
            return result
        }
        return null
    }
    async login(user: any) {
        const payload = { username: user.username, sub: user.id }
        const token = await this.jwtService.generateToken(payload)
        return {
            access_token: token.token,
            expires_in: token.expiresIn,
            refresh_token: await this.jwtService.generateRefreshToken(payload)
        }
    }
    async signup(user: any) {
        const payload = { username: user.username, sub: user.id }
        const isUserExist = await this.userService.findOne(user.username)
        if (isUserExist) {
            throw new Error('用户已存在');
        }
        const userCreated = await this.userService.createUser(user)
        const token = await this.jwtService.generateToken(payload)
        return {
            access_token: token.token,
            expires_in: token.expiresIn,
            refresh_token: await this.jwtService.generateRefreshToken(payload)
        }
    }

    async refresh(token: string) {
        const userInfo = await this.jwtService.verifyRefreshToken(token)
        return this.login(userInfo)
    }
}
