import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { JwtGuard } from 'src/guard/jwt.guard';
import { ReqUser } from 'src/decorator';
import { SummaryRange } from './summary.helper';

class SummaryQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'all'])
  range?: SummaryRange = 'month';
}

/**
 * 分析模块：
 * - /summary 提供统计聚合（图表数据源）
 * - 其余 CRUD 是 AI 分析报告的存储，全部按用户隔离
 */
@ApiTags('analysis')
@UseGuards(JwtGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  // 注意：summary 必须声明在 :id 路由之前，否则会被 :id 吞掉
  @Get('summary')
  @ApiOperation({ summary: '统计聚合（默认本月）：收支总额/分类占比/按日趋势/地点分布' })
  summary(@Query() query: SummaryQueryDto, @ReqUser() user: BKS.ReqUser) {
    return this.analysisService.summary(user.userId, query.range ?? 'month');
  }

  @Post()
  create(@Body() createAnalysisDto: CreateAnalysisDto, @ReqUser() user: BKS.ReqUser) {
    return this.analysisService.create(createAnalysisDto, user.userId);
  }

  @Get()
  findAll(@ReqUser() user: BKS.ReqUser) {
    return this.analysisService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @ReqUser() user: BKS.ReqUser) {
    return this.analysisService.findOne(+id, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAnalysisDto: UpdateAnalysisDto, @ReqUser() user: BKS.ReqUser) {
    return this.analysisService.update(+id, updateAnalysisDto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @ReqUser() user: BKS.ReqUser) {
    return this.analysisService.remove(+id, user.userId);
  }
}
