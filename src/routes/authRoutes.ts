// src/routes/authRoutes.ts
import { Router } from "express";
import { loginController } from "../controllers/authController";

const router = Router();

// POST /auth/login
router.post("/login", loginController);

export default router;
