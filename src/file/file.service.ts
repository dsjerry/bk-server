import { Injectable } from '@nestjs/common'

@Injectable()
export class FileService {
    constructor() { }

    uploadFile(file: Express.Multer.File) {
        console.log(file);
        return {
            url: `/static/${file.filename}`,
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
        }
    }
}