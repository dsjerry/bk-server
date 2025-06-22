import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './entities/analysis.entity';
import { KeepingModule } from 'src/keeping/keeping.module';


@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService],
  imports: [TypeOrmModule.forFeature([Analysis]), KeepingModule],
})
export class AnalysisModule { }
