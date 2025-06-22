import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UploadHistoryService } from './service/upload.history.service';
import { UserController } from './user.controller';
import { User, File } from 'src/entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, File])],
  controllers: [UserController],
  providers: [UserService, UploadHistoryService],
  exports: [UserService, UploadHistoryService],
})
export class UserModule { }
