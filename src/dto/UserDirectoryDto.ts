export interface UserDirectoryDto {
  id: number;          // id profesor
  profesorId: number;
  usuarioId: number;
  nombre: string;      // nombre completo
  email: string;
  numEmpleado: number;
  rolId: number | null;
  rol: string | null;
}