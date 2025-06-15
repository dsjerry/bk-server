import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileService } from './file.service'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('file')
export class FileController {
    constructor(private readonly fileService: FileService) { }
    @Post('upload')
    // UseInterceptors装饰器用于添加拦截器, FileInterceptor用于处理文件上传（单文件上传）
    // FileInterceptor 接受的数据类型为 multipart/form-data
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        return this.fileService.uploadFile(file);
    }
}