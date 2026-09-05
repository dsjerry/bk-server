import { Controller, Get, Post, Body, UseGuards, Delete, Patch, Param, Query } from '@nestjs/common';
import { KeepingService } from './keeping.service';
import { SyncService } from './sync.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  KeepingCreateDto,
  KeepingUpdateDto,
  PaginatedKeepingResponse,
  KeepingBatchDto,
  SyncPayload,
  SyncResult,
  KeepingFilterDto,
} from 'src/dto/keeping.dto';
import { KeepingResponseDto } from 'src/dto/keeping-response.dto';
import { JwtGuard } from 'src/guard/jwt.guard';
import { ReqUser } from 'src/decorator';

@ApiTags('记账')
@UseGuards(JwtGuard)
@Controller('keeping')
export class KeepingController {
  constructor(
    private readonly keepingService: KeepingService,
    private readonly syncService: SyncService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: '获取当前用户的记账（支持关键字/类型/分类/时间区间过滤）',
    type: PaginatedKeepingResponse,
  })
  getKeepings(@Query() filterDto: KeepingFilterDto, @ReqUser() user: BKS.ReqUser) {
    return this.keepingService.findAll(filterDto, user.userId);
  }

  @Get(':id')
  @ApiOkResponse({
    description: '获取记账详情（仅本人可见）',
    type: KeepingResponseDto,
  })
  getKeepingById(@Param('id') id: number, @ReqUser() user: BKS.ReqUser) {
    return this.keepingService.findOne(id, user.userId);
  }

  @Post()
  @ApiOkResponse({
    description: '添加记账',
    type: KeepingResponseDto,
  })
  addKeeping(@Body() keepingDto: KeepingCreateDto, @ReqUser() user: BKS.ReqUser) {
    return this.keepingService.create(keepingDto, user.userId);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: '删除记账（软删除，仅本人记录）',
    type: String,
  })
  deleteKeeping(@Param('id') id: number, @ReqUser() user: BKS.ReqUser) {
    return this.keepingService.delete(id, user.userId);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: '更新记账',
    type: KeepingResponseDto,
  })
  updateKeeping(@Param('id') id: number, @ReqUser() user: BKS.ReqUser, @Body() keepingDto: KeepingUpdateDto) {
    return this.keepingService.update({ ...keepingDto, id }, user.userId);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量操作记账数据（事务保证原子性）' })
  @ApiOkResponse({
    description: '批量同步记账数据',
    type: String,
  })
  async batchUpsert(@Body() body: KeepingBatchDto, @ReqUser() user: BKS.ReqUser) {
    return this.keepingService.batchOperation(body, user.userId);
  }

  @Post('sync')
  @ApiOperation({ summary: '数据同步（带冲突解决）' })
  @ApiOkResponse({
    description: '返回同步结果及冲突数据',
    type: SyncResult,
  })
  async handleSync(@Body() payload: SyncPayload, @ReqUser() user: BKS.ReqUser) {
    return this.syncService.handleSync(payload, user.userId);
  }
}
