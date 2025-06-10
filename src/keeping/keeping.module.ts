import { Module } from '@nestjs/common';
import { KeepingService } from './keeping.service';
import { KeepingController } from './keeping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Keeping } from 'src/entity/keeping.entity';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  controllers: [KeepingController],
  providers: [KeepingService],
  imports: [TypeOrmModule.forFeature([Keeping]), JwtModule],
  exports: [KeepingService],
})
export class KeepingModule { }
