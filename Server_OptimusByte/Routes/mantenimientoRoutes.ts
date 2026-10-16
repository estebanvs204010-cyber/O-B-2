import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";
import {
  GetMantenimientoDeVehiculo,
  PatchActualizarKm,
  PatchMarcarRealizado,
} from "../Controller/mantenimientoController.ts";

const MantenimientoRouter = new Router();

MantenimientoRouter.get(
  "/api/mantenimiento/vehiculos/:id",
  authMiddleware,
  GetMantenimientoDeVehiculo,
);
MantenimientoRouter.patch(
  "/api/mantenimiento/vehiculos/:id/km",
  authMiddleware,
  permitirRoles("Admin", "Mecanico"),
  PatchActualizarKm,
);
MantenimientoRouter.patch(
  "/api/mantenimiento/:id/realizado",
  authMiddleware,
  permitirRoles("Admin", "Mecanico"),
  PatchMarcarRealizado,
);

export { MantenimientoRouter };
