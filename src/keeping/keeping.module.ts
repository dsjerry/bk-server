import { Module } from '@nestjs/common';
import { KeepingService } from './keeping.service';
import { KeepingController } from './keeping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Keeping } from '../entity/keeping.entity';

@Module({
  controllers: [KeepingController],
  providers: [KeepingService],
  imports: [TypeOrmModule.forFeature([Keeping])],
  exports: [KeepingService],
})
export class KeepingModule { }
