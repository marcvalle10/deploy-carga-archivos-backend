import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Profesor } from "./Profesor";
import { Rol } from "./Rol";

@Entity({ name: "usuario" })
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ name: "password_hash" })
  passwordHash!: string;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;

  @UpdateDateColumn({ name: "actualizado_en" })
  actualizadoEn!: Date;

  // Relación 1-1 con profesor
  @OneToOne(() => Profesor, (profesor) => profesor.usuario)
  profesor!: Profesor;

  // Relación con roles vía tabla usuario_rol
  @ManyToMany(() => Rol, (rol) => rol.usuarios)
  @JoinTable({
    name: "usuario_rol",
    joinColumn: { name: "usuario_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "rol_id", referencedColumnName: "id" },
  })
  roles!: Rol[];
}
