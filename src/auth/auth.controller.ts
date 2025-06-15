import { Controller, Body, Post, UnauthorizedException, Header } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SigninDto, SignupDto } from 'src/dto/auth.dto';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly userService: UserService) { }

  @Post('login')
  @Header('Content-Type', 'application/json')
  async login(@Body() signInDto: SigninDto) {
    const user = await this.authService.validateUser(signInDto.username, signInDto.password)
    if (!user) throw new UnauthorizedException('校验失败');
    return this.authService.login(user)
  }

  @Post('signup')
  @Header('Content-Type', 'application/json')
  async signup(@Body() signupDto: SignupDto) {
    const isUserExist = await this.userService.findOne(signupDto.username);
    if (isUserExist) {
      throw new Error('用户已存在');
    }
    const userCreated = await this.userService.createUser({
      username: signupDto.username,
      password: signupDto.password,
      age: 0,
    });
    return this.authService.login(userCreated);
  }
}
