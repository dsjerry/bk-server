import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Analysis } from 'src/analysis/entities/analysis.entity';

/**
 * 索引说明（MySQL 复合索引遵循最左前缀原则）：
 * - idx_keeping_user_update_time：同步接口 getChangesSince 按 createUserId 等值 + updateTime 范围查询，
 *   复合索引可以让两个条件都走索引；单独按 createUserId 过滤（如 getCurrentState）也能命中左前缀
 * - idx_keeping_user_local_id：同步时通过 (createUserId, localId) 反查新建记录，做 localId -> serverId 映射
 */
@Entity()
@Index('idx_keeping_user_update_time', ['createUserId', 'updateTime'])
@Index('idx_keeping_user_local_id', ['createUserId', 'localId'])
@Index('idx_keeping_user_create_time', ['createUserId', 'createTime'])
export class Keeping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  localId: string;

  @Column()
  createUserId: number;

  @Column()
  name: string;

  @Column()
  transactionType: number;

  @Column({ nullable: true })
  category: number;

  @Column()
  amount: number;

  /** 币种（人民币/港币/澳元…）。此前币种只编码在 name 字符串里，无法按币种统计 */
  @Column({ nullable: true })
  currency: string;

  /** 分类 tag 别名，逗号分隔（与客户端 tags 字段对应，如 "food,shop"） */
  @Column({ nullable: true })
  tags: string;

  /** 消费地点经纬度（客户端地图选点时上报，支持将来"附近消费"查询） */
  @Column({ type: 'double', nullable: true })
  longitude: number;

  @Column({ type: 'double', nullable: true })
  latitude: number;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  remark: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;

  /**
   * 软删除标记：TypeORM 会在 delete()/softDelete() 时写入当前时间，
   * 此后所有普通查询自动附加 `deleteAt IS NULL` 过滤已删除记录。
   * 注意同步场景需要 withDeleted 才能查到（见 SyncService.getChangesSince）
   */
  @DeleteDateColumn()
  deleteAt: Date;

  @OneToMany(() => Analysis, (analysis) => analysis.keeping)
  analysis: Analysis[];
}
