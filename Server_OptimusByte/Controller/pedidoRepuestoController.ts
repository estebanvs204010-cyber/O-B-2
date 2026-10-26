import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { PedidoRepuesto } from "../Model/pedidoRepuestoModel.ts";
import { SolicitudRepuestoCliente } from "../Model/solicitudRepuestoClienteModel.ts";

const METODOS_PAGO = ["Pago en taller", "Transferencia"];
const MAX_LINEAS = 30;
const MAX_CANTIDAD = 50;
const MAX_IMAGEN_URL = 600;
const URL_IMAGEN_CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/[A-Za-z0-9_./-]+$/;

interface UsuarioJwt {
    sub?: string;
}

function esObjetoJson(body: unknown): body is Record<string, unknown> {
    return typeof body === "object" && body !== null && !Array.isArray(body);
}

function obtenerIdUsuario(ctx: Context): number | null {
    const usuario = ctx.state.user as UsuarioJwt | undefined;
    const idUsuario = Number(usuario?.sub);
    return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

// GET /api/cliente/repuestos
export const GetCatalogoRepuestos = async (ctx: Context) => {
    const { response } = ctx;
    try {
        const repuestos = await new PedidoRepuesto().ListarCatalogo();
        response.status = 200;
        response.body = { success: true, data: repuestos };
    } catch (error) {
        console.error("[GET CATALOGO] Error:", error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// POST /api/cliente/solicitudes-repuesto
export const PostCrearSolicitudRepuestoCliente = async (ctx: Context) => {
    const { request, response } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }

    try {
        let body: unknown;
        try {
            body = await request.body.json();
        } catch {
            response.status = 400;
            response.body = { success: false, message: "El cuerpo de la solicitud no es válido" };
            return;
        }

        if (!esObjetoJson(body)) {
            response.status = 400;
            response.body = { success: false, message: "El cuerpo de la solicitud no es válido" };
            return;
        }

        const nombre_repuesto = typeof body.nombre_repuesto === "string"
            ? body.nombre_repuesto.trim()
            : "";
        const referencia = typeof body.referencia === "string" ? body.referencia.trim() : "";
        const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
        const cantidad = Number(body.cantidad);
        const imagen_url = typeof body.imagen_url === "string" ? body.imagen_url.trim() : "";

        if (!nombre_repuesto || nombre_repuesto.length > 160) {
            response.status = 400;
            response.body = { success: false, message: "El nombre del repuesto es obligatorio y debe tener máximo 160 caracteres" };
            return;
        }
        if (referencia.length > 120) {
            response.status = 400;
            response.body = { success: false, message: "La referencia no puede superar 120 caracteres" };
            return;
        }
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
            response.status = 400;
            response.body = { success: false, message: `La cantidad debe estar entre 1 y ${MAX_CANTIDAD}` };
            return;
        }
        if (descripcion.length > 1000) {
            response.status = 400;
            response.body = { success: false, message: "La descripción no puede superar 1000 caracteres" };
            return;
        }
        if (
            imagen_url.length > MAX_IMAGEN_URL ||
            (imagen_url.length > 0 && !URL_IMAGEN_CLOUDINARY.test(imagen_url))
        ) {
            response.status = 400;
            response.body = { success: false, message: "La imagen de referencia no es válida" };
            return;
        }

        const modeloPedidos = new PedidoRepuesto();
        const idCliente = await modeloPedidos.ObtenerIdCliente(idUsuario);
        if (!idCliente) {
            response.status = 404;
            response.body = { success: false, message: "Perfil de cliente no encontrado" };
            return;
        }

        const idSolicitud = await new SolicitudRepuestoCliente().Crear(idCliente, {
            nombre_repuesto,
            referencia: referencia || null,
            cantidad,
            descripcion: descripcion || null,
            imagen_url: imagen_url || null,
        });

        response.status = 201;
        response.body = { success: true, message: "Tu solicitud de repuesto fue enviada al taller", data: { id_solicitud: idSolicitud } };
    } catch (error) {
        console.error("[POST SOLICITUD REPUESTO CLIENTE] Error:", error);
        response.status = 500;
        response.body = { success: false, message: "No se pudo enviar la solicitud de repuesto" };
    }
};

// PUT /api/admin/solicitudes-repuesto-cliente/:id/atender
export const PutAtenderSolicitudRepuestoCliente = async (
    ctx: RouterContext<"/api/admin/solicitudes-repuesto-cliente/:id/atender">,
) => {
    const { response, params } = ctx;
    const idSolicitud = Number(params.id);

    if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
        response.status = 400;
        response.body = { success: false, message: "Solicitud inválida" };
        return;
    }

    try {
        const resultado = await new SolicitudRepuestoCliente().MarcarAtendida(idSolicitud);
        response.status = resultado.success ? 200 : 409;
        response.body = resultado;
    } catch (error) {
        console.error("[PUT ATENDER SOLICITUD REPUESTO CLIENTE] Error:", error);
        response.status = 500;
        response.body = { success: false, message: "No se pudo actualizar la solicitud" };
    }
};

// POST /api/cliente/pedidos
export const PostCrearPedido = async (ctx: Context) => {
    const { request, response } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }

    try {
        let body: unknown;
        try {
            body = await request.body.json();
        } catch {
            response.status = 400;
            response.body = { success: false, message: "El cuerpo de la solicitud no es válido" };
            return;
        }

        if (!esObjetoJson(body)) {
            response.status = 400;
            response.body = { success: false, message: "El cuerpo de la solicitud no es válido" };
            return;
        }
        if (!Array.isArray(body.items) || body.items.length === 0) {
            response.status = 400;
            response.body = { success: false, message: "El carrito está vacío" };
            return;
        }
        if (body.items.length > MAX_LINEAS) {
            response.status = 400;
            response.body = { success: false, message: `Máximo ${MAX_LINEAS} productos por pedido` };
            return;
        }

        const cantidades = new Map<number, number>();
        for (const item of body.items) {
            const id_repuesto = Number(item?.id_repuesto);
            const cantidad = Number(item?.cantidad);

            if (!Number.isInteger(id_repuesto) || id_repuesto <= 0) {
                response.status = 400;
                response.body = { success: false, message: "Repuesto inválido en el carrito" };
                return;
            }
            if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
                response.status = 400;
                response.body = {
                    success: false,
                    message: `La cantidad debe estar entre 1 y ${MAX_CANTIDAD}`,
                };
                return;
            }
            const cantidadTotal = (cantidades.get(id_repuesto) ?? 0) + cantidad;
            if (cantidadTotal > MAX_CANTIDAD) {
                response.status = 400;
                response.body = {
                    success: false,
                    message: `La cantidad máxima por repuesto es ${MAX_CANTIDAD}`,
                };
                return;
            }
            cantidades.set(id_repuesto, cantidadTotal);
        }

        const metodo_pago = typeof body.metodo_pago === "string" ? body.metodo_pago : "Pago en taller";
        if (!METODOS_PAGO.includes(metodo_pago)) {
            response.status = 400;
            response.body = { success: false, message: "Método de pago no válido" };
            return;
        }

        const observaciones = typeof body.observaciones === "string" ? body.observaciones.trim() : null;
        if (observaciones && observaciones.length > 300) {
            response.status = 400;
            response.body = { success: false, message: "Las observaciones no pueden superar 300 caracteres" };
            return;
        }

        const modelo = new PedidoRepuesto();
        const idCliente = await modelo.ObtenerIdCliente(idUsuario);

        if (!idCliente) {
            response.status = 404;
            response.body = { success: false, message: "Perfil de cliente no encontrado" };
            return;
        }

        const items = [...cantidades].map(([id_repuesto, cantidad]) => ({ id_repuesto, cantidad }));
        const resultado = await modelo.Crear(idCliente, idUsuario, { items, metodo_pago, observaciones });

        response.status = resultado.success ? 201 : 409;
        response.body = resultado;
    } catch (error) {
        console.error("[POST PEDIDO] Error:", error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/cliente/pedidos
export const GetMisPedidos = async (ctx: Context) => {
    const { response } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }

    try {
        const modelo = new PedidoRepuesto();
        const idCliente = await modelo.ObtenerIdCliente(idUsuario);

        if (!idCliente) {
            response.status = 404;
            response.body = { success: false, message: "Perfil de cliente no encontrado" };
            return;
        }

        const pedidos = await modelo.ListarPorCliente(idCliente);
        response.status = 200;
        response.body = { success: true, data: pedidos };
    } catch (error) {
        console.error("[GET PEDIDOS] Error:", error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// PUT /api/cliente/pedidos/:id/cancelar
export const PutCancelarPedido = async (ctx: RouterContext<"/api/cliente/pedidos/:id/cancelar">) => {
    const { response, params } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);
    const idPedido = Number(params.id);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }
    if (!Number.isInteger(idPedido) || idPedido <= 0) {
        response.status = 400;
        response.body = { success: false, message: "Pedido inválido" };
        return;
    }

    try {
        const modelo = new PedidoRepuesto();
        const idCliente = await modelo.ObtenerIdCliente(idUsuario);

        if (!idCliente) {
            response.status = 404;
            response.body = { success: false, message: "Perfil de cliente no encontrado" };
            return;
        }

        const resultado = await modelo.Cancelar(idCliente, idUsuario, idPedido);

        response.status = resultado.success ? 200 : 409;
        response.body = resultado;
    } catch (error) {
        console.error("[PUT CANCELAR PEDIDO] Error:", error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};
