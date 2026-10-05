import { Router } from "../Dependencies/dependencias.ts";
import {
    PostRegistroCliente,
    PostCrearClienteAdmin,
    GetClientes,
    GetClientePorId,
    PutEditarCliente,
    DeleteCliente,
} from "../Controller/clienteController.ts";
import {
    authMiddleware,
    permitirRoles,
} from "../Middlewares/validarJWT.ts";

const ClienteRouter = new Router();

// Registro publico de clientes.
// No lleva authMiddleware porque el usuario aun no tiene una cuenta.
ClienteRouter.post(
    "/api/auth/registro-cliente",
    PostRegistroCliente,
);

// Crear cliente sin cuenta de acceso: solo Admin.
ClienteRouter.post(
    "/api/clientes",
    authMiddleware,
    permitirRoles("Admin"),
    PostCrearClienteAdmin,
);

// Listar clientes: Admin o Mecanico.
ClienteRouter.get(
    "/api/clientes",
    authMiddleware,
    permitirRoles("Admin", "Mecanico"),
    GetClientes,
);

// Consultar un cliente: Admin o Mecanico.
ClienteRouter.get(
    "/api/clientes/:id",
    authMiddleware,
    permitirRoles("Admin", "Mecanico"),
    GetClientePorId,
);

// Editar cliente: solo Admin.
ClienteRouter.put(
    "/api/clientes/:id",
    authMiddleware,
    permitirRoles("Admin"),
    PutEditarCliente,
);

// Desactivar cliente: solo Admin.
ClienteRouter.delete(
    "/api/clientes/:id",
    authMiddleware,
    permitirRoles("Admin"),
    DeleteCliente,
);

export { ClienteRouter };
