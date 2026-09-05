import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MimeType } from 'file-type';
import { File as FileEntity } from 'src/entity';
import { FileInfoDto } from 'src/dto/file.dto';
import { JwtService } from 'src/jwt/jwt.service';
import { UploadHistoryService } from 'src/user/service/upload.history.service';
import { MinioService } from 'src/minio/minio.service';

@Injectable()
export class FileService {
  private readonly MINIO_BUCKET = 'bookkeeping';

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly jwtService: JwtService,
    private readonly uploadHistoryService: UploadHistoryService,
    private readonly minioService: MinioService,
  ) {}

  async uploadFile(userId: number, file: Express.Multer.File) {
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const { url: fileUrl } = await this.minioService.uploadFile(this.MINIO_BUCKET, uniqueFilename, file);

    const fileRecord = this.fileRepository.create({
      filename: uniqueFilename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      // filepath 存 MinIO 相对路径（/bucket/object），下载时由 /file/get 按 token 转发
      filepath: fileUrl,
      user: { id: userId },
    });

    const savedFile = await this.fileRepository.save(fileRecord);

    const { user, ...fileInfo } = await this.uploadHistoryService.add(userId, {
      filename: savedFile.filename,
      originalname: savedFile.originalname,
      size: savedFile.size,
      mimetype: savedFile.mimetype,
      filepath: savedFile.filepath,
    });

    return {
      ...fileInfo,
      url: fileUrl,
      // 一步到位的带 token 地址：客户端（如 RN <Image>）可直接渲染，
      // 无需再调 /file/info 换取下载链接
      viewUrl: await this.buildTokenizedUrl(userId, savedFile, 'playback'),
      user: {
        userId: user.id,
        username: user.username,
      },
    };
  }

  async getFileInfo(userId: number, dto: FileInfoDto) {
    const fileRecord = await this.fileRepository.findOne({
      where: {
        filename: dto.filename,
        user: { id: userId },
      },
      relations: ['user'],
    });

    if (!fileRecord) {
      throw new NotFoundException('文件不存在或无权访问');
    }

    const url = await this.buildTokenizedUrl(userId, fileRecord, dto.mime ? 'playback' : 'download');

    return {
      url,
      filename: fileRecord.filename,
      originalname: fileRecord.originalname,
      size: fileRecord.size,
      mimetype: fileRecord.mimetype,
      uploadTime: fileRecord.createTime,
    };
  }

  /** 删除文件：属主校验后同时清理 MinIO 对象和数据库记录 */
  async remove(userId: number, id: number) {
    const fileRecord = await this.fileRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['user'],
    });
    if (!fileRecord) {
      throw new NotFoundException('文件不存在或无权访问');
    }

    const { bucketName, objectName } = this.parseFilepath(fileRecord.filepath);
    if (bucketName && objectName) {
      await this.minioService.removeObject(bucketName, objectName);
    }
    // 文件记录物理删除：对象已删，留着记录只会误导（File 实体没有软删除列）
    await this.fileRepository.delete(id);
    return '删除成功';
  }

  verifyToken(token: string) {
    return this.jwtService.verifyFile(token);
  }

  downloadMinioFile(bucketName: string, objectName: string) {
    return this.minioService.downloadFile(bucketName, objectName);
  }

  /**
   * 解析 MinIO 相对路径 "/bucket/object" 为 bucket + object。
   * 不能用 new URL()：相对路径会直接抛 Invalid URL（getFileInfo 此前的隐藏 bug）
   */
  private parseFilepath(filepath: string): { bucketName?: string; objectName?: string } {
    const parts = filepath.split('/').filter(Boolean);
    if (parts.length < 2) {
      return {};
    }
    return { bucketName: parts[0], objectName: parts.slice(1).join('/') };
  }

  /** 生成带 file-token 的下载地址（token 有效期 FILE_TOKEN_EXPIRED，默认 1 天） */
  private async buildTokenizedUrl(
    userId: number,
    fileRecord: FileEntity,
    type: 'download' | 'playback',
  ): Promise<string> {
    const { bucketName, objectName } = this.parseFilepath(fileRecord.filepath);
    const token: BKS.DownloadFileTokenInfo = {
      userId,
      filepath: fileRecord.filepath,
      mime: fileRecord.mimetype as unknown as MimeType,
      bucketName,
      objectName,
    };
    const query = new URLSearchParams({
      type,
      token: await this.jwtService.generateFileToken(token),
    }).toString();
    return `/file/get/${encodeURIComponent(fileRecord.filename)}?${query}`;
  }
}
