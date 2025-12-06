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

  @Column({ type: "varchar" })
  nombre!: string;

  @Column({ name: "apellido_paterno", type: "varchar" })
  apellidoPaterno!: string;

  @Column({
    name: "apellido_materno",
    type: "varchar",
    nullable: true,
  })
  apellidoMaterno!: string | null; // ← importante: string | null

  @Column({ type: "varchar" })
  correo!: string;

  @Column({ name: "num_empleado", type: "int", unique: true })
  numEmpleado!: number;

  @OneToOne(() => Usuario, (usuario) => usuario.profesor, { eager: true })
  @JoinColumn({ name: "usuario_id" })
  usuario!: Usuario;
}
