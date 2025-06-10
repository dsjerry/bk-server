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
        return {
            access_token: await this.jwtService.generateToken(payload)
        }
    }
    async signup(user: any) {
        const payload = { username: user.username, sub: user.id }
        const isUserExist = await this.userService.findOne(user.username)
        if (isUserExist) {
            throw new Error('用户已存在');
        }
        const userCreated = await this.userService.createUser(user)
        return {
            access_token: await this.jwtService.generateToken(payload)
        }
    }
}
