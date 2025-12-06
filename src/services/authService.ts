// src/services/authService.ts
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/data-source"; // 🔁 AJUSTA ESTA RUTA SEGÚN TU PROYECTO

export type DbUserRow = {
  usuario_id: number;
  email: string;
  password_hash: string;
  activo: boolean;
  profesor_id: number | null;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  roles: string[] | null;
};

export type LoginResult =
  | {
      ok: true;
      user: {
        id: number;
        profesorId: number | null;
        email: string;
        nombre: string;
        roles: string[];
        appRoles: string[]; // roles válidos para este módulo
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
      roles?: string[];
    };

export async function loginService(
  email: string,
  password: string
): Promise<LoginResult> {
  if (!email || !password) {
    return {
      ok: false,
      status: 400,
      error: "Correo y contraseña obligatorios.",
    };
  }

  const query = `
    SELECT
      u.id AS usuario_id,
      u.email,
      u.password_hash,
      u.activo,
      p.id AS profesor_id,
      p.nombre,
      p.apellido_paterno,
      p.apellido_materno,
      ARRAY_REMOVE(ARRAY_AGG(r.nombre), NULL) AS roles
    FROM public.usuario u
    LEFT JOIN public.profesor p ON p.usuario_id = u.id
    LEFT JOIN public.usuario_rol ur ON ur.usuario_id = u.id
    LEFT JOIN public.rol r ON r.id = ur.rol_id
    WHERE u.email = $1
    GROUP BY u.id, p.id, p.nombre, p.apellido_paterno, p.apellido_materno
    LIMIT 1;
  `;

  const rows = (await AppDataSource.query(query, [email])) as DbUserRow[];

  if (!rows.length) {
    return {
      ok: false,
      status: 401,
      error: "Usuario o contraseña incorrectos.",
    };
  }

  const user = rows[0];

  if (!user.activo) {
    return {
      ok: false,
      status: 403,
      error: "Tu usuario está inactivo. Contacta al administrador.",
    };
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return {
      ok: false,
      status: 401,
      error: "Usuario o contraseña incorrectos.",
    };
  }

  const roles: string[] = (user.roles ?? []).filter(
    (r): r is string => Boolean(r)
  );

  const allowedRoles: string[] = roles.filter((r: string) =>
    ["ADMINISTRADOR", "COORDINADOR"].includes(r.toUpperCase())
  );

  if (allowedRoles.length === 0) {
    return {
      ok: false,
      status: 403,
      error: "No tienes permisos para acceder al módulo de Carga de Archivos.",
      roles,
    };
  }

  const nombreCompleto = [user.nombre, user.apellido_paterno, user.apellido_materno]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    ok: true,
    user: {
      id: user.usuario_id,
      profesorId: user.profesor_id,
      email: user.email,
      nombre: nombreCompleto || user.email,
      roles,
      appRoles: allowedRoles,
    },
  };
}
