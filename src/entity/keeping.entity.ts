import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Analysis } from "src/analysis/entities/analysis.entity";

@Entity()
export class Keeping {
    @PrimaryGeneratedColumn()
    id: number;

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

    @OneToMany(() => Analysis, (analysis) => analysis.keeping)
    analysis: Analysis[];
}
