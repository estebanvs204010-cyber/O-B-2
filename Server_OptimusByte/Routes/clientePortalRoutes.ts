import { Router } from "../Dependencies/dependencias.ts";
import {
    GetMiPerfilCliente,
    PutActualizarMiPerfil,
    GetMisVehiculos,
    PostRegistrarMiVehiculo,
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

ClientePortalRouter.put(
    "/api/cliente/me",
    authMiddleware,
    permitirRoles("Cliente"),
    PutActualizarMiPerfil,
);

ClientePortalRouter.post(
    "/api/cliente/mis-vehiculos",
    authMiddleware,
    permitirRoles("Cliente"),
    PostRegistrarMiVehiculo,
);

ClientePortalRouter.get(
    "/api/cliente/mis-vehiculos",
    authMiddleware,
    permitirRoles("Cliente"),
    GetMisVehiculos,
);

export { ClientePortalRouter };
