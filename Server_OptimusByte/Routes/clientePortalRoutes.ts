import { Router } from "../Dependencies/dependencias.ts";
import {
    GetMiPerfilCliente,
    GetMisVehiculos,
} from "../Controller/clientePortalController.ts";
import {
    authMiddleware,
    permitirRoles,
} from "../Middlewares/validarJWT.ts";

const ClientePortalRouter = new Router();

ClientePortalRouter.get(
    "/api/cliente/me",
    authMiddleware,
    permitirRoles("Cliente"),
    GetMiPerfilCliente,
);

ClientePortalRouter.get(
    "/api/cliente/mis-vehiculos",
    authMiddleware,
    permitirRoles("Cliente"),
    GetMisVehiculos,
);

export { ClientePortalRouter };
