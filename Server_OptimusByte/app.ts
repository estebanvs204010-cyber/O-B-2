import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { AuthRouter } from "./Routes/authRoutes.ts";
import { ClienteRouter } from "./Routes/clienteRoutes.ts";
import { ClientePortalRouter } from "./Routes/clientePortalRoutes.ts";
import { UsuarioRouter } from "./Routes/usuarioRoutes.ts";
import { VehiculoRouter } from "./Routes/vehiculoRoutes.ts";
import { CitaRouter } from "./Routes/citaRoutes.ts";
import { MantenimientoRouter } from "./Routes/mantenimientoRoutes.ts";
import { NotificacionRouter } from "./Routes/notificacionRoutes.ts";
import { OrdenRouter } from "./Routes/ordenRoutes.ts";
import { SolicitudRepuestoRouter } from "./Routes/solicitudRepuestoRoutes.ts";
import { MecanicoPanelRouter } from "./Routes/mecanicoPanelRoutes.ts";
<<<<<<< HEAD
import { UploadRouter } from "./Routes/uploadRoutes.ts";
import { RepuestoRouter } from "./Routes/repuestoRoutes.ts";
import { AdminOrdenRouter } from "./Routes/adminOrdenRoutes.ts";
=======
import { ClientePortalRouter } from "./Routes/clientePortalRoutes.ts";
>>>>>>> origin/Lucho

const app = new Application();

app.use(
  oakCors({
    origin: "http://localhost:4321",
    credentials: true,
  }),
);

const routes = [
  AuthRouter,
  ClienteRouter,
  ClientePortalRouter,
  UsuarioRouter,
  VehiculoRouter,
<<<<<<< HEAD
  CitaRouter,
  MantenimientoRouter,
  NotificacionRouter,
  OrdenRouter,
  SolicitudRepuestoRouter,
  MecanicoPanelRouter,
  UploadRouter,
  RepuestoRouter,
  AdminOrdenRouter,
=======
>>>>>>> origin/Lucho
];

routes.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = 8002;

console.log(
  `Servidor OptimusByte sistema corriendo en http://localhost:${PORT}`,
);
await app.listen({ port: PORT });
