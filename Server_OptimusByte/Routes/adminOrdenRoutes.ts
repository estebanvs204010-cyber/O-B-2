import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";
import {
  GetOrdenesAdmin,
  PatchAsignarMecanicoOrden,
  PostCrearOrdenAdmin,
} from "../Controller/adminOrdenController.ts";

const AdminOrdenRouter = new Router();

AdminOrdenRouter.get(
  "/api/admin/ordenes",
  authMiddleware,
  permitirRoles("Admin"),
  GetOrdenesAdmin,
);
AdminOrdenRouter.post(
  "/api/admin/ordenes",
  authMiddleware,
  permitirRoles("Admin"),
  PostCrearOrdenAdmin,
);
AdminOrdenRouter.patch(
  "/api/admin/ordenes/:id/asignacion",
  authMiddleware,
  permitirRoles("Admin"),
  PatchAsignarMecanicoOrden,
);

export { AdminOrdenRouter };
