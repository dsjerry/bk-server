import { Test, TestingModule } from '@nestjs/testing';
import { KeepingController } from './keeping.controller';
import { KeepingService } from './keeping.service';
import { SyncService } from './sync.service';

describe('KeepingController', () => {
  let controller: KeepingController;

  const keepingService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    batchOperation: jest.fn(),
  };
  const syncService = {
    handleSync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeepingController],
      providers: [
        { provide: KeepingService, useValue: keepingService },
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    controller = module.get<KeepingController>(KeepingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sync 路由委托给 SyncService（拆分后各司其职）', async () => {
    syncService.handleSync.mockResolvedValue({ serverTime: 'now', conflicts: [], serverChanges: {} });

    const user = { userId: 1, username: '小明' };
    await controller.handleSync({ lastSyncAt: '2026-05-01' } as any, user as any);

    expect(syncService.handleSync).toHaveBeenCalledWith({ lastSyncAt: '2026-05-01' }, 1);
  });
});
