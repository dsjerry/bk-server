import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { User } from 'src/entity/user.entity';

describe('UserService', () => {
  let service: UserService;

  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
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

  it('createUser 对密码做 bcrypt 哈希（绝不明文入库）', async () => {
    repository.create.mockImplementation((data: Partial<User>) => data as User);
    repository.save.mockImplementation((entity: User) => Promise.resolve(entity));

    const result = await service.createUser({ username: '小明', age: 18, password: '123456' });

    // 哈希值与明文不同且可验证
    expect(result.password).not.toBe('123456');
    expect(bcrypt.compareSync('123456', result.password)).toBe(true);
  });

  it('updateUser 传入新密码时重新哈希', async () => {
    repository.findOneBy.mockResolvedValue({ id: 1, username: '小明', password: 'old-hash' } as User);
    repository.update.mockResolvedValue({ affected: 1, raw: [] });
    repository.findOneBy.mockResolvedValueOnce({ id: 1, username: '小明', password: 'old-hash' } as User);

    await service.updateUser(1, { password: 'new-password' });

    const [updateArg] = repository.update.mock.calls[0] as [{ password?: string }];
    expect(updateArg.password).not.toBe('new-password');
  });

  it('bumpTokenVersion 通过 increment 递增令牌版本（登出吊销）', async () => {
    repository.increment.mockResolvedValue({ affected: 1 });
    await service.bumpTokenVersion(42);
    expect(repository.increment).toHaveBeenCalledWith({ id: 42 }, 'tokenVersion', 1);
  });
});
