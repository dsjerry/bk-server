import { Injectable, ForbiddenException } from "@nestjs/common";
import { File as FileEntity } from "src/entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserService } from "../user.service";

@Injectable()
export class UploadHistoryService {
    constructor(
        @InjectRepository(FileEntity) private readonly fileRepository: Repository<FileEntity>,
        private readonly userService: UserService,
    ) { }

    query(id: number) {
        return this.fileRepository.createQueryBuilder("file").where("file.user = :id", { id }).getMany();
    }

    async add(userId: number, file: Omit<FileEntity, "user" | "id" | "exist">) {
        const user = await this.userService.findOneById(userId);
        if (!user) throw new ForbiddenException("用户不存在");
        return await this.fileRepository.save({
            ...file,
            user,
        });
    }
}