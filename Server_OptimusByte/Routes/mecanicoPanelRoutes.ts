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
const mecanico = [authMiddleware, permitirRoles("Mecanico")];
const mecanicoYAdmin = [authMiddleware, permitirRoles("Admin", "Mecanico")];

MecanicoPanelRouter.get(
  "/api/mecanico/dashboard",
  ...mecanico,
  GetDashboardMecanico,
);
MecanicoPanelRouter.get("/api/mecanico/perfil", ...mecanico, GetPerfilMecanico);
MecanicoPanelRouter.get(
  "/api/mecanico/repuestos-disponibles",
  ...mecanico,
  GetRepuestosDisponibles,
);
MecanicoPanelRouter.get(
  "/api/mecanico/ordenes/:id/historial",
  ...mecanicoYAdmin,
  GetHistorialOrden,
);
MecanicoPanelRouter.put(
  "/api/mecanico/ordenes/:id/informe",
  ...mecanico,
  PutInformeOrden,
);
MecanicoPanelRouter.get(
  "/api/mecanico/ordenes/:id/evidencias",
  ...mecanicoYAdmin,
  GetEvidenciasOrden,
);
MecanicoPanelRouter.post(
  "/api/mecanico/ordenes/:id/evidencias",
  ...mecanico,
  PostEvidenciaOrden,
);
MecanicoPanelRouter.post(
  "/api/mecanico/ordenes/:id/repuestos",
  ...mecanico,
  PostRepuestoUsado,
);

export { MecanicoPanelRouter };
