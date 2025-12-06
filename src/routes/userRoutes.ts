import { Router } from "express";
import { UserController } from "../controllers/UserController";

const router = Router();

// /admin/users
router.get("/users", UserController.listUsers);
router.post("/users", UserController.createUser);
router.put("/users/:id", UserController.updateUser);
router.delete("/users/:id", UserController.deleteUser);

// /admin/users/role
router.patch("/users/:id/role", UserController.updateRole);

// /admin/roles
router.get("/roles", UserController.listRoles);

export default router;
