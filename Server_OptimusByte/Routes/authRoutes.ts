import { Router } from "../Dependencies/dependencias.ts";
import { PostLogin, PostSolicitarRecuperacion, PostRestablecerPassword } from "../Controller/authController.ts";
import { PostRegistroCliente } from "../Controller/clienteController.ts";

const AuthRouter = new Router();

AuthRouter.post("/api/auth/login", PostLogin);
AuthRouter.post("/api/auth/solicitar-recuperacion", PostSolicitarRecuperacion);
AuthRouter.post("/api/auth/restablecer-password", PostRestablecerPassword);
AuthRouter.post("/api/auth/registro-cliente", PostRegistroCliente);

export { AuthRouter };