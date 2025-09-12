import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs-extra';
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
    private readonly UPLOAD_DIR = 'uploads';
    private readonly MINIO_BUCKET = 'bookkeeping';

    constructor(
        @InjectRepository(FileEntity)
        private readonly fileRepository: Repository<FileEntity>,
        private readonly jwtService: JwtService,
        private readonly uploadHistoryService: UploadHistoryService,
        private readonly minioService: MinioService
    ) { }

    async uploadFile(userId: number, file: Express.Multer.File) {
        
        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        const {url:fileUrl, objectName: filename} = await this.minioService.uploadFile(
            this.MINIO_BUCKET, 
            uniqueFilename, 
            file
        );

        const fileRecord = this.fileRepository.create({
            filename,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            // filepath: path.join(this.UPLOAD_DIR, file.filename),
            filepath: fileUrl,
            user: { id: userId }
        });

        await fs.ensureDir(path.dirname(fileRecord.filepath));

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
            user: {
                userId: user.id,
                username: user.username
            }
        };
    }

    async getFileInfo(userId: number, dto: FileInfoDto) {
        const fileRecord = await this.fileRepository.findOne({
            where: {
                filename: dto.filename,
                user: { id: userId }
            },
            relations: ['user']
        });

        if (!fileRecord) {
            throw new NotFoundException('文件不存在或无权访问');
        }

        const url = new URL(fileRecord.filepath)
        const pathParts = url.pathname.split('/')
        const bucketName = pathParts[1];
        const objectName = pathParts.slice(2).join('/');

        const token: BKS.DownloadFileTokenInfo = {
            userId,
            filepath: fileRecord.filepath,            
            mime: fileRecord.mimetype as unknown as MimeType,
            bucketName,
            objectName
        };
        const query = new URLSearchParams({
            type: dto.mime ? 'playback' : 'download',
            token: await this.jwtService.generateFileToken(token)
        }).toString();

        return {
            url: `/file/get/${encodeURIComponent(fileRecord.filename)}?${query}`,
            filename: fileRecord.filename,
            originalname: fileRecord.originalname,
            size: fileRecord.size,
            mimetype: fileRecord.mimetype,
            uploadTime: fileRecord.createTime
        }
    }

    verifyToken(token: string) {
        return this.jwtService.verifyFile(token);
    }

    downloadMinioFile(bucketName: string, objectName: string) {
        return this.minioService.downloadFile(bucketName, objectName);
    }
}