import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";
import { Keeping } from "src/entity";

@Entity()
export class Analysis {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'varchar',
        length: 100,
        comment: '名称'
    })
    name: string;

    @Column({
        type: 'text',
        comment: '内容'
    })
    content: string;

    @Column({
        type: 'text',
        comment: '分析过程',
        nullable: true
    })
    reasoningContent: string;

    @Column({
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
        comment: '创建时间'
    })
    createTime: Date;

    @Column({
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
        comment: '更新时间'
    })
    updateTime: Date;

    @ManyToOne(() => Keeping, (keeping) => keeping.analysis)
    keeping: Keeping;
}
