import { conexion } from "./conexion.ts";

export interface DatosSolicitudRepuestoCliente {
    nombre_repuesto: string;
    referencia?: string | null;
    cantidad: number;
    descripcion?: string | null;
    imagen_url?: string | null;
}

export class SolicitudRepuestoCliente {
    public async Crear(idCliente: number, datos: DatosSolicitudRepuestoCliente) {
        const resultado = await conexion.execute(
            `INSERT INTO solicitudesrepuestoscliente
                (id_cliente, nombre_repuesto, referencia, cantidad, descripcion, imagen_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                idCliente,
                datos.nombre_repuesto,
                datos.referencia ?? null,
                datos.cantidad,
                datos.descripcion ?? null,
                datos.imagen_url ?? null,
            ],
        );

        return Number(resultado.lastInsertId);
    }

    public async ListarPendientesAdmin() {
        return await conexion.query(
            `SELECT s.id_solicitud_cliente, s.nombre_repuesto, s.referencia, s.cantidad,
                    s.descripcion, s.imagen_url, s.fecha_solicitud,
                    c.nombre_completo AS cliente, c.telefono, c.correo
             FROM solicitudesrepuestoscliente s
             INNER JOIN clientes c ON c.id_cliente = s.id_cliente
             WHERE s.estado = 'Pendiente'
             ORDER BY s.fecha_solicitud DESC`,
        );
    }

    public async MarcarAtendida(idSolicitud: number) {
        const [solicitud] = await conexion.query(
            `SELECT id_solicitud_cliente
             FROM solicitudesrepuestoscliente
             WHERE id_solicitud_cliente = ? AND estado = 'Pendiente'`,
            [idSolicitud],
        );
        if (!solicitud) {
            return { success: false, message: "La solicitud no existe o ya fue atendida" };
        }

        await conexion.execute(
            `UPDATE solicitudesrepuestoscliente
             SET estado = 'Atendida'
             WHERE id_solicitud_cliente = ? AND estado = 'Pendiente'`,
            [idSolicitud],
        );
        return { success: true, message: "Solicitud marcada como atendida" };
    }
}
