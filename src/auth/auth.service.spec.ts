import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from 'src/jwt/jwt.service';

describe('AuthService', () => {
  let service: AuthService;

  const userService = {
    findOne: jest.fn(),
    createUser: jest.fn(),
  };
  const jwtService = {
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('用户名密码正确时返回脱敏的用户信息', async () => {
    userService.findOne.mockResolvedValue({
      id: 1,
      username: '小明',
      password: bcrypt.hashSync('123456', 4),
    });

    const result = await service.validateUser('小明', '123456');

    expect(result).toMatchObject({ id: 1, username: '小明' });
    // 密码哈希绝不能随验证结果外泄
    expect(result).not.toHaveProperty('password');
  });

  it('密码错误时返回 null', async () => {
    userService.findOne.mockResolvedValue({
      id: 1,
      username: '小明',
      password: bcrypt.hashSync('123456', 4),
    });

    await expect(service.validateUser('小明', 'wrong')).resolves.toBeNull();
  });

  it('用户不存在时返回 null', async () => {
    userService.findOne.mockResolvedValue(null);
    await expect(service.validateUser('nobody', '123456')).resolves.toBeNull();
  });
});
