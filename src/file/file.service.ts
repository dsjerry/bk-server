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

@Injectable()
export class FileService {
    private readonly UPLOAD_DIR = 'uploads';

    constructor(
        @InjectRepository(FileEntity)
        private readonly fileRepository: Repository<FileEntity>,
        private readonly jwtService: JwtService,
        private readonly uploadHistoryService: UploadHistoryService
    ) { }

    async uploadFile(userId: number, file: Express.Multer.File) {
        const fileRecord = this.fileRepository.create({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            filepath: path.join(this.UPLOAD_DIR, file.filename),
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

        const filepath = path.join(process.cwd(), this.UPLOAD_DIR, fileRecord.filename);
        if (!fs.existsSync(filepath)) {
            throw new NotFoundException('文件不存在');
        }

        const token: BKS.DownloadFileTokenInfo = {
            userId,
            filepath,
            mime: fileRecord.mimetype as unknown as MimeType
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
}