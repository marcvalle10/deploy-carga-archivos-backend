import { AppDataSource } from "../config/data-source";
import { Usuario } from "../entities/Usuario";
import { Profesor } from "../entities/Profesor";
import { Rol } from "../entities/Rol";
import { UserDirectoryDto } from "../dto/UserDirectoryDto";
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export class UserService {
  private usuarioRepo = AppDataSource.getRepository(Usuario);
  private profesorRepo = AppDataSource.getRepository(Profesor);
  private rolRepo = AppDataSource.getRepository(Rol);

  private mapProfesorToDto(p: Profesor): UserDirectoryDto {
    const usuario = p.usuario;
    const primaryRol = usuario.roles?.[0] ?? null;

    const nombreCompleto = [p.nombre, p.apellidoPaterno, p.apellidoMaterno]
      .filter(Boolean)
      .join(" ");

    return {
      id: p.id,
      profesorId: p.id,
      usuarioId: usuario.id,
      nombre: nombreCompleto,
      email: p.correo,
      numEmpleado: p.numEmpleado,
      rolId: primaryRol ? primaryRol.id : null,
      rol: primaryRol ? primaryRol.nombre : null,
    };
  }

  async getAllUsers(): Promise<UserDirectoryDto[]> {
    const profesores = await this.profesorRepo.find({
      relations: ["usuario", "usuario.roles"],
      order: { id: "ASC" },
    });
    return profesores.map((p) => this.mapProfesorToDto(p));
  }

  async getRoles(): Promise<Rol[]> {
    return this.rolRepo.find({ order: { id: "ASC" } });
  }

  async createUser(input: {
    nombreCompleto: string;
    correo: string;
    numEmpleado: number;
    rolId: number;
    passwordPlain?: string; // opcional, si no se manda usamos numEmpleado
  }): Promise<UserDirectoryDto> {
    const { nombreCompleto, correo, numEmpleado, rolId, passwordPlain } = input;

    const partes = nombreCompleto.trim().split(/\s+/);
    const nombre = partes[0];
    const apellidoPaterno = partes[1] ?? "";
    const apellidoMaterno = partes.slice(2).join(" ") || null;

    // 1) Crear usuario
    const password = passwordPlain ?? String(numEmpleado);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const usuario = this.usuarioRepo.create({
      email: correo,
      passwordHash,
      activo: true,
    });
    await this.usuarioRepo.save(usuario);

    // 2) Crear profesor
    const profesor = this.profesorRepo.create({
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      correo,
      numEmpleado,
      usuario,
    });
    await this.profesorRepo.save(profesor);

    // 3) Asignar rol
    const rol = await this.rolRepo.findOneByOrFail({ id: rolId });
    usuario.roles = [rol];
    await this.usuarioRepo.save(usuario);

    // 4) Reload profesor con relaciones
    const recargado = await this.profesorRepo.findOneOrFail({
      where: { id: profesor.id },
      relations: ["usuario", "usuario.roles"],
    });

    return this.mapProfesorToDto(recargado);
  }

  async updateUser(input: {
    profesorId: number;
    usuarioId: number;
    nombreCompleto: string;
    correo: string;
    numEmpleado: number;
    rolId: number;
  }): Promise<UserDirectoryDto> {
    const { profesorId, usuarioId, nombreCompleto, correo, numEmpleado, rolId } = input;

    const profesor = await this.profesorRepo.findOneOrFail({
      where: { id: profesorId },
      relations: ["usuario", "usuario.roles"],
    });

    const usuario = await this.usuarioRepo.findOneOrFail({
      where: { id: usuarioId },
      relations: ["roles"],
    });

    const partes = nombreCompleto.trim().split(/\s+/);
    profesor.nombre = partes[0];
    profesor.apellidoPaterno = partes[1] ?? "";
    profesor.apellidoMaterno = partes.slice(2).join(" ") || null;
    profesor.correo = correo;
    profesor.numEmpleado = numEmpleado;
    await this.profesorRepo.save(profesor);

    usuario.email = correo;
    const rol = await this.rolRepo.findOneByOrFail({ id: rolId });
    usuario.roles = [rol];
    await this.usuarioRepo.save(usuario);

    const recargado = await this.profesorRepo.findOneOrFail({
      where: { id: profesorId },
      relations: ["usuario", "usuario.roles"],
    });

    return this.mapProfesorToDto(recargado);
  }

  async updateUserRole(usuarioId: number, rolId: number): Promise<UserDirectoryDto> {
    const usuario = await this.usuarioRepo.findOneOrFail({
      where: { id: usuarioId },
      relations: ["profesor", "roles"],
    });

    const rol = await this.rolRepo.findOneByOrFail({ id: rolId });
    usuario.roles = [rol];
    await this.usuarioRepo.save(usuario);

    const profesor = await this.profesorRepo.findOneOrFail({
      where: { id: usuario.profesor.id },
      relations: ["usuario", "usuario.roles"],
    });

    return this.mapProfesorToDto(profesor);
  }

  async deleteUser(usuarioId: number): Promise<void> {
    const usuario = await this.usuarioRepo.findOneOrFail({
      where: { id: usuarioId },
      relations: ["profesor"],
    });

    if (usuario.profesor) {
      await this.profesorRepo.delete(usuario.profesor.id);
    }

    await this.usuarioRepo.remove(usuario);
  }
}
