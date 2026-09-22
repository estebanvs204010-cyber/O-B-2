import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { AuthRouter } from "./Routes/authRoutes.ts";
import { ClienteRouter } from "./Routes/clienteRoutes.ts";
import { UsuarioRouter } from "./Routes/usuarioRoutes.ts";
import { VehiculoRouter } from "./Routes/vehiculoRoutes.ts";

const app = new Application();

app.use(
  oakCors({
    origin: "*",
  }),
);

const routes = [AuthRouter , ClienteRouter, UsuarioRouter, VehiculoRouter];


routes.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = 8002;

console.log(`Servidor OptimusByte lo mas gey del sistema corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });