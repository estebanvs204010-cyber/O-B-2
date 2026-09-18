import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { AuthRouter } from "./Routes/authRoutes.ts";

const app = new Application();

app.use(
  oakCors({
    origin: "*",
  }),
);

const routes = [AuthRouter];

routes.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = 8002;

console.log(`Servidor OptimusByte corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });