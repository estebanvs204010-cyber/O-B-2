import { Router } from "../Dependencies/dependencias.ts";
import {
  GetConfiguracionWompi,
  PostCrearSesionPago,
  PostVerificarPago,
  PostWebhookWompi,
} from "../Controller/wompiController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const WompiRouter = new Router();

// Configuración pública de Wompi (clave pública y ambiente)
WompiRouter.get("/api/pagos/wompi/config", GetConfiguracionWompi);

// Iniciar sesión y generar firma de integridad para compra en línea
WompiRouter.post(
  "/api/pagos/wompi/crear-sesion",
  authMiddleware,
  permitirRoles("Cliente"),
  PostCrearSesionPago,
);

// Verificar y sincronizar estado de transacción con Wompi
WompiRouter.post(
  "/api/pagos/wompi/verificar",
  authMiddleware,
  permitirRoles("Cliente", "Admin"),
  PostVerificarPago,
);

// Webhook oficial de eventos de Wompi (público para recibir notificaciones del servidor de Wompi)
WompiRouter.post("/api/pagos/wompi/webhook", PostWebhookWompi);

export { WompiRouter };
