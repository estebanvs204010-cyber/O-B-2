import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware } from "../Middlewares/validarJWT.ts";
import {
  GetContadorNotificaciones,
  GetNotificaciones,
  PatchMarcarLeida,
  PatchMarcarTodasLeidas,
} from "../Controller/notificacionController.ts";

const NotificacionRouter = new Router();

// Cualquier usuario autenticado ve SUS propias notificaciones (cliente o admin)
NotificacionRouter.get("/api/notificaciones", authMiddleware, GetNotificaciones);
NotificacionRouter.get("/api/notificaciones/contador", authMiddleware, GetContadorNotificaciones);
NotificacionRouter.patch("/api/notificaciones/leer-todas", authMiddleware, PatchMarcarTodasLeidas);
NotificacionRouter.patch("/api/notificaciones/:id/leer", authMiddleware, PatchMarcarLeida);

export { NotificacionRouter };
