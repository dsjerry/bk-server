import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';
import { File as FileEntity } from 'src/entity';

/**
 * username 唯一索引：注册查重和登录查询都按 username 检索。
 * 之前唯一性只靠 Service 层先查后插保证，并发下存在竞态；索引交给数据库兜底。
 * 注意：如果存量数据里已有重复 username，建索引会失败，需先人工去重。
 */
@Entity()
@Index('idx_user_username_unique', ['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  age: number;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createTime: Date;

  @Column({ nullable: true })
  avatar?: string;

  @OneToMany(() => FileEntity, (file) => file.user)
  files: FileEntity[];
}
