import { Controller, Get, Query, Post, Body, UseGuards, Req, Delete, Put, Param } from '@nestjs/common';
import { KeepingService } from './keeping.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Keeping } from '../entity/keeping.entity';
import { KeepingCreateDto, KeepingUpdateDto } from '../dto/keeping.dto';
import { JwtGuard } from 'src/guard/jwt.guard';

@ApiTags('记账')
@UseGuards(JwtGuard)
@Controller('keeping')
export class KeepingController {
  constructor(private readonly keepingService: KeepingService) { }

  @Get('list')
  @ApiOkResponse({
    description: '获取所有记账',
    type: [Keeping],
  })
  getKeepings() {
    return this.keepingService.findAll();
  }

  @Get('detail/:id')
  @ApiOkResponse({
    description: '获取记账详情',
    type: Keeping,
  })
  getKeepingById(@Param('id') id: number) {
    return this.keepingService.findOne(id);
  }

  @Post('create')
  @ApiOkResponse({
    description: '添加记账',
    type: Keeping,
  })
  addKeeping(@Body() keepingDto: KeepingCreateDto, @Req() req: any) {
    const userId = req.user.userId as number;
    return this.keepingService.create(keepingDto, userId);
  }

  @Delete('delete/:id')
  @ApiOkResponse({
    description: '删除记账',
    type: Keeping,
  })
  deleteKeeping(@Param('id') id: number) {
    return this.keepingService.delete(id);
  }

  @Put('update/:id')
  @ApiOkResponse({
    description: '更新记账',
    type: Keeping,
  })
  updateKeeping(@Param('id') id: number, @Req() req: any, @Body() keepingDto: KeepingUpdateDto) {
    const userId = req.user.userId as number;
    return this.keepingService.update({ ...keepingDto, id }, userId);
  }
}
