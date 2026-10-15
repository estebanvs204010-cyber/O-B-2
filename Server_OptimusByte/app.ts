import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { AuthRouter } from "./Routes/authRoutes.ts";
import { ClienteRouter } from "./Routes/clienteRoutes.ts";
import { UsuarioRouter } from "./Routes/usuarioRoutes.ts";
import { VehiculoRouter } from "./Routes/vehiculoRoutes.ts";
import { OrdenRouter } from "./Routes/ordenRoutes.ts";
import { SolicitudRepuestoRouter } from "./Routes/solicitudRepuestoRoutes.ts";
import { MecanicoPanelRouter } from "./Routes/mecanicoPanelRoutes.ts";
import { UploadRouter } from "./Routes/uploadRoutes.ts";
import { RepuestoRouter } from "./Routes/repuestoRoutes.ts";

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
  UsuarioRouter,
  VehiculoRouter,
  OrdenRouter,
  SolicitudRepuestoRouter,
  MecanicoPanelRouter,
  UploadRouter,
  RepuestoRouter,
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
