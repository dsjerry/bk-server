import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UserService } from '../user/user.service';

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
            access_token: this.jwtService.sign(payload)
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
            access_token: this.jwtService.sign(payload)
        }
    }
}
