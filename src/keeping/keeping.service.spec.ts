import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { KeepingService } from './keeping.service';
import { Keeping } from 'src/entity/keeping.entity';
import { KeepingCreateDto } from 'src/dto/keeping.dto';

/** 模拟事务中的 EntityManager；单条操作走 dataSource.manager（同一个 mock） */
type ManagerMock = { save: jest.Mock; update: jest.Mock; findOne: jest.Mock; softDelete: jest.Mock };

describe('KeepingService', () => {
  let service: KeepingService;

  /** findAll 走 QueryBuilder，这里给一个链式 mock */
  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };
  const repository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };

  let manager: ManagerMock;

  /** 模拟 DataSource.transaction：直接用 mock manager 执行回调（真实场景里由 mysql 驱动负责提交/回滚） */
  let transaction: jest.Mock;

  beforeEach(async () => {
    manager = {
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    transaction = jest.fn((cb: (m: ManagerMock) => Promise<unknown>) => cb(manager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeepingService,
        { provide: getRepositoryToken(Keeping), useValue: repository },
        {
          provide: DataSource,
          useValue: { manager, transaction },
        },
      ],
    }).compile();

    service = module.get<KeepingService>(KeepingService);
    jest.clearAllMocks();
    // clearAllMocks 会清掉实现，重新挂上链式与事务行为
    qb.where.mockImplementation(() => qb as never);
    qb.andWhere.mockImplementation(() => qb as never);
    qb.orderBy.mockImplementation(() => qb as never);
    qb.skip.mockImplementation(() => qb as never);
    qb.take.mockImplementation(() => qb as never);
    transaction.mockImplementation((cb: (m: ManagerMock) => Promise<unknown>) => cb(manager));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll（用户隔离 + 过滤）', () => {
    it('只查当前用户的数据', async () => {
      qb.getMany.mockResolvedValue([]);
      await service.findAll({}, 42);
      expect(qb.where).toHaveBeenCalledWith('keeping.createUserId = :userId', { userId: 42 });
    });

    it('有关键字时追加 LIKE 过滤（名称/备注/地点）', async () => {
      qb.getMany.mockResolvedValue([]);
      await service.findAll({ keyword: '午饭' }, 1);
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('带分页时走 skip/take + getManyAndCount', async () => {
      qb.getManyAndCount.mockResolvedValue([[{ id: 1 } as Keeping], 11]);
      const result = await service.findAll({ page: 2, limit: 10 }, 1);
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.meta).toMatchObject({ total: 11, page: 2, limit: 10, lastPage: 2 });
    });
  });

  describe('batchOperation（事务）', () => {
    const existingKeeping = { id: 7, createUserId: 1, name: '午饭', amount: 20 } as Keeping;

    it('所有操作在同一个事务里执行，且计数正确', async () => {
      // repository.create 只是实体构造器，原样返回入参即可
      repository.create.mockImplementation((data: Partial<Keeping>) => data as Keeping);
      manager.findOne.mockResolvedValue(existingKeeping);
      manager.save.mockImplementation((entity: Keeping) => Promise.resolve(entity));
      manager.softDelete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.batchOperation(
        {
          deletes: [7],
          updates: [{ id: 7, updateTime: new Date(), name: '午饭+饮料' }],
          creates: [{ name: '打车', transactionType: 1, amount: 30 } as KeepingCreateDto],
        },
        1,
      );

      // 整批只有一个事务，删除/更新/创建都发生在事务 manager 上
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(manager.softDelete).toHaveBeenCalledWith(Keeping, 7);
      // 更新不能覆写属主字段 createUserId（劫持防护）：字段里不应出现调用者的 id
      expect(manager.update).toHaveBeenCalledWith(Keeping, 7, expect.not.objectContaining({ createUserId: 1 }));
      expect(manager.save).toHaveBeenCalled();
      expect(result).toEqual({ createdCount: 1, updatedCount: 1, deletedCount: 1 });
    });

    it('任何一步抛错则整个批次失败（异常向上抛出，由 DataSource 负责回滚）', async () => {
      repository.create.mockImplementation((data: Partial<Keeping>) => data as Keeping);
      manager.findOne.mockResolvedValue(existingKeeping);
      manager.save.mockRejectedValue(new Error('insert failed'));

      await expect(
        service.batchOperation({ creates: [{ name: '打车', transactionType: 1, amount: 30 } as KeepingCreateDto] }, 1),
      ).rejects.toThrow('insert failed');

      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('删除不存在的 id 幂等跳过（客户端过期数据不能卡死同步）', async () => {
      manager.findOne.mockResolvedValue(null); // 记录不存在（可能已被其他设备软删除）

      const result = await service.batchOperation({ deletes: [404] }, 1);

      expect(manager.softDelete).not.toHaveBeenCalled();
      expect(result.deletedCount).toBe(0);
    });

    it('更新/删除别人的记录被拒绝（越权防护）', async () => {
      manager.findOne.mockResolvedValue({ ...existingKeeping, createUserId: 999 }); // 属于别人

      const result = await service.batchOperation(
        { deletes: [7], updates: [{ id: 7, updateTime: new Date(), name: '劫持' }] },
        1,
      );

      expect(manager.softDelete).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
      expect(result).toEqual({ createdCount: 0, updatedCount: 0, deletedCount: 0 });
    });

    it('更新不存在的 id 跳过且不影响同批其他操作', async () => {
      manager.findOne.mockResolvedValue(null); // update 目标不存在
      repository.create.mockImplementation((data: Partial<Keeping>) => data as Keeping);
      manager.save.mockImplementation((entity: Keeping) => Promise.resolve(entity));

      const result = await service.batchOperation(
        {
          updates: [{ id: 404, updateTime: new Date(), name: 'x' }],
          creates: [{ name: '打车', transactionType: 1, amount: 30 } as KeepingCreateDto],
        },
        1,
      );

      expect(result).toEqual({ createdCount: 1, updatedCount: 0, deletedCount: 0 });
    });
  });

  describe('单条操作', () => {
    it('delete 不存在时抛 404', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(service.delete(404, 1)).rejects.toThrow('记录不存在');
    });

    it('delete 走软删除（softDelete 而非物理 delete）', async () => {
      manager.findOne.mockResolvedValue({ id: 7, createUserId: 1 } as Keeping);
      manager.softDelete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.delete(7, 1)).resolves.toBe('删除成功');
      expect(manager.softDelete).toHaveBeenCalledWith(Keeping, 7);
    });

    it('findOne 传入 userId 时只查本人的记录', async () => {
      repository.findOne.mockResolvedValue(null);
      await service.findOne(7, 42);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 7, createUserId: 42 } });
    });
  });
});
