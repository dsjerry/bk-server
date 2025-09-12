import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
    constructor(
        @Inject('MINIO_CLIENT') private readonly minioClient: Minio.Client,
        private configService: ConfigService
    ) {}
    async ensureBucket(bucketName: string) {
        try {
            const exists = await this.minioClient.bucketExists(bucketName);
            if (!exists) {
                await this.minioClient.makeBucket(bucketName);
                // 设置权限等
                // await this.minioClient.setBucketPolicy(bucketName, );
                console.log(`Bucket ${bucketName} exists`);
            }
        } catch (err) {
            console.error(`Error checking bucket ${bucketName}:`, err);
        }
    }

    async uploadFile(
        bucketName: string,
        objectName: string,
        file: Express.Multer.File
    ) {
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
            baseUrl: this.getBaseUrl()
        };
    }

    async downloadFile(bucketName: string, objectName: string) {
        return this.minioClient.getObject(bucketName, objectName);
    }

    private getBaseUrl() {
        const protocol = this.configService.get('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
        return `${protocol}://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}`;
    }
}
