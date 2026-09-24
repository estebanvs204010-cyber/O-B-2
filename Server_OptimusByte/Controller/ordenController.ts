import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { Orden } from "../Model/ordenModel.ts";

const ESTADOS_VALIDOS = [
    "Pendiente",
    "En Proceso",
    "Esperando Repuestos",
    "Finalizado",
    "Entregado",
    "Cancelado",
];

// GET /api/mecanico/ordenes              -> las del mecánico logueado (agenda/citas)
// GET /api/mecanico/ordenes?estado=Pendiente
// El Admin puede consultar las de cualquiera con ?id_mecanico=5
export const GetOrdenesMecanico = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string; rol: string };
        const estado = request.url.searchParams.get("estado") ?? undefined;

        let idMecanico = Number(usuario.sub);
        if (usuario.rol === "Admin") {
            const idParam = request.url.searchParams.get("id_mecanico");
            if (idParam) idMecanico = Number(idParam);
        }

        const objOrden = new Orden();
        const ordenes = await objOrden.ListarPorMecanico(idMecanico, estado);

        response.status = 200;
        response.body = { success: true, data: ordenes };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/mecanico/vehiculos  -> carros en los que ha trabajado el mecánico, con su dueño
// El Admin puede consultar los de cualquiera con ?id_mecanico=5
export const GetVehiculosMecanico = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string; rol: string };

        let idMecanico = Number(usuario.sub);
        if (usuario.rol === "Admin") {
            const idParam = request.url.searchParams.get("id_mecanico");
            if (idParam) idMecanico = Number(idParam);
        }

        const objOrden = new Orden();
        const vehiculos = await objOrden.VehiculosPorMecanico(idMecanico);

        response.status = 200;
        response.body = { success: true, data: vehiculos };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/mecanico/ordenes/:id  -> detalle completo (vehículo+dueño, servicio, fechas, historial), vista tipo OT
export const GetDetalleOrden = async (ctx: RouterContext<"/api/mecanico/ordenes/:id">) => {
    const { params, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string; rol: string };
        const id = Number(params.id);

        const objOrden = new Orden();
        const orden = await objOrden.ObtenerDetalle(id);

        if (!orden) {
            response.status = 404;
            response.body = { success: false, message: "Orden no encontrada" };
            return;
        }

        if (usuario.rol === "Mecanico" && orden.id_mecanico !== Number(usuario.sub)) {
            response.status = 403;
            response.body = { success: false, message: "Esta orden no está asignada a este mecánico" };
            return;
        }

        response.status = 200;
        response.body = { success: true, data: orden };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// PUT /api/mecanico/ordenes/:id/estado   body: { estado, observacion? }  (acción rápida "Cambiar estado")
export const PutCambiarEstadoOrden = async (ctx: RouterContext<"/api/mecanico/ordenes/:id/estado">) => {
    const { params, request, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string; rol: string };
        const id = Number(params.id);
        const body = await request.body.json();

        if (!body.estado) {
            response.status = 400;
            response.body = { success: false, message: "El campo estado es obligatorio" };
            return;
        }
        if (!ESTADOS_VALIDOS.includes(body.estado)) {
            response.status = 400;
            response.body = {
                success: false,
                message: `Estado inválido. Usa uno de: ${ESTADOS_VALIDOS.join(", ")}`,
            };
            return;
        }

        const objOrden = new Orden();
        const resultado = await objOrden.CambiarEstado(
            id,
            { id_usuario: Number(usuario.sub), rol: usuario.rol },
            { estado: body.estado, observacion: body.observacion },
        );

        response.status = resultado.success ? 200 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// PUT /api/mecanico/ordenes/:id/tiempo-estimado   body: { fecha_entrega_estimada }  (acción rápida "Tiempo estimado")
export const PutTiempoEstimadoOrden = async (ctx: RouterContext<"/api/mecanico/ordenes/:id/tiempo-estimado">) => {
    const { params, request, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string; rol: string };
        const id = Number(params.id);
        const body = await request.body.json();

        if (!body.fecha_entrega_estimada) {
            response.status = 400;
            response.body = { success: false, message: "El campo fecha_entrega_estimada es obligatorio" };
            return;
        }

        const objOrden = new Orden();
        const resultado = await objOrden.ActualizarEntregaEstimada(
            id,
            { id_usuario: Number(usuario.sub), rol: usuario.rol },
            body.fecha_entrega_estimada,
        );

        response.status = resultado.success ? 200 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};
