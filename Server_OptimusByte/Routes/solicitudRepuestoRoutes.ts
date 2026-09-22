import { Router } from "../Dependencies/dependencias.ts";
import {
    PostCrearSolicitudRepuesto,
    GetSolicitudesMecanico,
    GetSolicitudesPorOrden,
    GetDetalleSolicitud,
    PutAtenderSolicitud,
} from "../Controller/solicitudRepuestoController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const SolicitudRepuestoRouter = new Router();

SolicitudRepuestoRouter.post("/api/mecanico/solicitudes-repuesto", authMiddleware, permitirRoles("Mecanico"), PostCrearSolicitudRepuesto);
SolicitudRepuestoRouter.get("/api/mecanico/solicitudes-repuesto", authMiddleware, permitirRoles("Admin", "Mecanico"), GetSolicitudesMecanico);
SolicitudRepuestoRouter.get("/api/mecanico/ordenes/:id/solicitudes-repuesto", authMiddleware, permitirRoles("Admin", "Mecanico"), GetSolicitudesPorOrden);
SolicitudRepuestoRouter.get("/api/mecanico/solicitudes-repuesto/:id", authMiddleware, permitirRoles("Admin", "Mecanico"), GetDetalleSolicitud);
SolicitudRepuestoRouter.put("/api/mecanico/solicitudes-repuesto/:id/atender", authMiddleware, permitirRoles("Admin"), PutAtenderSolicitud);

export { SolicitudRepuestoRouter };
