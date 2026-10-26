import { Router } from "../Dependencies/dependencias.ts";
import {
    GetCatalogoRepuestos,
    GetMisPedidos,
    PutAtenderSolicitudRepuestoCliente,
    PostCrearSolicitudRepuestoCliente,
    PostCrearPedido,
    PutCancelarPedido,
} from "../Controller/pedidoRepuestoController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const PedidoRepuestoRouter = new Router();

PedidoRepuestoRouter.get(
    "/api/repuestos",
    GetCatalogoRepuestos,
);

PedidoRepuestoRouter.get(
    "/api/cliente/repuestos",
    authMiddleware,
    permitirRoles("Cliente"),
    GetCatalogoRepuestos,
);

PedidoRepuestoRouter.post(
    "/api/cliente/solicitudes-repuesto",
    authMiddleware,
    permitirRoles("Cliente"),
    PostCrearSolicitudRepuestoCliente,
);

PedidoRepuestoRouter.put(
    "/api/admin/solicitudes-repuesto-cliente/:id/atender",
    authMiddleware,
    permitirRoles("Admin"),
    PutAtenderSolicitudRepuestoCliente,
);

PedidoRepuestoRouter.post(
    "/api/cliente/pedidos",
    authMiddleware,
    permitirRoles("Cliente"),
    PostCrearPedido,
);

PedidoRepuestoRouter.get(
    "/api/cliente/pedidos",
    authMiddleware,
    permitirRoles("Cliente"),
    GetMisPedidos,
);

PedidoRepuestoRouter.put(
    "/api/cliente/pedidos/:id/cancelar",
    authMiddleware,
    permitirRoles("Cliente"),
    PutCancelarPedido,
);

export { PedidoRepuestoRouter };
