import { Request, Response } from "express";
import { UserService } from "../services/UserService";

const userService = new UserService();

export class UserController {
  static async listUsers(req: Request, res: Response) {
    try {
      const users = await userService.getAllUsers();
      return res.json(users);
    } catch (err) {
      console.error("Error listUsers:", err);
      return res.status(500).json({ message: "Error al obtener usuarios" });
    }
  }

  static async listRoles(req: Request, res: Response) {
    try {
      const roles = await userService.getRoles();
      return res.json(roles);
    } catch (err) {
      console.error("Error listRoles:", err);
      return res.status(500).json({ message: "Error al obtener roles" });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { nombreCompleto, correo, numEmpleado, rolId, password } = req.body;

      if (!nombreCompleto || !correo || !numEmpleado || !rolId) {
        return res.status(400).json({ message: "Datos incompletos" });
      }

      const user = await userService.createUser({
        nombreCompleto,
        correo,
        numEmpleado: Number(numEmpleado),
        rolId: Number(rolId),
        passwordPlain: password,
      });

      return res.status(201).json(user);
    } catch (err) {
      console.error("Error createUser:", err);
      return res.status(500).json({ message: "Error al crear usuario" });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const profesorId = Number(req.params.id);
      const { usuarioId, nombreCompleto, correo, numEmpleado, rolId } = req.body;

      if (!usuarioId || !nombreCompleto || !correo || !numEmpleado || !rolId) {
        return res.status(400).json({ message: "Datos incompletos" });
      }

      const updated = await userService.updateUser({
        profesorId,
        usuarioId: Number(usuarioId),
        nombreCompleto,
        correo,
        numEmpleado: Number(numEmpleado),
        rolId: Number(rolId),
      });

      return res.json(updated);
    } catch (err) {
      console.error("Error updateUser:", err);
      return res.status(500).json({ message: "Error al actualizar usuario" });
    }
  }

  static async updateRole(req: Request, res: Response) {
    try {
      const usuarioId = Number(req.params.id);
      const { rolId } = req.body;
      if (!rolId) {
        return res.status(400).json({ message: "rolId es requerido" });
      }

      const updated = await userService.updateUserRole(usuarioId, Number(rolId));
      return res.json(updated);
    } catch (err) {
      console.error("Error updateRole:", err);
      return res.status(500).json({ message: "Error al actualizar rol" });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const usuarioId = Number(req.params.id);
      await userService.deleteUser(usuarioId);
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleteUser:", err);
      return res.status(500).json({ message: "Error al eliminar usuario" });
    }
  }
}
