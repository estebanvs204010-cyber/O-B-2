import { Router } from "../Dependencies/dependencias.ts";
import { PostLogin, PostSolicitarRecuperacion, PostRestablecerPassword } from "../Controller/authController.ts";

const AuthRouter = new Router();

AuthRouter.post("/api/auth/login", PostLogin);
AuthRouter.post("/api/auth/solicitar-recuperacion", PostSolicitarRecuperacion);
AuthRouter.post("/api/auth/restablecer-password", PostRestablecerPassword);

export { AuthRouter };