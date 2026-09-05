import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, DeleteDateColumn } from 'typeorm';
import { Keeping } from 'src/entity';

@Entity()
export class Analysis {
  @PrimaryGeneratedColumn()
  id: number;

  /** 归属用户；分析记录是私密数据，查询一律按此过滤 */
  @Column({ type: 'double', nullable: true })
  createUserId: number;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '名称',
  })
  name: string;

  @Column({
    type: 'text',
    comment: '内容',
  })
  content: string;

  @Column({
    type: 'text',
    comment: '分析过程',
    nullable: true,
  })
  reasoningContent: string;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '创建时间',
  })
  createTime: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '更新时间',
  })
  updateTime: Date;

  /** 软删除标记：查询自动过滤 deleteAt 非空的记录 */
  @DeleteDateColumn()
  deleteAt: Date;

  @ManyToOne(() => Keeping, (keeping) => keeping.analysis)
  keeping: Keeping;
}
