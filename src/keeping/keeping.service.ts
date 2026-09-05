import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, Brackets } from 'typeorm';
import { Keeping } from 'src/entity/keeping.entity';
import { KeepingCreateDto, KeepingUpdateDto, KeepingBatchDto, KeepingFilterDto } from 'src/dto/keeping.dto';

@Injectable()
export class KeepingService {
  private readonly logger = new Logger(KeepingService.name);

  constructor(
    @InjectRepository(Keeping)
    private keepingRepository: Repository<Keeping>,
    private dataSource: DataSource,
  ) {}

  /**
   * 分页查询当前用户的记账，支持服务端过滤（关键字/交易类型/分类 tag/时间区间）。
   * 只查自己的数据：记账是私密数据，此前 findAll 返回所有用户记录属于越权，已修复
   */
  async findAll(filterDto: KeepingFilterDto, userId: number) {
    const { page, limit, keyword, transactionType, tag, startDate, endDate } = filterDto;

    const qb = this.keepingRepository
      .createQueryBuilder('keeping')
      .where('keeping.createUserId = :userId', { userId })
      .orderBy('keeping.createTime', 'DESC');

    if (keyword) {
      // OR 组合放进 Brackets，避免与外层 AND 条件混淆优先级
      const kw = `%${keyword}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('keeping.name LIKE :kw', { kw })
            .orWhere('keeping.remark LIKE :kw', { kw })
            .orWhere('keeping.position LIKE :kw', { kw });
        }),
      );
    }
    if (transactionType !== undefined && transactionType !== null) {
      qb.andWhere('keeping.transactionType = :type', { type: transactionType });
    }
    if (tag) {
      // tags 是逗号分隔的别名串（"food,shop"），FIND_IN_SET 才能精确匹配单个 tag
      qb.andWhere('FIND_IN_SET(:tag, keeping.tags)', { tag });
    }
    if (startDate) {
      qb.andWhere('keeping.createTime >= :startDate', { startDate });
    }
    if (endDate) {
      // 结束日期按"当天"理解：加一天开区间，列上不做函数包裹，保证索引可用
      qb.andWhere('keeping.createTime < DATE_ADD(:endDate, INTERVAL 1 DAY)', { endDate });
    }

    if (page && limit) {
      const [items, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      return { items, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
    }
    const items = await qb.getMany();
    return { items, meta: { total: items.length } };
  }

  /**
   * 查单条。传入 userId 时校验属主：非本人的记录等同不存在
   * （既防越权读取，也避免给调用方暴露"这条 id 存在但不是你的"这种信息）
   */
  findOne(id: number, userId?: number): Promise<Keeping | null> {
    const where = userId ? { id, createUserId: userId } : { id };
    return this.keepingRepository.findOne({ where });
  }

  create(keepingDto: KeepingCreateDto, createUserId: number): Promise<Keeping> {
    return this.doCreate(this.dataSource.manager, keepingDto, createUserId);
  }

  async update(keepingDto: KeepingUpdateDto, createUserId: number): Promise<Keeping | null> {
    return this.doUpdate(this.dataSource.manager, keepingDto, createUserId);
  }

  async delete(id: number, userId: number) {
    const deleted = await this.doDelete(this.dataSource.manager, id, userId);
    if (!deleted) {
      throw new NotFoundException('删除失败，记录不存在');
    }
    return '删除成功';
  }

  /**
   * 批量操作（同步协议的落库入口）。
   *
   * 整个批次包在一个数据库事务里：任何一步失败，已执行的操作全部回滚，保证原子性。
   * 之前的实现逐条 try/catch 吞掉错误，部分成功部分失败会让客户端与服务端状态
   * 不一致且难以恢复；改为事务后要么全部生效，要么全部不生效。
   *
   * 对"目标记录不存在/不属于自己"做了幂等容错（见 doDelete/doUpdate）：
   * 客户端可能拿着过期数据来同步（该记录已被其他设备删除），
   * 这类情况跳过即可，如果让整个事务失败，客户端这笔过期数据会永远卡住同步。
   */
  async batchOperation(body: KeepingBatchDto, createUserId: number) {
    return this.dataSource.transaction(async (manager) => {
      const result = {
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      };

      if (body.deletes?.length) {
        for (const id of body.deletes) {
          if (await this.doDelete(manager, id, createUserId)) {
            result.deletedCount++;
          }
        }
      }

      if (body.updates?.length) {
        for (const item of body.updates) {
          if (await this.doUpdate(manager, item, createUserId)) {
            result.updatedCount++;
          }
        }
      }

      if (body.creates?.length) {
        for (const item of body.creates) {
          await this.doCreate(manager, item, createUserId);
          result.createdCount++;
        }
      }

      return result;
    });
  }

  /**
   * 以下 doXxx 是真正的写操作，统一接收 EntityManager：
   * 单条调用传 dataSource.manager（普通自动提交连接），
   * 批量调用传事务 manager —— 保证所有语句跑在同一个事务连接上。
   */
  private doCreate(manager: EntityManager, keepingDto: KeepingCreateDto, createUserId: number): Promise<Keeping> {
    const keeping = this.keepingRepository.create({ ...keepingDto, createUserId });
    return manager.save(keeping);
  }

  /**
   * 只写 DTO 里实际传入的字段。不能像旧实现那样整实体 spread 进 update()，
   * 否则会把 createTime / deleteAt 一起写回（甚至把软删除的记录"复活"）。
   * updateTime 也刻意不写：交给数据库 ON UPDATE CURRENT_TIMESTAMP 打服务端时间，
   * 这样其他设备按 updateTime 增量同步时一定能拉到这次变更。
   *
   * 安全：属主校验 + 不写 createUserId。旧实现会把 createUserId 覆写成调用者，
   * 等于允许任何人把别人的记录"改姓"，已修复
   */
  private async doUpdate(
    manager: EntityManager,
    keepingDto: KeepingUpdateDto,
    createUserId: number,
  ): Promise<Keeping | null> {
    const current = await manager.findOne(Keeping, { where: { id: keepingDto.id } });
    if (!current) {
      // 已被其他设备删除（软删除后 findOne 查不到）→ 跳过并留痕，见 batchOperation 注释
      this.logger.warn(`更新跳过：记账 ${keepingDto.id} 不存在（可能已被其他设备删除）`);
      return null;
    }
    if (current.createUserId !== createUserId) {
      // 越权防护：别人的记录对当前用户等同不存在
      this.logger.warn(`更新拒绝：记账 ${keepingDto.id} 不属于用户 ${createUserId}`);
      return null;
    }

    // _updateTime/_owner 仅用于解构剔除
    const { id, updateTime: _updateTime, ...fields } = keepingDto;
    await manager.update(Keeping, id, fields);
    return manager.findOne(Keeping, { where: { id } });
  }

  /** 软删除：只置 deleteAt 时间戳，不物理删行；不存在或非本人时返回 false（幂等 + 越权防护） */
  private async doDelete(manager: EntityManager, id: number, createUserId: number): Promise<boolean> {
    const current = await manager.findOne(Keeping, { where: { id } });
    if (!current) {
      return false;
    }
    if (current.createUserId !== createUserId) {
      this.logger.warn(`删除拒绝：记账 ${id} 不属于用户 ${createUserId}`);
      return false;
    }
    const result = await manager.softDelete(Keeping, id);
    return (result.affected ?? 0) > 0;
  }
}
