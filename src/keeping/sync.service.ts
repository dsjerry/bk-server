import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Keeping } from 'src/entity/keeping.entity';
import {
  KeepingBatchDto,
  SyncPayload,
  SyncResult,
  ConflictItem,
  ConflictType,
  ConflictResolution,
} from 'src/dto/keeping.dto';
import { toKeepingResponse } from 'src/dto/keeping-response.dto';
import { KeepingService } from './keeping.service';

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
 */

/**
 * 记账同步服务 —— 从 KeepingService 拆出，职责单一化：
 * KeepingService 只管 CRUD/批量落库（含事务），SyncService 只管同步协议
 * （增量拉取、冲突检测、冲突解决、ID 映射）。
 */
@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Keeping)
    private keepingRepository: Repository<Keeping>,
    private keepingService: KeepingService,
  ) {}

  async handleSync(payload: SyncPayload, userId: number): Promise<SyncResult> {
    const { changes = { creates: [], updates: [], deletes: [] }, lastSyncAt, resolutions } = payload;

    // 获取自上次同步以来的服务器变更（含已软删除的行，见 getChangesSince 注释）
    const changedRows = await this.getChangesSince(lastSyncAt, userId);
    // 已删除的记录不参与冲突检测，单独作为删除增量下发给客户端
    const activeChanges = changedRows.filter((row) => !row.deleteAt);
    const deletedIds = changedRows.filter((row) => !!row.deleteAt).map((row) => row.id);

    // 检测冲突
    const conflicts = this.detectConflicts(changes, activeChanges);

    // 如果有冲突且没有提供解决方案，返回冲突信息
    if (conflicts.length > 0 && (!resolutions || resolutions.length === 0)) {
      return {
        serverTime: new Date().toISOString(),
        conflicts,
        serverChanges: {
          creates: [],
          updates: [],
          deletes: [],
        },
      };
    }

    // 应用冲突解决方案
    const resolvedChanges =
      conflicts.length > 0 ? this.applyResolutions(changes, activeChanges, resolutions || []) : changes;

    // 执行批量操作（KeepingService 内部已用事务保证原子性）
    await this.keepingService.batchOperation(resolvedChanges, userId);

    // 获取最新的服务器状态（全量快照）
    const currentKeepings = await this.getCurrentState(userId);

    // 创建localId到serverId的映射（仅本地存储时使用了时间戳作为唯一ID，服务端使用自增ID）
    const idMappings: { localId: string; serverId: number }[] = [];
    if (resolvedChanges.creates && resolvedChanges.creates.length > 0) {
      for (const createItem of resolvedChanges.creates) {
        if (createItem.localId) {
          // 查找刚创建的记录，通过其他字段匹配（走 idx_keeping_user_local_id 索引）
          const createdItem = await this.keepingRepository.findOne({
            where: {
              name: createItem.name,
              amount: createItem.amount,
              transactionType: createItem.transactionType,
              createUserId: userId,
              localId: createItem.localId,
            },
            order: { createTime: 'DESC' },
          });

          if (createdItem) {
            idMappings.push({
              localId: createItem.localId,
              serverId: createdItem.id,
            });
          }
        }
      }
    }

    return {
      serverTime: new Date().toISOString(),
      conflicts: [],
      // creates 保持全量快照（兼容现有客户端），统一映射为响应 DTO 输出；
      // deletes 是本次增量里的删除，客户端可据此清理本地数据 —— 软删除改造后这是删除传播的唯一途径
      serverChanges: {
        creates: currentKeepings.map(toKeepingResponse),
        updates: [],
        deletes: deletedIds,
      },
      idMappings, // 返回映射关系
    };
  }

  /**
   * 拉取某时间点之后该用户的所有变更行。
   * withDeleted 是关键：软删除只是把 deleteAt/updateTime 更新，
   * 默认查询会过滤掉已删除记录，其他设备将永远收不到删除通知。
   */
  private async getChangesSince(timestamp: string, userId: number): Promise<Keeping[]> {
    return this.keepingRepository.find({
      withDeleted: true,
      where: {
        createUserId: userId,
        updateTime: MoreThan(new Date(timestamp)),
      },
    });
  }

  private async getCurrentState(userId: number): Promise<Keeping[]> {
    return this.keepingRepository.find({
      where: { createUserId: userId },
    });
  }

  private detectConflicts(clientChanges: KeepingBatchDto, serverChanges: Keeping[]): ConflictItem[] {
    const conflicts: ConflictItem[] = [];

    // 检测删除冲突：客户端要删的记录，服务端在同步窗口内也改过
    if (clientChanges.deletes?.length) {
      clientChanges.deletes.forEach((id) => {
        const serverItem = serverChanges.find((i) => i.id === id);
        if (serverItem) {
          conflicts.push({
            type: ConflictType.DELETE,
            clientVersion: null,
            serverVersion: toKeepingResponse(serverItem),
            conflictSince: serverItem.updateTime.toISOString(),
          });
        }
      });
    }

    // 检测更新冲突：双方都改了同一条记录，且服务端版本更新
    if (clientChanges.updates?.length) {
      clientChanges.updates.forEach((update) => {
        const serverItem = serverChanges.find((i) => i.id === update.id);
        if (serverItem && new Date(serverItem.updateTime) > new Date(update.updateTime)) {
          conflicts.push({
            type: ConflictType.UPDATE,
            clientVersion: update,
            serverVersion: toKeepingResponse(serverItem),
            conflictSince: serverItem.updateTime.toISOString(),
          });
        }
      });
    }

    return conflicts;
  }

  private applyResolutions(
    clientChanges: KeepingBatchDto,
    serverChanges: Keeping[],
    resolutions: ConflictResolution[],
  ): KeepingBatchDto {
    // 客户端已预先处理好数据格式
    const resolvedChanges = { ...clientChanges };

    resolutions.forEach((resolution) => {
      switch (resolution.type) {
        case ConflictType.UPDATE:
          if (resolution.strategy === 'server') {
            // 使用服务端版本，从客户端更新中移除
            resolvedChanges.updates = resolvedChanges.updates?.filter((item) => item.id !== resolution.resolvedData.id);
          } else if (resolution.strategy === 'merge') {
            // 使用合并后的数据
            const itemIndex = resolvedChanges.updates?.findIndex((item) => item.id === resolution.resolvedData.id);
            if (itemIndex !== undefined && itemIndex >= 0) {
              resolvedChanges.updates![itemIndex] = resolution.resolvedData;
            }
          }
          // client策略保持原样
          break;

        case ConflictType.DELETE:
          if (resolution.strategy === 'server') {
            // 使用服务端版本，取消删除
            resolvedChanges.deletes = resolvedChanges.deletes?.filter((id) => id !== resolution.resolvedData.id);
          }
          // client策略保持原样
          break;
      }
    });

    return resolvedChanges;
  }
}
