import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { AuthRouter } from "./Routes/authRoutes.ts";
import { ClienteRouter } from "./Routes/clienteRoutes.ts";
import { UsuarioRouter } from "./Routes/usuarioRoutes.ts";
import { VehiculoRouter } from "./Routes/vehiculoRoutes.ts";
import { OrdenRouter } from "./Routes/ordenRoutes.ts";
import { SolicitudRepuestoRouter } from "./Routes/solicitudRepuestoRoutes.ts";

const app = new Application();

app.use(
  oakCors({
    origin: "*",
  }),
);

const routes = [AuthRouter , ClienteRouter, UsuarioRouter, VehiculoRouter, OrdenRouter, SolicitudRepuestoRouter];


routes.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = 8002;

console.log(`Servidor OptimusByte sistema corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });