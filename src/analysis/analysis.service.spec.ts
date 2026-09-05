import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { Analysis } from './entities/analysis.entity';
import { Keeping } from 'src/entity/keeping.entity';
import { KeepingService } from 'src/keeping/keeping.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    existsBy: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const keepingRepository = {
    find: jest.fn(),
  };
  const keepingService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: getRepositoryToken(Analysis), useValue: repository },
        { provide: getRepositoryToken(Keeping), useValue: keepingRepository },
        { provide: KeepingService, useValue: keepingService },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('创建时只能关联自己的记账，并带上 createUserId', async () => {
    keepingService.findOne.mockResolvedValue({ id: 5, createUserId: 1 } as Keeping);
    repository.create.mockImplementation((data: Partial<Analysis>) => data as Analysis);
    repository.save.mockImplementation((entity: Analysis) => Promise.resolve(entity));

    const result = await service.create({ keepingId: 5, name: 'x', content: 'y' } as any, 1);

    // findOne 必须带 userId（防止为别人的记账挂分析）
    expect(keepingService.findOne).toHaveBeenCalledWith(5, 1);
    expect(result.createUserId).toBe(1);
  });

  it('关联的记账不属于自己时创建失败', async () => {
    keepingService.findOne.mockResolvedValue(null); // findOne 带属主过滤，别人的记录查不到
    await expect(service.create({ keepingId: 404, name: 'x', content: 'y' } as any, 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findAll 只返回本人的分析记录', async () => {
    repository.find.mockResolvedValue([]);
    await service.findAllForUser(42);
    expect(repository.find).toHaveBeenCalledWith({ where: { createUserId: 42 } });
  });

  it('更新/删除别人的分析记录被拒绝（越权防护）', async () => {
    repository.findOne.mockResolvedValue({ id: 3, createUserId: 999 } as Analysis);
    await expect(service.update(3, { name: 'x' } as any, 1)).rejects.toThrow(ForbiddenException);
    await expect(service.remove(3, 1)).rejects.toThrow(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('summary 按用户拉取记账并聚合', async () => {
    keepingRepository.find.mockResolvedValue([
      { id: 1, transactionType: 2, amount: 30, tags: 'food', position: '公司', createTime: new Date() },
      { id: 2, transactionType: 1, amount: 100, tags: '', position: '', createTime: new Date() },
    ] as Keeping[]);

    const result = await service.summary(42, 'month');

    // where 里必须带 createUserId（用户隔离）；用 toMatchObject 做部分匹配
    const [findArg] = keepingRepository.find.mock.calls[0] as [{ where: Record<string, unknown> }];
    expect(findArg.where).toMatchObject({ createUserId: 42 });
    expect(result.expense).toBe(30);
    expect(result.income).toBe(100);
    expect(result.byCategory[0]).toMatchObject({ tag: 'food', amount: 30, count: 1 });
  });
});
