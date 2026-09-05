import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Query,
  Get,
  Req,
  Param,
  NotFoundException,
  Res,
  UseGuards,
  Logger,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs-extra';
import { FileService } from './file.service';
import { FileInfoDto } from 'src/dto/file.dto';
import { ReqUser } from 'src/decorator';
import { JwtGuard } from 'src/guard/jwt.guard';
import { MinioService } from 'src/minio/minio.service';
import { memoryStorage } from 'multer';

@ApiTags('文件模块')
@Controller('file')
export class FileController {
  // "Request aborted" 属于客户端主动取消下载，除此以外的回调错误才值得记录
  private readonly logger = new Logger(FileController.name);

  constructor(
    private readonly fileService: FileService,
    private readonly minioService: MinioService,
  ) {}
  @Post('upload')
  // UseInterceptors装饰器用于添加拦截器, FileInterceptor用于处理文件上传（单文件上传）
  // FileInterceptor 接受的数据类型为 multipart/form-data
  // 默认使用磁盘存储，Minio 需要使用内存存储
  @ApiOperation({ summary: '单文件上传' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @UseGuards(JwtGuard)
  uploadFile(@UploadedFile() file: Express.Multer.File, @ReqUser() user: BKS.ReqUser) {
    return this.fileService.uploadFile(user.userId, file);
  }

  @Post('upload/files')
  @ApiOperation({ summary: '多文件上传' })
  @UseInterceptors(FilesInterceptor('files'))
  @UseGuards(JwtGuard)
  uploadFiles(@UploadedFile() files: Express.Multer.File[], @ReqUser() user: BKS.ReqUser) {
    return files.map((file) => this.fileService.uploadFile(user.userId, file));
  }

  @Post('upload/any')
  @ApiOperation({ summary: '任意字段名的多文件上传' })
  @UseInterceptors(AnyFilesInterceptor())
  @UseGuards(JwtGuard)
  uploadAnyFiles(@UploadedFile() files: Express.Multer.File[], @ReqUser() user: BKS.ReqUser) {
    return files.map((file) => this.fileService.uploadFile(user.userId, file));
  }

  @Post('upload/image')
  @ApiOperation({ summary: '上传图片，同时结合DTO' })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 10, // 10MB
      },
    }),
  )
  @UseGuards(JwtGuard)
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { thumbnail: boolean },
    @ReqUser() user: BKS.ReqUser,
  ) {
    if (body.thumbnail) {
      // 生成缩略图逻辑
    }
    return this.fileService.uploadFile(user.userId, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件（仅本人上传的，同时清理 MinIO 对象）' })
  @UseGuards(JwtGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @ReqUser() user: BKS.ReqUser) {
    return this.fileService.remove(user.userId, id);
  }

  @Get('info')
  @ApiOperation({ summary: '获取文件信息' })
  @UseGuards(JwtGuard)
  info(@Req() req: BKS.ReqUser, @Query() dto: FileInfoDto) {
    return this.fileService.getFileInfo(req.userId, dto);
  }

  @Get('get/:filename')
  @ApiOperation({ summary: '下载文件' })
  async download(
    @Param('filename') filename: string,
    @Query() query: { type: 'download' | 'playback'; token: string },
    @Res({ passthrough: false }) res: Response,
  ) {
    const info = await this.fileService.verifyToken(query.token);

    if (info.bucketName && info.objectName) {
      const fileStream = await this.minioService.downloadFile(info.bucketName, info.objectName);
      const headers: Record<string, string> = {};

      if (info.mime) headers['Content-Type'] = info.mime;
      if (query.type == 'download') {
        headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      }

      Object.keys(headers).forEach((key) => {
        res.setHeader(key, headers[key]);
      });

      return fileStream.pipe(res);
    }

    if (!fs.existsSync(info.filepath)) throw new NotFoundException(`File not found : ${info.filepath}`);

    const headers: Record<string, string> = {};
    const options = {
      extensions: false,
      index: false,
    };

    if (info.mime) headers['Content-Type'] = info.mime;
    if (query.type == 'download') {
      // 某些下载方式会从headers中获取文件名
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      options['headers'] = headers;

      return res.download(info.filepath, filename, options, (error) => {
        if (error && error.message != 'Request aborted')
          this.logger.error(`下载文件失败 ${info.filepath}: ${error.message}`);
      });
    }

    return res.sendFile(info.filepath, options, (error) => {
      if (error && error.message != 'Request aborted')
        this.logger.error(`发送文件失败 ${info.filepath}: ${error.message}`);
    });
  }
}

/**
 * 其他用法：
 *
 * - 保存到内存中，后续继续处理（如上传到云存储）
 * @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
 */
