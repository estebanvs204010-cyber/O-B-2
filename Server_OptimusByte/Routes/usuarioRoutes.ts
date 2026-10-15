import { Router } from "../Dependencies/dependencias.ts";
import {
    PostCrearMecanico,
    GetMecanicos,
    GetMecanicoPorId,
    PutEditarMecanico,
    DeleteMecanico,
    PutCambiarEstadoMecanico,
} from "../Controller/usuarioController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const UsuarioRouter = new Router();

UsuarioRouter.post("/api/usuarios/mecanico", authMiddleware, permitirRoles("Admin"), PostCrearMecanico);
UsuarioRouter.get("/api/usuarios/mecanico", authMiddleware, permitirRoles("Admin"), GetMecanicos);
UsuarioRouter.get(
    "/api/usuarios/mecanico/:id",
    authMiddleware,
    permitirRoles("Admin"),
    GetMecanicoPorId,
);

UsuarioRouter.put(
    "/api/usuarios/mecanico/:id",
    authMiddleware,
    permitirRoles("Admin"),
    PutEditarMecanico,
);

UsuarioRouter.delete(
    "/api/usuarios/mecanico/:id",
    authMiddleware,
    permitirRoles("Admin"),
    DeleteMecanico,
);

UsuarioRouter.put(
    "/api/usuarios/mecanico/:id/estado",
    authMiddleware,
    permitirRoles("Admin"),
    PutCambiarEstadoMecanico,
);
// Aquí más adelante: PUT /api/usuarios/:id/activo (activar/desactivar), etc. dddf

export { UsuarioRouter };