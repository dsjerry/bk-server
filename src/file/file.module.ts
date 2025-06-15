import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConfigService } from '@nestjs/config';
import { FileController } from './file.controller';

@Module({
    imports: [MulterModule.registerAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
            /**
             * dest 简单的配置，只需要设置上传目录
             */
            // dest: configService.get('UPLOAD_DIR'),
            storage: diskStorage({
                destination: configService.get('UPLOAD_DIR'),  // 设置上传目录
                filename: (req, file, callback) => {
                    const randomName = Array(32).fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    callback(null, `${randomName}${extname(file.originalname)}`);
                }
            })
        }),
    })],
    controllers: [FileController],
    providers: [FileService],
    exports: [FileService],
})
export class FileModule {
    constructor(private readonly fileService: FileService) { }
}
