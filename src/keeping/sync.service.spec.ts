import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { KeepingService } from './keeping.service';
import { Keeping } from 'src/entity/keeping.entity';
import { ConflictType, KeepingCreateDto, KeepingUpdateDto } from 'src/dto/keeping.dto';

/** 构造一条 Keeping 实体测试数据 */
function keepingOf(id: number, overrides: Partial<Keeping> = {}): Keeping {
  return {
    id,
    localId: `local-${id}`,
    createUserId: 1,
    name: `记录${id}`,
    transactionType: 1,
    category: null,
    amount: 10,
    position: null,
    image: null,
    remark: null,
    createTime: new Date('2026-01-01T00:00:00Z'),
    updateTime: new Date('2026-06-01T00:00:00Z'),
    deleteAt: null,
    analysis: [],
    ...overrides,
  } as Keeping;
}

describe('SyncService', () => {
  let service: SyncService;

  const keepingRepository = {
    find: jest.fn(), // getChangesSince + getCurrentState 共用，按调用次序区分
    findOne: jest.fn(), // idMappings 反查
  };
  const keepingService = {
    batchOperation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: getRepositoryToken(Keeping), useValue: keepingRepository },
        { provide: KeepingService, useValue: keepingService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('无冲突时：落库批量变更，返回全量快照和 localId 映射', async () => {
    const created = keepingOf(99);
    keepingRepository.find
      .mockResolvedValueOnce([]) // getChangesSince：服务端无变更
      .mockResolvedValueOnce([created]); // getCurrentState：全量快照
    keepingRepository.findOne.mockResolvedValue(created); // idMappings 反查
    keepingService.batchOperation.mockResolvedValue({ createdCount: 1, updatedCount: 0, deletedCount: 0 });

    const result = await service.handleSync(
      {
        lastSyncAt: '2026-05-01T00:00:00Z',
        changes: {
          creates: [{ name: '打车', transactionType: 1, amount: 30, localId: 'local-99' } as KeepingCreateDto],
        },
      },
      1,
    );

    expect(keepingService.batchOperation).toHaveBeenCalled();
    expect(result.conflicts).toHaveLength(0);
    expect(result.serverChanges.creates).toHaveLength(1);
    expect(result.idMappings).toEqual([{ localId: 'local-99', serverId: 99 }]);
  });

  it('服务端有更新且客户端未提供解决方案：只返回冲突，不落库', async () => {
    const serverRow = keepingOf(7, { updateTime: new Date('2026-06-02T00:00:00Z') }); // 服务端改得更新
    keepingRepository.find.mockResolvedValueOnce([serverRow]);

    const result = await service.handleSync(
      {
        lastSyncAt: '2026-05-01T00:00:00Z',
        changes: { updates: [{ id: 7, updateTime: new Date('2026-05-15T00:00:00Z'), name: '旧版本' }] },
      },
      1,
    );

    expect(keepingService.batchOperation).not.toHaveBeenCalled();
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].type).toBe(ConflictType.UPDATE);
  });

  it('冲突按 server 策略解决：丢弃客户端更新后再落库', async () => {
    const serverRow = keepingOf(7, { updateTime: new Date('2026-06-02T00:00:00Z') });
    keepingRepository.find
      .mockResolvedValueOnce([serverRow]) // getChangesSince
      .mockResolvedValueOnce([]); // getCurrentState
    keepingService.batchOperation.mockResolvedValue({ createdCount: 0, updatedCount: 0, deletedCount: 0 });

    await service.handleSync(
      {
        lastSyncAt: '2026-05-01T00:00:00Z',
        changes: { updates: [{ id: 7, updateTime: new Date('2026-05-15T00:00:00Z'), name: '旧版本' }] },
        resolutions: [{ type: ConflictType.UPDATE, strategy: 'server', resolvedData: { id: 7 } as KeepingUpdateDto }],
      },
      1,
    );

    // server 策略 = 以服务端为准，客户端这条更新被过滤掉
    expect(keepingService.batchOperation).toHaveBeenCalledWith(expect.objectContaining({ updates: [] }), 1);
  });

  it('软删除的行进入 serverChanges.deletes 下发（删除传播）', async () => {
    const deletedRow = keepingOf(8, { deleteAt: new Date('2026-06-03T00:00:00Z') });
    keepingRepository.find
      .mockResolvedValueOnce([deletedRow]) // getChangesSince（withDeleted 才能查到）
      .mockResolvedValueOnce([]); // getCurrentState

    const result = await service.handleSync(
      { lastSyncAt: '2026-05-01T00:00:00Z', changes: { creates: [], updates: [], deletes: [] } },
      1,
    );

    expect(result.serverChanges.deletes).toContain(8);
    // 已删除的行不参与冲突检测
    expect(result.conflicts).toHaveLength(0);
  });
});
