import { Injectable, NotFoundException } from '@nestjs/common';
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
            throw new NotFoundException('删除失败，记录不存在');
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
     * 
     * 同步过程：
     * 1. 首次同步：
     *    - 调用`sync`同步方法发送本地变更
     *    - 服务端处理并且返回结果
     *    - 更新本地数据状态（同步、新增、修改、删除）
     * 2. 处理冲突：
     *    - 如果有冲突的数据，客户端显示冲突信息并且展示解决方式（客户端、服务端、合并）
     *    - 使用`resolveConflicts`生成解决方案
     *    - 再次调用`sync(resolutions)`同步方法将数据发给服务端
     *    - 服务端处理并且返回结果
     *    - 更新本地数据状态（同步、新增、修改、删除）
     * 
     */
    async handleSync(payload: SyncPayload, userId: number): Promise<SyncResult> {
        const { changes = { creates: [], updates: [], deletes: [] }, lastSyncAt, resolutions } = payload;

        // 获取自上次同步以来的服务器变更
        const serverChanges = await this.getChangesSince(lastSyncAt, userId);

        // 检测冲突
        const conflicts = this.detectConflicts(changes, serverChanges);

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
            ? this.applyResolutions(changes, serverChanges, resolutions || [])
            : changes;

        // 执行批量操作
        await this.batchOperation(resolvedChanges, userId);

        // 获取最新的服务器状态
        const currentState = await this.getCurrentState(userId);

        // 创建localId到serverId的映射（仅本地存储时使用了时间戳作为唯一ID，服务端使用自增ID）
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

    private detectConflicts(clientChanges: KeepingBatchDto, serverChanges: Keeping[]) {
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
        // 客户端已预先处理好数据格式
        const resolvedChanges = { ...clientChanges };

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
}
