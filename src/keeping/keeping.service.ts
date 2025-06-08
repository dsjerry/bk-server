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

    create(keepingDto: KeepingCreateDto): Promise<Keeping> {
        const keeping = this.keepingRepository.create({ ...keepingDto, createUserId: 10086 });
        return this.keepingRepository.save(keeping);
    }

    update(keepingDto: KeepingUpdateDto): Promise<Keeping> {
        const current = this.findOne(keepingDto.id);
        return this.keepingRepository.save({ ...current, ...keepingDto });
    }
}
