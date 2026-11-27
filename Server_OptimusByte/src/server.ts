import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { Application, oakCors } from "../Dependencies/dependencias.ts";
import { PaymentsRouter } from "./routes/payments.routes.ts";
import { AuthRouter } from "../Routes/authRoutes.ts";
import { ClienteRouter } from "../Routes/clienteRoutes.ts";
import { ClientePortalRouter } from "../Routes/clientePortalRoutes.ts";
import { UsuarioRouter } from "../Routes/usuarioRoutes.ts";
import { VehiculoRouter } from "../Routes/vehiculoRoutes.ts";
import { CitaRouter } from "../Routes/citaRoutes.ts";
import { MantenimientoRouter } from "../Routes/mantenimientoRoutes.ts";
import { NotificacionRouter } from "../Routes/notificacionRoutes.ts";
import { OrdenRouter } from "../Routes/ordenRoutes.ts";
import { SolicitudRepuestoRouter } from "../Routes/solicitudRepuestoRoutes.ts";
import { MecanicoPanelRouter } from "../Routes/mecanicoPanelRoutes.ts";
import { UploadRouter } from "../Routes/uploadRoutes.ts";
import { RepuestoRouter } from "../Routes/repuestoRoutes.ts";
import { AdminOrdenRouter } from "../Routes/adminOrdenRoutes.ts";
import { PedidoRepuestoRouter } from "../Routes/pedidoRepuestoRoutes.ts";
import { WompiRouter } from "../Routes/wompiRoutes.ts";

const app = new Application();

const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:4321";

// Configuración de CORS segura para frontend Astro y webhooks externos
app.use(
  oakCors({
    origin: (requestOrigin) => {
      if (!requestOrigin) return "*"; // Permite llamadas server-to-server como webhooks
      const originsPermitidos = [
        frontendUrl,
        "http://localhost:4321",
        "http://127.0.0.1:4321",
        "http://localhost:3000",
      ];
      if (originsPermitidos.includes(requestOrigin) || requestOrigin.startsWith("http://localhost:")) {
        return requestOrigin;
      }
      return "*";
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-event-checksum",
      "Accept",
      "X-Requested-With",
    ],
  }),
);

// Middleware de registro de peticiones
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

const routers = [
  PaymentsRouter,
  AuthRouter,
  ClienteRouter,
  ClientePortalRouter,
  UsuarioRouter,
  VehiculoRouter,
  CitaRouter,
  MantenimientoRouter,
  NotificacionRouter,
  OrdenRouter,
  SolicitudRepuestoRouter,
  MecanicoPanelRouter,
  UploadRouter,
  RepuestoRouter,
  AdminOrdenRouter,
  PedidoRepuestoRouter,
  WompiRouter,
];

routers.forEach((r) => {
  app.use(r.routes());
  app.use(r.allowedMethods());
});

const portEnv = Deno.env.get("PORT");
const PORT = portEnv ? Number(portEnv) : 8002;

console.log(`[OptimusByte Backend] Servidor activo en http://localhost:${PORT}`);
console.log(`[OptimusByte Backend] Wompi Payments API lista en http://localhost:${PORT}/api/payments`);

await app.listen({ port: PORT });
