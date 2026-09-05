import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtGuard } from 'src/guard/jwt.guard';
import { ReqUser } from 'src/decorator';

/**
 * 分类管理。分类是用户私有数据（自定义 tag）：
 * 读取返回"本人 + 全局共享（createUserId 为空）"，写入需要登录且只能操作本人创建的
 */
@ApiTags('category')
@UseGuards(JwtGuard)
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto, @ReqUser() user: BKS.ReqUser) {
    return this.categoryService.create(createCategoryDto, user.userId);
  }

  @Get()
  findAll(@ReqUser() user: BKS.ReqUser) {
    return this.categoryService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  // 部分更新，使用 patch；完全替换使用 put。+id为了将字符串转换为数字
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto, @ReqUser() user: BKS.ReqUser) {
    return this.categoryService.update(+id, updateCategoryDto, user.userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @ReqUser() user: BKS.ReqUser) {
    return this.categoryService.delete(+id, user.userId);
  }
}
