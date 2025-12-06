import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from "typeorm";
import { Usuario } from "./Usuario";

@Entity({ name: "rol" })
export class Rol {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  nombre!: string;

  @ManyToMany(() => Usuario, (usuario) => usuario.roles)
  usuarios!: Usuario[];
}
