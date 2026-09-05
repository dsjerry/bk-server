import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from 'src/entity/user.entity';

describe('UserController', () => {
  let controller: UserController;

  const userService = {
    getUsers: jest.fn(),
    findOne: jest.fn(),
    updateUser: jest.fn(),
    findOneById: jest.fn(),
  };

  /** 带密码哈希的完整实体 —— 用来回归验证密码绝不外泄 */
  const userEntity: Partial<User> = {
    id: 1,
    username: '小明',
    age: 18,
    password: '$2b$10$hashhashhash',
    isActive: true,
    createTime: new Date('2026-01-01'),
    avatar: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('用户列表绝不返回密码（历史泄露问题的回归测试）', async () => {
    userService.getUsers.mockResolvedValue({ items: [userEntity], meta: { total: 1 } });

    const result = await controller.getUsers({} as any);

    expect(result.items[0]).not.toHaveProperty('password');
    expect(result.items[0]).toMatchObject({ id: 1, username: '小明' });
  });

  it('用户详情同样不返回密码', async () => {
    userService.findOneById.mockResolvedValue(userEntity);

    const result = await controller.getUserById(1);

    expect(result).not.toHaveProperty('password');
  });

  it('只能修改自己的资料（越权防护）', async () => {
    const me = { userId: 1, username: '小明' } as BKS.ReqUser;
    userService.updateUser.mockResolvedValue(userEntity);

    // 改自己的 → 放行
    await expect(controller.updateUser(1, { age: 19 }, me)).resolves.toMatchObject({ id: 1 });
    // 改别人的 → 403
    await expect(controller.updateUser(2, { age: 19 }, me)).rejects.toThrow(ForbiddenException);
    expect(userService.updateUser).toHaveBeenCalledTimes(1);
  });
});
