import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

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
}
