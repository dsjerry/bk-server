import { Controller, Body, Post, UnauthorizedException, Header, BadRequestException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SigninDto, SignupDto } from 'src/dto/auth.dto';
import { UserService } from 'src/user/user.service';
import { ReqUser } from 'src/decorator';
import { JwtGuard } from 'src/guard/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  // 登录/注册比全局默认（100 次/分钟）收紧到 5 次/分钟，防止账号爆破。
  // 超限返回 429，分钟窗口过后自动恢复
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @Header('Content-Type', 'application/json')
  async login(@Body() signInDto: SigninDto) {
    const user = await this.authService.validateUser(signInDto.username, signInDto.password);
    if (!user) throw new UnauthorizedException('校验失败');
    return this.authService.login(user);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signup')
  @Header('Content-Type', 'application/json')
  async signup(@Body() signupDto: SignupDto) {
    const isUserExist = await this.userService.findOne(signupDto.username);
    if (isUserExist) {
      throw new BadRequestException({
        id: isUserExist.id,
        message: '用户已存在',
      });
    }
    const userCreated = await this.userService.createUser({
      username: signupDto.username,
      password: signupDto.password,
      age: 0,
    });
    return this.authService.login(userCreated);
  }

  @Post('refresh')
  @Header('Content-Type', 'application/json')
  async refresh(@Body('refreshToken') refreshToken: string, @ReqUser() _user: BKS.ReqUser) {
    const result = await this.authService.refresh(refreshToken);
    if (!result) throw new UnauthorizedException('校验失败');
    return result;
  }

  /** 登出：令牌版本 +1，该用户所有已签发的 refresh token 立即失效 */
  @UseGuards(JwtGuard)
  @Post('logout')
  @ApiOperation({ summary: '登出（吊销该用户全部 refresh token）' })
  async logout(@ReqUser() user: BKS.ReqUser) {
    await this.userService.bumpTokenVersion(user.userId);
    return '登出成功';
  }
}
