import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { SolicitudRepuesto } from "../Model/solicitudRepuestoModel.ts";

// POST /api/mecanico/solicitudes-repuesto   (Mecanico) -> pide un repuesto para una orden suya
export const PostCrearSolicitudRepuesto = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string };
        const body = await request.body.json();

        const camposObligatorios = ["id_orden", "nombre_repuesto", "cantidad"];
        for (const campo of camposObligatorios) {
            if (!body[campo]) {
                response.status = 400;
                response.body = { success: false, message: `El campo ${campo} es obligatorio` };
                return;
            }
        }

        const objSolicitud = new SolicitudRepuesto();
        const resultado = await objSolicitud.Crear(Number(usuario.sub), body);

        response.status = resultado.success ? 201 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/mecanico/solicitudes-repuesto              -> las del mecánico logueado
// GET /api/mecanico/solicitudes-repuesto?pendientes=1  -> solo las que aún no han sido atendidas
// El Admin puede consultar las de cualquiera con ?id_mecanico=5
export const GetSolicitudesMecanico = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string; rol: string };
        const soloPendientes = request.url.searchParams.get("pendientes") === "1";

        let idMecanico = Number(usuario.sub);
        if (usuario.rol === "Admin") {
            const idParam = request.url.searchParams.get("id_mecanico");
            if (idParam) idMecanico = Number(idParam);
        }

        const objSolicitud = new SolicitudRepuesto();
        const solicitudes = await objSolicitud.ListarPorMecanico(idMecanico, soloPendientes);

        response.status = 200;
        response.body = { success: true, data: solicitudes };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/mecanico/ordenes/:id/solicitudes-repuesto  -> las solicitudes hechas dentro de una orden puntual
export const GetSolicitudesPorOrden = async (ctx: RouterContext<"/api/mecanico/ordenes/:id/solicitudes-repuesto">) => {
    const { params, response } = ctx;

    try {
        const id = Number(params.id);
        const objSolicitud = new SolicitudRepuesto();
        const solicitudes = await objSolicitud.ListarPorOrden(id);

        response.status = 200;
        response.body = { success: true, data: solicitudes };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/mecanico/solicitudes-repuesto/:id  -> detalle, vista "pedido de la pieza" (como en la imagen)
export const GetDetalleSolicitud = async (ctx: RouterContext<"/api/mecanico/solicitudes-repuesto/:id">) => {
    const { params, response } = ctx;

    try {
        const usuario = ctx.state.user as { sub: string; rol: string };
        const id = Number(params.id);

        const objSolicitud = new SolicitudRepuesto();
        const solicitud = await objSolicitud.ObtenerPorId(id);

        if (!solicitud) {
            response.status = 404;
            response.body = { success: false, message: "Solicitud no encontrada" };
            return;
        }

        if (usuario.rol === "Mecanico" && solicitud.id_mecanico !== Number(usuario.sub)) {
            response.status = 403;
            response.body = { success: false, message: "Esta solicitud no pertenece a este mecánico" };
            return;
        }

        response.status = 200;
        response.body = { success: true, data: solicitud };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// PUT /api/mecanico/solicitudes-repuesto/:id/atender  (Admin) -> marca que ya se entregó la pieza
export const PutAtenderSolicitud = async (ctx: RouterContext<"/api/mecanico/solicitudes-repuesto/:id/atender">) => {
    const { params, response } = ctx;

    try {
        const id = Number(params.id);
        const objSolicitud = new SolicitudRepuesto();
        const resultado = await objSolicitud.MarcarAtendida(id);

        response.status = resultado.success ? 200 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};
