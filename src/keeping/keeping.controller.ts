import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { KeepingService } from './keeping.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Keeping } from '../entity/keeping.entity';
import { KeepingCreateDto, KeepingUpdateDto } from '../dto/keeping.dto';

@ApiTags('记账')
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

  @Get('detail')
  @ApiOkResponse({
    description: '获取记账详情',
    type: Keeping,
  })
  getKeepingById(@Query('id') id: number) {
    return this.keepingService.findOne(id);
  }

  @Post('create')
  @ApiOkResponse({
    description: '添加记账',
    type: Keeping,
  })
  addKeeping(@Body() keepingDto: KeepingCreateDto) {
    return this.keepingService.create(keepingDto);
  }

  @Post('update')
  @ApiOkResponse({
    description: '更新记账',
    type: Keeping,
  })
  updateKeeping(@Body() keepingDto: KeepingUpdateDto) {
    return this.keepingService.update(keepingDto);
  }
}
