import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";
import {
  GetOrdenesAdmin,
  PatchAsignarMecanicoOrden,
  PostCrearOrdenAdmin,
} from "../Controller/adminOrdenController.ts";

const AdminOrdenRouter = new Router();
const soloAdmin = [authMiddleware, permitirRoles("Admin")];

AdminOrdenRouter.get("/api/admin/ordenes", ...soloAdmin, GetOrdenesAdmin);
AdminOrdenRouter.post("/api/admin/ordenes", ...soloAdmin, PostCrearOrdenAdmin);
AdminOrdenRouter.patch("/api/admin/ordenes/:id/asignacion", ...soloAdmin, PatchAsignarMecanicoOrden);

export { AdminOrdenRouter };
