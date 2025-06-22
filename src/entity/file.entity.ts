import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User as UserEntity } from "src/entity";

@Entity()
export class File {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    filename: string;

    @Column()
    originalname: string;

    @Column()
    size: number;

    @Column()
    mimetype: string;

    @Column({
        type: "varchar",
        length: 500,
        comment: "文件路径",
    })
    filepath: string;

    @ManyToOne((type) => UserEntity, (user) => user.files)
    user: UserEntity;

    @CreateDateColumn({
        type: 'datetime',
        precision: 6,
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    createTime?: Date;
}
