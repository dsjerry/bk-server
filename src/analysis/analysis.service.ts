import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { KeepingService } from 'src/keeping/keeping.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Analysis } from './entities/analysis.entity';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly keepingService: KeepingService,
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>
  ) { }

  async create(createAnalysisDto: CreateAnalysisDto) {
    const keeping = await this.keepingService.findOne(createAnalysisDto.keepingId);
    if (!keeping) {
      throw new NotFoundException('关联的 Keeping 记录不存在');
    }

    const analysis = this.analysisRepository.create({
      ...createAnalysisDto,
      keeping,
    });

    return this.analysisRepository.save(analysis);
  }

  findAll() {
    return this.analysisRepository.find();
  }

  findOne(id: number) {
    return this.analysisRepository.findOne({ where: { id } });
  }

  async update(id: number, updateAnalysisDto: UpdateAnalysisDto) {
    const exists = await this.analysisRepository.existsBy({ id })
    if (!exists) throw new NotFoundException('没有找到当前记录');
    // 不需要 create 在 update。update会直接生成update sql，效率更高
    await this.analysisRepository.update(id, updateAnalysisDto);

    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.analysisRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('没有找到当前记录');
    }
    return '删除成功';
  }
}
