import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

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
}
