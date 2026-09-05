import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from 'src/entity/category.entity';

describe('CategoryService', () => {
  let service: CategoryService;

  const qb = {
    where: jest.fn(),
    getMany: jest.fn(),
  };
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryService, { provide: getRepositoryToken(Category), useValue: repository }],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    jest.clearAllMocks();
    qb.where.mockImplementation(() => qb as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('列表返回本人分类 + 全局共享分类', async () => {
    qb.getMany.mockResolvedValue([]);
    await service.findAllForUser(42);
    expect(qb.where).toHaveBeenCalledWith('category.createUserId = :userId OR category.createUserId IS NULL', {
      userId: 42,
    });
  });

  it('创建时带上 createUserId', async () => {
    repository.create.mockImplementation((data: Partial<Category>) => data as Category);
    repository.save.mockImplementation((entity: Category) => Promise.resolve(entity));

    const result = await service.create({ name: '购物' }, 42);
    expect(result.createUserId).toBe(42);
  });

  it('修改/删除别人的分类被拒绝（越权防护）', async () => {
    repository.findOne.mockResolvedValue({ id: 1, createUserId: 999 } as Category);
    await expect(service.update(1, { name: 'x' }, 42)).rejects.toThrow(ForbiddenException);
    await expect(service.delete(1, 42)).rejects.toThrow(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('删除自己的分类走软删除', async () => {
    repository.findOne.mockResolvedValue({ id: 1, createUserId: 42 } as Category);
    repository.softDelete.mockResolvedValue({ affected: 1, raw: [] });
    await expect(service.delete(1, 42)).resolves.toBe('删除成功');
    expect(repository.softDelete).toHaveBeenCalledWith(1);
  });
});
