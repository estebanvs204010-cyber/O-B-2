import { Router } from "../Dependencies/dependencias.ts";

import {
<<<<<<< HEAD
    GetMiPerfilCliente,
    PutActualizarMiPerfil,
    GetMisVehiculos,
    GetMisOrdenes,
    PostRegistrarMiVehiculo,
=======
  GetMiPerfilCliente,
  PutActualizarMiPerfil,
  PutActualizarFotoPerfil,
  GetMisVehiculos,
  PostRegistrarMiVehiculo,
>>>>>>> origin/Lucho
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

ClientePortalRouter.put(
  "/api/cliente/foto",
  authMiddleware,
  permitirRoles("Cliente"),
  PutActualizarFotoPerfil,
);

ClientePortalRouter.get(
  "/api/cliente/mis-vehiculos",
  authMiddleware,
  permitirRoles("Cliente"),
  GetMisVehiculos,
);

<<<<<<< HEAD
ClientePortalRouter.get(
  "/api/cliente/mis-ordenes",
  authMiddleware,
  permitirRoles("Cliente"),
  GetMisOrdenes,
);

export { ClientePortalRouter };
=======
ClientePortalRouter.post(
  "/api/cliente/mis-vehiculos",
  authMiddleware,
  permitirRoles("Cliente"),
  PostRegistrarMiVehiculo,
);

export { ClientePortalRouter };
>>>>>>> origin/Lucho
