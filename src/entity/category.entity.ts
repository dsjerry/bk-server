import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Keeping } from "./keeping.entity";

@Entity('category')
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    icon: string;

    @OneToMany(() => Keeping, keeping => keeping.category)
    keepings: Keeping[];
}