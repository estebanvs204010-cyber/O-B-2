import { Router } from "../Dependencies/dependencias.ts";
import { PostCrearMecanico, GetMecanicos } from "../Controller/usuarioController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const UsuarioRouter = new Router();

UsuarioRouter.post("/api/usuarios/mecanico", authMiddleware, permitirRoles("Admin"), PostCrearMecanico);
UsuarioRouter.get("/api/usuarios/mecanico", authMiddleware, permitirRoles("Admin"), GetMecanicos);

// Aquí más adelante: PUT /api/usuarios/:id/activo (activar/desactivar), etc. dddf

export { UsuarioRouter };