import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from 'src/entity/user.entity';

describe('UserService', () => {
  let service: UserService;

  /** 模拟 UserRepository：find/findOne/findOneBy/create/save/update 都是 jest mock */
  const repository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: getRepositoryToken(User), useValue: repository }],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getUsers 不带分页参数时返回全量列表', async () => {
    const users: Partial<User>[] = [
      { id: 1, username: '小明', age: 18, password: 'hash', isActive: true, createTime: new Date() },
      { id: 2, username: '小白', age: 19, password: 'hash', isActive: true, createTime: new Date() },
    ];
    repository.find.mockResolvedValue(users);

    const result = await service.getUsers({} as any);

    expect(repository.find).toHaveBeenCalled();
    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it('getUsers 带分页参数时走 findAndCount 并计算页数', async () => {
    repository.findAndCount.mockResolvedValue([[{ id: 1 }], 21]);

    const result = await service.getUsers({ page: 1, limit: 20 } as any);

    expect(repository.findAndCount).toHaveBeenCalledWith({ skip: 0, take: 20 });
    expect(result.meta).toMatchObject({ total: 21, page: 1, limit: 20, lastPage: 2 });
  });
});
