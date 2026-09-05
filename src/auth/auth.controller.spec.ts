import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
  };
  const userService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('登录成功返回 token', async () => {
    const user = { id: 1, username: '小明' };
    authService.validateUser.mockResolvedValue(user);
    authService.login.mockResolvedValue({ access_token: 't', refresh_token: 'r' });

    const result = await controller.login({ username: '小明', password: '123456' });
    expect(result).toMatchObject({ access_token: 't' });
  });

  it('校验失败抛 401', async () => {
    authService.validateUser.mockResolvedValue(null);
    await expect(controller.login({ username: '小明', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });
});
