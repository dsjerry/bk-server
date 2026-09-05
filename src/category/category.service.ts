import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/entity/category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  create(createCategoryDto: CreateCategoryDto, createUserId: number) {
    const category = this.categoryRepository.create({ ...createCategoryDto, createUserId });
    return this.categoryRepository.save(category);
  }

  /**
   * 返回用户可见的分类 = 本人创建的 + 全局共享的（createUserId 为 NULL 的内置分类）。
   * 此前是无守卫的全表查询，任何匿名请求都能增删改所有人的分类
   */
  findAllForUser(userId: number) {
    return this.categoryRepository
      .createQueryBuilder('category')
      .where('category.createUserId = :userId OR category.createUserId IS NULL', { userId })
      .getMany();
  }

  findOne(id: number) {
    return this.categoryRepository.findOne({ where: { id } });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, userId: number) {
    await this.assertOwner(id, userId);
    const category = this.categoryRepository.create(updateCategoryDto);
    const result = await this.categoryRepository.update(id, category);
    if (result.affected === 0) {
      throw new NotFoundException('更新失败，分类不存在');
    }
    return this.findOne(id);
  }

  async delete(id: number, userId: number) {
    await this.assertOwner(id, userId);
    // 软删除：置 deleteAt 而非物理删行，普通查询自动过滤已删除记录
    const result = await this.categoryRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('删除失败，分类不存在');
    }
    return '删除成功';
  }

  /** 写操作前校验属主：别人的（或全局的）分类不允许改/删 */
  private async assertOwner(id: number, userId: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    if (category.createUserId !== userId) {
      throw new ForbiddenException('只能操作自己创建的分类');
    }
  }
}
