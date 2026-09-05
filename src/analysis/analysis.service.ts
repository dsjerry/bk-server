import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { KeepingService } from 'src/keeping/keeping.service';
import { Keeping } from 'src/entity/keeping.entity';
import { Analysis } from './entities/analysis.entity';
import { SummaryRange, summarizeKeepings, rangeSince } from './summary.helper';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly keepingService: KeepingService,
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
    @InjectRepository(Keeping)
    private readonly keepingRepository: Repository<Keeping>,
  ) {}

  async create(createAnalysisDto: CreateAnalysisDto, userId: number) {
    // 校验关联的记账属于当前用户（此前任何人可为任何记录挂分析）
    const keeping = await this.keepingService.findOne(createAnalysisDto.keepingId, userId);
    if (!keeping) {
      throw new NotFoundException('关联的 Keeping 记录不存在');
    }

    const analysis = this.analysisRepository.create({
      ...createAnalysisDto,
      createUserId: userId,
      keeping,
    });

    return this.analysisRepository.save(analysis);
  }

  /** 只返回本人的分析记录（此前是全表返回所有人的数据） */
  findAllForUser(userId: number) {
    return this.analysisRepository.find({ where: { createUserId: userId } });
  }

  findOne(id: number, userId: number) {
    return this.analysisRepository.findOne({ where: { id, createUserId: userId } });
  }

  async update(id: number, updateAnalysisDto: UpdateAnalysisDto, userId: number) {
    await this.assertOwner(id, userId);
    // 不需要 create 在 update。update会直接生成update sql，效率更高
    await this.analysisRepository.update(id, updateAnalysisDto);

    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number) {
    await this.assertOwner(id, userId);
    // 软删除：置 deleteAt 而非物理删行，普通查询自动过滤已删除记录
    const result = await this.analysisRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('没有找到当前记录');
    }
    return '删除成功';
  }

  /**
   * 统计聚合：按时间范围汇总本人记账，产出客户端图表需要的
   * 收入/支出总额、分类占比、按日趋势、地点分布。
   * 数据源是 keeping（分析记录表只是 AI 报告的存储）
   */
  async summary(userId: number, range: SummaryRange) {
    const since = rangeSince(range);
    const rows = await this.keepingRepository.find({
      where: {
        createUserId: userId,
        ...(since ? { createTime: MoreThan(since) } : {}),
      },
    });
    return summarizeKeepings(rows, range, since);
  }

  private async assertOwner(id: number, userId: number) {
    const analysis = await this.analysisRepository.findOne({ where: { id } });
    if (!analysis) {
      throw new NotFoundException('没有找到当前记录');
    }
    if (analysis.createUserId !== userId) {
      throw new ForbiddenException('只能操作自己的分析记录');
    }
  }
}
