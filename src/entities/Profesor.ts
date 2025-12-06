import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Usuario } from "./Usuario";

@Entity({ name: "profesor" })
export class Profesor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @Column({ name: "apellido_paterno" })
  apellidoPaterno!: string;

  @Column({ name: "apellido_materno", nullable: true })
  apellidoMaterno!: string | null;

  @Column()
  correo!: string;

  @Column({ name: "num_empleado", unique: true })
  numEmpleado!: number;

  @OneToOne(() => Usuario, (usuario) => usuario.profesor, { eager: true })
  @JoinColumn({ name: "usuario_id" })
  usuario!: Usuario;
}
