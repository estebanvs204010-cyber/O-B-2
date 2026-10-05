import { Router } from "../Dependencies/dependencias.ts";
import {
    GetOrdenesMecanico,
    GetVehiculosMecanico,
    GetDetalleOrden,
    PutCambiarEstadoOrden,
    PutTiempoEstimadoOrden,
} from "../Controller/ordenController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const OrdenRouter = new Router();

OrdenRouter.get("/api/mecanico/ordenes", authMiddleware, permitirRoles("Admin", "Mecanico"), GetOrdenesMecanico);
OrdenRouter.get("/api/mecanico/vehiculos", authMiddleware, permitirRoles("Admin", "Mecanico"), GetVehiculosMecanico);
OrdenRouter.get("/api/mecanico/ordenes/:id", authMiddleware, permitirRoles("Admin", "Mecanico"), GetDetalleOrden);
OrdenRouter.put("/api/mecanico/ordenes/:id/estado", authMiddleware, permitirRoles("Admin", "Mecanico"), PutCambiarEstadoOrden);
OrdenRouter.put("/api/mecanico/ordenes/:id/tiempo-estimado", authMiddleware, permitirRoles("Admin", "Mecanico"), PutTiempoEstimadoOrden);

export { OrdenRouter };
