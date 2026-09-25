import { Context } from "../Dependencies/dependencias.ts";
import { conexion } from "../Model/conexion.ts";
import { Vehiculo } from "../Model/vehiculoModel.ts";

interface UsuarioJwt {
    sub?: string;
}

function obtenerIdUsuario(ctx: Context): number | null {
    const usuario = ctx.state.user as UsuarioJwt | undefined;
    const idUsuario = Number(usuario?.sub);

    return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

// GET /api/cliente/me
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

// PUT /api/cliente/me
// El documento no se recibe ni se modifica desde esta ruta.
export const PutActualizarMiPerfil = async (ctx: Context) => {
    const { request, response } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }

    try {
        const body = await request.body.json();
        const camposObligatorios = ["nombre_completo", "telefono", "correo"];

        for (const campo of camposObligatorios) {
            if (body[campo] === undefined || body[campo] === null || body[campo] === "") {
                response.status = 400;
                response.body = {
                    success: false,
                    message: `El campo ${campo} es obligatorio`,
                };
                return;
            }
        }

        const [cliente] = await conexion.query(
            `SELECT id_cliente
             FROM clientes
             WHERE id_usuario = ? AND activo = 1`,
            [idUsuario],
        );

        if (!cliente) {
            response.status = 404;
            response.body = { success: false, message: "Perfil de cliente no encontrado" };
            return;
        }

        const correo = String(body.correo).trim();
        const [correoUsado] = await conexion.query(
            `SELECT id_usuario
             FROM usuarios
             WHERE correo = ? AND id_usuario <> ?`,
            [correo, idUsuario],
        );

        if (correoUsado) {
            response.status = 400;
            response.body = { success: false, message: "Ese correo ya está registrado" };
            return;
        }

        await conexion.transaction(async (conn) => {
            await conn.execute(
                `UPDATE clientes
                 SET nombre_completo = ?, telefono = ?, correo = ?, direccion = ?
                 WHERE id_cliente = ?`,
                [
                    String(body.nombre_completo).trim(),
                    String(body.telefono).trim(),
                    correo,
                    body.direccion ? String(body.direccion).trim() : null,
                    Number(cliente.id_cliente),
                ],
            );

            await conn.execute(
                `UPDATE usuarios
                 SET nombre_completo = ?, telefono = ?, correo = ?
                 WHERE id_usuario = ?`,
                [
                    String(body.nombre_completo).trim(),
                    String(body.telefono).trim(),
                    correo,
                    idUsuario,
                ],
            );
        });

        response.status = 200;
        response.body = { success: true, message: "Perfil actualizado correctamente" };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/cliente/mis-vehiculos
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

// POST /api/cliente/mis-vehiculos
export const PostRegistrarMiVehiculo = async (ctx: Context) => {
    const { request, response } = ctx;
    const idUsuario = obtenerIdUsuario(ctx);

    if (!idUsuario) {
        response.status = 401;
        response.body = { success: false, message: "Usuario no autenticado" };
        return;
    }

    try {
        const body = await request.body.json();
        const camposObligatorios = ["placa", "marca", "modelo", "anio"];

        for (const campo of camposObligatorios) {
            if (body[campo] === undefined || body[campo] === null || body[campo] === "") {
                response.status = 400;
                response.body = {
                    success: false,
                    message: `El campo ${campo} es obligatorio`,
                };
                return;
            }
        }

        const [cliente] = await conexion.query(
            `SELECT id_cliente
             FROM clientes
             WHERE id_usuario = ? AND activo = 1`,
            [idUsuario],
        );

        if (!cliente) {
            response.status = 404;
            response.body = { success: false, message: "Perfil de cliente no encontrado" };
            return;
        }

        const objVehiculo = new Vehiculo();
        const resultado = await objVehiculo.Crear({
            id_cliente: Number(cliente.id_cliente),
            placa: String(body.placa).trim().toUpperCase(),
            marca: String(body.marca).trim(),
            modelo: String(body.modelo).trim(),
            anio: Number(body.anio),
            color: body.color ? String(body.color).trim() : undefined,
            vin: body.vin ? String(body.vin).trim() : undefined,
            km_actuales: body.km_actuales === undefined || body.km_actuales === ""
                ? 0
                : Number(body.km_actuales),
        });

        response.status = resultado.success ? 201 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};
