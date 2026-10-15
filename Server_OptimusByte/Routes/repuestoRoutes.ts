import { Router } from "../Dependencies/dependencias.ts";
import {
    GetRepuestoPorId,
    GetRepuestos,
    PostCrearRepuesto,
    PutEditarRepuesto,
    PutEstadoRepuesto,
    PutImagenPredeterminadaCategoria,
} from "../Controller/repuestoController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const RepuestoRouter = new Router();

RepuestoRouter.get("/api/admin/repuestos", authMiddleware, permitirRoles("Admin"), GetRepuestos);
RepuestoRouter.get("/api/admin/repuestos/:id", authMiddleware, permitirRoles("Admin"), GetRepuestoPorId);
RepuestoRouter.post("/api/admin/repuestos", authMiddleware, permitirRoles("Admin"), PostCrearRepuesto);
RepuestoRouter.put(
    "/api/admin/repuestos/imagen-categoria",
    authMiddleware,
    permitirRoles("Admin"),
    PutImagenPredeterminadaCategoria,
);
RepuestoRouter.put("/api/admin/repuestos/:id", authMiddleware, permitirRoles("Admin"), PutEditarRepuesto);
RepuestoRouter.put(
    "/api/admin/repuestos/:id/estado",
    authMiddleware,
    permitirRoles("Admin"),
    PutEstadoRepuesto,
);

export { RepuestoRouter };
