import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);

  constructor(
    @Inject('MINIO_CLIENT') private readonly minioClient: Minio.Client,
    private configService: ConfigService,
  ) {}
  async ensureBucket(bucketName: string) {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(bucketName);
        // 设置权限等
        // await this.minioClient.setBucketPolicy(bucketName, );
        this.logger.log(`Bucket ${bucketName} 不存在，已自动创建`);
      }
    } catch (err) {
      // 桶初始化失败只降级记录：多数接口（登录/记账）不依赖 MinIO，不应因此阻断启动
      this.logger.error(`初始化 Bucket ${bucketName} 失败: ${err instanceof Error ? err.message : err}`);
    }
  }

  async uploadFile(bucketName: string, objectName: string, file: Express.Multer.File) {
    await this.ensureBucket(bucketName);
    // 传递 file.stram 适合大文件
    await this.minioClient.putObject(bucketName, objectName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
    return {
      bucketName,
      objectName,
      mime: file.mimetype,
      size: file.size,
      url: `/${bucketName}/${objectName}`,
      baseUrl: this.getBaseUrl(),
    };
  }

  async downloadFile(bucketName: string, objectName: string) {
    return this.minioClient.getObject(bucketName, objectName);
  }

  async removeObject(bucketName: string, objectName: string) {
    await this.minioClient.removeObject(bucketName, objectName);
  }

  private getBaseUrl() {
    const protocol = this.configService.get('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
    return `${protocol}://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}`;
  }
}
