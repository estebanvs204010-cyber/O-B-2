import { Router } from "../Dependencies/dependencias.ts";
import {
  GetDashboardMecanico,
  GetEvidenciasOrden,
  GetHistorialOrden,
  GetPerfilMecanico,
  GetRepuestosDisponibles,
  PostEvidenciaOrden,
  PostRepuestoUsado,
  PutInformeOrden,
} from "../Controller/mecanicoPanelController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const MecanicoPanelRouter = new Router();

MecanicoPanelRouter.get(
  "/api/mecanico/dashboard",
  authMiddleware,
  permitirRoles("Mecanico"),
  GetDashboardMecanico,
);
MecanicoPanelRouter.get(
  "/api/mecanico/perfil",
  authMiddleware,
  permitirRoles("Mecanico"),
  GetPerfilMecanico,
);
MecanicoPanelRouter.get(
  "/api/mecanico/repuestos-disponibles",
  authMiddleware,
  permitirRoles("Mecanico"),
  GetRepuestosDisponibles,
);
MecanicoPanelRouter.get(
  "/api/mecanico/ordenes/:id/historial",
  authMiddleware,
  permitirRoles("Admin", "Mecanico"),
  GetHistorialOrden,
);
MecanicoPanelRouter.put(
  "/api/mecanico/ordenes/:id/informe",
  authMiddleware,
  permitirRoles("Mecanico"),
  PutInformeOrden,
);
MecanicoPanelRouter.get(
  "/api/mecanico/ordenes/:id/evidencias",
  authMiddleware,
  permitirRoles("Admin", "Mecanico"),
  GetEvidenciasOrden,
);
MecanicoPanelRouter.post(
  "/api/mecanico/ordenes/:id/evidencias",
  authMiddleware,
  permitirRoles("Mecanico"),
  PostEvidenciaOrden,
);
MecanicoPanelRouter.post(
  "/api/mecanico/ordenes/:id/repuestos",
  authMiddleware,
  permitirRoles("Mecanico"),
  PostRepuestoUsado,
);

export { MecanicoPanelRouter };
