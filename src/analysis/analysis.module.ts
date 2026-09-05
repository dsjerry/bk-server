import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './entities/analysis.entity';
import { Keeping } from 'src/entity/keeping.entity';
import { KeepingModule } from 'src/keeping/keeping.module';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService],
  // Keeping 仓库供 summary 统计聚合使用
  imports: [TypeOrmModule.forFeature([Analysis, Keeping]), KeepingModule],
})
export class AnalysisModule {}
