import { Router } from "../Dependencies/dependencias.ts";
import {
    PostCrearClienteAdmin,
    GetClientes,
    GetClientePorId,
    PutEditarCliente,
    DeleteCliente,
} from "../Controller/clienteController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const ClienteRouter = new Router();

ClienteRouter.post("/api/clientes", authMiddleware, permitirRoles("Admin"), PostCrearClienteAdmin);
ClienteRouter.get("/api/clientes", authMiddleware, permitirRoles("Admin", "Mecanico"), GetClientes);
ClienteRouter.get("/api/clientes/:id", authMiddleware, permitirRoles("Admin", "Mecanico"), GetClientePorId);
ClienteRouter.put("/api/clientes/:id", authMiddleware, permitirRoles("Admin"), PutEditarCliente);
ClienteRouter.delete("/api/clientes/:id", authMiddleware, permitirRoles("Admin"), DeleteCliente);

export { ClienteRouter };