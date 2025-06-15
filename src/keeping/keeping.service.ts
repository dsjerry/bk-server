import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Keeping } from '../entity/keeping.entity';
import { KeepingCreateDto, KeepingUpdateDto } from '../dto/keeping.dto';

@Injectable()
export class KeepingService {
    constructor(
        @InjectRepository(Keeping)
        private keepingRepository: Repository<Keeping>,
    ) { }

    findAll(): Promise<Keeping[]> {
        return this.keepingRepository.find();
    }

    findOne(id: number): Promise<Keeping> {
        return this.keepingRepository.findOne({ where: { id } }) as Promise<Keeping>;
    }

    create(keepingDto: KeepingCreateDto, createUserId: number): Promise<Keeping> {
        const keeping = this.keepingRepository.create({ ...keepingDto, createUserId });
        return this.keepingRepository.save(keeping);
    }

    async update(keepingDto: KeepingUpdateDto, createUserId: number) {
        const current = await this.findOne(keepingDto.id);
        const beSaved = { ...current, ...keepingDto, createUserId };
        this.keepingRepository.update(beSaved.id, beSaved);
        return this.findOne(beSaved.id);
    }

    async delete(id: number) {
        const current = await this.findOne(id);
        if (!current) {
            throw new Error('删除失败，记录不存在');
        }
        const result = await this.keepingRepository.delete(id);
        if (result.affected === 0) {
            throw new Error('删除失败');
        }
        return '删除成功';
    }
}
