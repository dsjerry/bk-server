import { Controller, Get, Post, Body, UseGuards, Req, Delete, Patch, Param, Query } from '@nestjs/common';
import { KeepingService } from './keeping.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Keeping } from 'src/entity/keeping.entity';
import { KeepingCreateDto, KeepingUpdateDto, PaginatedKeepingResponse, KeepingBatchDto, SyncPayload, SyncResult } from 'src/dto/keeping.dto';
import { PaginationDto } from 'src/dto/pagination.dto';
import { JwtGuard } from 'src/guard/jwt.guard';
import { ReqUser } from 'src/decorator';

@ApiTags('记账')
@UseGuards(JwtGuard)
@Controller('keeping')
export class KeepingController {
  constructor(private readonly keepingService: KeepingService) { }

  @Get()
  @ApiOkResponse({
    description: '获取所有记账',
    type: PaginatedKeepingResponse,
  })
  getKeepings(@Query() paginationDto: PaginationDto) {
    return this.keepingService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOkResponse({
    description: '获取记账详情',
    type: Keeping,
  })
  getKeepingById(@Param('id') id: number) {
    return this.keepingService.findOne(id);
  }

  @Post()
  @ApiOkResponse({
    description: '添加记账',
    type: Keeping,
  })
  addKeeping(@Body() keepingDto: KeepingCreateDto, @Req() req: any) {
    const userId = req.user.userId as number;
    return this.keepingService.create(keepingDto, userId);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: '删除记账',
    type: Keeping,
  })
  deleteKeeping(@Param('id') id: number) {
    return this.keepingService.delete(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: '更新记账',
    type: Keeping,
  })
  updateKeeping(@Param('id') id: number, @Req() req: any, @Body() keepingDto: KeepingUpdateDto) {
    const userId = req.user.userId as number;
    return this.keepingService.update({ ...keepingDto, id }, userId);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量操作记账数据' })
  @ApiOkResponse({
    description: '批量同步记账数据',
    type: String,
  })
  async batchUpsert(
    @Body() body: KeepingBatchDto,
    @ReqUser() user: BKS.ReqUser
  ) {
    return this.keepingService.batchOperation(body, user.userId);
  }

  @Post('sync')
  @ApiOperation({ summary: '数据同步（带冲突解决）' })
  @ApiOkResponse({
    description: '返回同步结果及冲突数据',
    type: SyncResult
  })
  async handleSync(
    @Body() payload: SyncPayload,
    @ReqUser() user: BKS.ReqUser
  ) {
    return this.keepingService.handleSync(payload, user.userId);
  }
}
