// src/controllers/authController.ts
import { Request, Response } from "express";
import { loginService } from "../services/authService";

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    const result = await loginService(email ?? "", password ?? "");

    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        ...(result.roles ? { roles: result.roles } : {}),
      });
    }

    return res.status(200).json({
      message: "Bienvenido",
      user: result.user,
    });
  } catch (error) {
    console.error("Error en login (backend Carga-Archivos):", error);
    return res.status(500).json({
      error: "Error interno del servidor.",
    });
  }
}
