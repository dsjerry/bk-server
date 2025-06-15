import { Injectable } from '@nestjs/common';
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
  ) { }

  create(createCategoryDto: CreateCategoryDto) {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  findAll() {
    return this.categoryRepository.find();
  }

  findOne(id: number) {
    return this.categoryRepository.findOne({ where: { id } });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = this.categoryRepository.create(updateCategoryDto);
    const result = await this.categoryRepository.update(id, category);
    if (result.affected === 0) {
      throw new Error('更新失败');
    }
    return this.findOne(id);
  }

  async delete(id: number) {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('删除失败');
    }
    return '删除成功';
  }
}
