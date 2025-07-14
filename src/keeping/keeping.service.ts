import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Keeping } from 'src/entity/keeping.entity';
import { KeepingCreateDto, KeepingUpdateDto, KeepingBatchDto, SyncPayload, SyncResult, ConflictItem, ConflictType, ConflictResolution } from 'src/dto/keeping.dto';
import { PaginationDto } from 'src/dto/pagination.dto';

@Injectable()
export class KeepingService {
    constructor(
        @InjectRepository(Keeping)
        private keepingRepository: Repository<Keeping>,
    ) { }

    async findAll(paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;
        if (!page || !limit) {
            const items = await this.keepingRepository.find();
            return { items, meta: { total: items.length } };
        }
        const [items, total] = await this.keepingRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
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
        await this.keepingRepository.update(beSaved.id, beSaved);
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

    async batchOperation(body: KeepingBatchDto, createUserId: number) {
        const result = {
            createdCount: 0,
            updatedCount: 0,
            deletedCount: 0
        };

        if (body.deletes?.length) {
            for (const id of body.deletes) {
                try {
                    await this.delete(id);
                    result.deletedCount++;
                } catch (error) {
                    console.error(`删除记录ID ${id} 失败:`, error);
                }
            }
        }

        if (body.updates?.length) {
            for (const item of body.updates) {
                try {
                    await this.update(item, createUserId);
                    result.updatedCount++;
                } catch (error) {
                    console.error(`更新记录ID ${item.id} 失败:`, error);
                }
            }
        }

        if (body.creates?.length) {
            for (const item of body.creates) {
                try {
                    await this.create(item, createUserId);
                    result.createdCount++;
                } catch (error) {
                    console.error('创建记录失败:', error);
                }
            }
        }

        return result;
    }

    /**
     * 同步策略：
     * 1. 客户端通过时间戳告诉服务端上次的同步时间 xxx，服务端获取从这时间戳之后的变更
     * 2. 检测冲突（相同ID但是内容不同）
     * 3. 解决冲突（客户端提供冲突解决策略）
     * 4. 执行批量操作
     * 5. 返回最新服务端状态
     */
    async handleSync(payload: SyncPayload, userId: number): Promise<SyncResult> {
        const { changes, lastSyncAt, resolutions } = payload;
        let normalizedChanges: KeepingBatchDto;
        if (!changes) {
            normalizedChanges = { creates: [], updates: [], deletes: [] };
        } else {
            normalizedChanges = changes as KeepingBatchDto;
        }

        // 获取自上次同步以来的服务器变更
        const serverChanges = await this.getChangesSince(lastSyncAt, userId);

        // 检测冲突
        const conflicts = this.detectConflicts(normalizedChanges, serverChanges);

        // 如果有冲突且没有提供解决方案，返回冲突信息
        if (conflicts.length > 0 && (!resolutions || resolutions.length === 0)) {
            return {
                serverTime: new Date().toISOString(),
                conflicts,
                serverChanges: {
                    creates: [],
                    updates: [],
                    deletes: []
                }
            };
        }

        // 应用冲突解决方案
        const resolvedChanges = conflicts.length > 0
            ? this.applyResolutions(normalizedChanges, serverChanges, resolutions || [])
            : normalizedChanges;

        // 执行批量操作
        await this.batchOperation(resolvedChanges, userId);

        // 获取最新的服务器状态
        const currentState = await this.getCurrentState(userId);

        // 创建localId到serverId的映射
        const idMappings: { localId: string; serverId: number }[] = [];
        if (resolvedChanges.creates && resolvedChanges.creates.length > 0) {
            for (const createItem of resolvedChanges.creates) {
                if (createItem.localId) {
                    // 查找刚创建的记录，通过其他字段匹配
                    const createdItem = await this.keepingRepository.findOne({
                        where: {
                            name: createItem.name,
                            amount: createItem.amount,
                            transactionType: createItem.transactionType,
                            createUserId: userId,
                            localId: createItem.localId
                        },
                        order: { createTime: 'DESC' }
                    });

                    if (createdItem) {
                        idMappings.push({
                            localId: createItem.localId,
                            serverId: createdItem.id
                        });
                    }
                }
            }
        }

        return {
            serverTime: new Date().toISOString(),
            conflicts: [],
            serverChanges: currentState,
            idMappings // 返回映射关系
        };
    }

    private async getChangesSince(timestamp: string, userId: number): Promise<Keeping[]> {
        return this.keepingRepository.find({
            where: {
                createUserId: userId,
                updateTime: MoreThan(new Date(timestamp))
            }
        });
    }

    private async getCurrentState(userId: number): Promise<KeepingBatchDto> {
        const keepings = await this.keepingRepository.find({
            where: { createUserId: userId }
        });

        return {
            creates: keepings
        };
    }

    private detectConflicts(
        clientChanges: KeepingBatchDto,
        serverChanges: Keeping[]
    ): ConflictItem[] {
        const conflicts: ConflictItem[] = [];

        // 检测删除冲突
        if (clientChanges.deletes?.length) {
            clientChanges.deletes.forEach(id => {
                const serverItem = serverChanges.find(i => i.id === id);
                if (serverItem) {
                    conflicts.push({
                        type: ConflictType.DELETE,
                        clientVersion: null,
                        serverVersion: serverItem,
                        conflictSince: serverItem.updateTime.toISOString()
                    });
                }
            });
        }

        // 检测更新冲突
        if (clientChanges.updates?.length) {
            clientChanges.updates.forEach(update => {
                const serverItem = serverChanges.find(i => i.id === update.id);
                if (serverItem && new Date(serverItem.updateTime) > new Date(update.updateTime)) {
                    conflicts.push({
                        type: ConflictType.UPDATE,
                        clientVersion: update,
                        serverVersion: serverItem,
                        conflictSince: serverItem.updateTime.toISOString()
                    });
                }
            });
        }

        return conflicts;
    }

    private applyResolutions(
        clientChanges: KeepingBatchDto,
        serverChanges: Keeping[],
        resolutions: ConflictResolution[]
    ): KeepingBatchDto {
        // 确保clientChanges是正确的KeepingBatchDto格式
        const normalizedChanges = this.normalizeKeepingBatchDto(clientChanges);
        const resolvedChanges = { ...normalizedChanges };

        resolutions.forEach(resolution => {
            switch (resolution.type) {
                case ConflictType.UPDATE:
                    if (resolution.strategy === 'server') {
                        // 使用服务端版本，从客户端更新中移除
                        resolvedChanges.updates = resolvedChanges.updates?.filter(
                            item => item.id !== resolution.resolvedData.id
                        );
                    } else if (resolution.strategy === 'merge') {
                        // 使用合并后的数据
                        const itemIndex = resolvedChanges.updates?.findIndex(
                            item => item.id === resolution.resolvedData.id
                        );
                        if (itemIndex !== undefined && itemIndex >= 0) {
                            resolvedChanges.updates![itemIndex] = resolution.resolvedData;
                        }
                    }
                    // client策略保持原样
                    break;

                case ConflictType.DELETE:
                    if (resolution.strategy === 'server') {
                        // 使用服务端版本，取消删除
                        resolvedChanges.deletes = resolvedChanges.deletes?.filter(
                            id => id !== resolution.resolvedData.id
                        );
                    }
                    // client策略保持原样
                    break;
            }
        });

        return resolvedChanges;
    }

    /**
     * 确保KeepingBatchDto对象格式正确，将可能的对象格式转换为数组格式
     */
    private normalizeKeepingBatchDto(data: any): KeepingBatchDto {
        const result: KeepingBatchDto = {
            creates: [],
            updates: [],
            deletes: []
        };

        // 处理creates字段
        if (data.creates) {
            if (Array.isArray(data.creates)) {
                result.creates = data.creates;
            } else if (typeof data.creates === 'object') {
                result.creates = Object.values(data.creates);
            }
        }

        // 处理updates字段
        if (data.updates) {
            if (Array.isArray(data.updates)) {
                result.updates = data.updates;
            } else if (typeof data.updates === 'object') {
                result.updates = Object.values(data.updates);
            }
        }

        // 处理deletes字段
        if (data.deletes) {
            if (Array.isArray(data.deletes)) {
                result.deletes = data.deletes;
            } else if (typeof data.deletes === 'object') {
                result.deletes = Object.values(data.deletes).map(Number);
            }
        }

        return result;
    }
}
