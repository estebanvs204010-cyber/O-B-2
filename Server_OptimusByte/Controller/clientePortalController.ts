import { Context } from "../Dependencies/dependencias.ts";
import { conexion } from "../Model/conexion.ts";

function obtenerIdUsuario(ctx: Context): number | null {
    const usuario = ctx.state.user as { sub?: string } | undefined;
    const idUsuario = Number(usuario?.sub);

    return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

export const GetMiPerfilCliente = async (ctx: Context) => {
    const { response } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }

    try {
        const [cliente] = await conexion.query(
            `SELECT id_cliente, id_usuario, nombre_completo, tipo_documento,
                    num_documento, telefono, correo, direccion, activo
             FROM clientes
             WHERE id_usuario = ? AND activo = 1`,
            [idUsuario],
        );

        if (!cliente) {
            response.status = 404;
            response.body = { success: false, message: "Perfil de cliente no encontrado" };
            return;
        }

        response.status = 200;
        response.body = { success: true, data: cliente };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

export const GetMisVehiculos = async (ctx: Context) => {
    const { response } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }

    try {
        const vehiculos = await conexion.query(
            `SELECT v.id_vehiculo, v.id_cliente, v.placa, v.marca,
                    v.modelo, v.anio, v.color, v.vin, v.km_actuales, v.activo
             FROM vehiculos v
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             WHERE c.id_usuario = ?
               AND c.activo = 1
               AND v.activo = 1
             ORDER BY v.fecha_registro DESC`,
            [idUsuario],
        );

        response.status = 200;
        response.body = { success: true, data: vehiculos };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};
