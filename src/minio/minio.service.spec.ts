import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

describe('MinioService', () => {
  let service: MinioService;

  const minioClient = {
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    putObject: jest.fn(),
    getObject: jest.fn(),
  };
  const configService = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        { provide: 'MINIO_CLIENT', useValue: minioClient },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('桶不存在时自动创建', async () => {
    minioClient.bucketExists.mockResolvedValue(false);
    await service.ensureBucket('bookkeeping');
    expect(minioClient.makeBucket).toHaveBeenCalledWith('bookkeeping');
  });

  it('桶已存在时不重复创建', async () => {
    minioClient.bucketExists.mockResolvedValue(true);
    await service.ensureBucket('bookkeeping');
    expect(minioClient.makeBucket).not.toHaveBeenCalled();
  });

  it('初始化失败只降级记录，不抛错阻断业务（多数接口不依赖 MinIO）', async () => {
    minioClient.bucketExists.mockRejectedValue(new Error('connection refused'));
    await expect(service.ensureBucket('bookkeeping')).resolves.not.toThrow();
  });
});
