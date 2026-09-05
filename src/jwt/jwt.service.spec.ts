import { Test, TestingModule } from '@nestjs/testing';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;

  const nestJwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };
  const configService = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        { provide: NestJwtService, useValue: nestJwt },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generateToken 返回 token 和剩余有效秒数', async () => {
    nestJwt.signAsync.mockResolvedValue('fake-token');
    // decode 是同步方法，解码出的过期时间 = 当前时间 + 1 小时
    nestJwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

    const result = await service.generateToken({ sub: 1, username: '小明' });

    expect(result.token).toBe('fake-token');
    // 允许执行耗时带来的 ±5 秒误差
    expect(result.expiresIn).toBeGreaterThan(3595);
    expect(result.expiresIn).toBeLessThanOrEqual(3600);
  });

  it('verifyToken 透传给底层 JwtService 校验', async () => {
    nestJwt.verifyAsync.mockResolvedValue({ sub: 1, username: '小明' });
    await expect(service.verifyToken('fake-token')).resolves.toMatchObject({ sub: 1 });
    expect(nestJwt.verifyAsync).toHaveBeenCalledWith('fake-token');
  });
});
