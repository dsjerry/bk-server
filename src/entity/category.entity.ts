import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn, OneToMany } from 'typeorm';
import { Keeping } from './keeping.entity';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  /** 创建者；NULL 表示全局共享分类（如内置分类），查询时与用户自有分类一起返回 */
  @Column({ type: 'double', nullable: true })
  createUserId: number;

  /** 软删除标记：查询自动过滤 deleteAt 非空的记录 */
  @DeleteDateColumn()
  deleteAt: Date;

  @OneToMany(() => Keeping, (keeping) => keeping.category)
  keepings: Keeping[];
}
