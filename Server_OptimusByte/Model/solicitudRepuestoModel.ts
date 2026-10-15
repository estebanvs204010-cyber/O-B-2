import { conexion } from "./conexion.ts";

interface DatosSolicitud {
    id_orden: number;
    nombre_repuesto: string;
    cantidad: number;
    motivo?: string;
}

export class SolicitudRepuesto {
    // ---------- Un mecánico pide un repuesto para una orden suya ----------
    public async Crear(id_mecanico: number, datos: DatosSolicitud) {
        const [orden] = await conexion.query(
            `SELECT id_orden, id_mecanico FROM ordenestrabajo WHERE id_orden = ?`,
            [datos.id_orden],
        );
        if (!orden) {
            return { success: false, message: "La orden no existe" };
        }
        if (orden.id_mecanico !== id_mecanico) {
            return { success: false, message: "Esta orden no está asignada a este mecánico" };
        }

        await conexion.execute(
            `INSERT INTO solicitudesrepuesto (id_orden, id_mecanico, nombre_repuesto, cantidad, motivo)
             VALUES (?, ?, ?, ?, ?)`,
            [datos.id_orden, id_mecanico, datos.nombre_repuesto, datos.cantidad, datos.motivo ?? null],
        );

        return { success: true, message: "Solicitud de repuesto enviada correctamente" };
    }

    // ---------- Solicitudes hechas por UN mecánico (todas, o solo las pendientes) ----------
    public async ListarPorMecanico(id_mecanico: number, soloPendientes = false) {
        if (soloPendientes) {
            return await conexion.query(
                `SELECT s.id_solicitud, s.id_orden, s.nombre_repuesto, s.cantidad, s.motivo,
                        s.fecha_solicitud, s.atendida,
                        v.placa, v.marca, v.modelo,
                        c.nombre_completo AS propietario
                 FROM solicitudesrepuesto s
                 INNER JOIN ordenestrabajo o ON o.id_orden = s.id_orden
                 INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
                 INNER JOIN clientes c ON c.id_cliente = v.id_cliente
                 WHERE s.id_mecanico = ? AND s.atendida = 0
                 ORDER BY s.fecha_solicitud DESC`,
                [id_mecanico],
            );
        }

        return await conexion.query(
            `SELECT s.id_solicitud, s.id_orden, s.nombre_repuesto, s.cantidad, s.motivo,
                    s.fecha_solicitud, s.atendida,
                    v.placa, v.marca, v.modelo,
                    c.nombre_completo AS propietario
             FROM solicitudesrepuesto s
             INNER JOIN ordenestrabajo o ON o.id_orden = s.id_orden
             INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             WHERE s.id_mecanico = ?
             ORDER BY s.fecha_solicitud DESC`,
            [id_mecanico],
        );
    }

    // ---------- Solicitudes hechas dentro de UNA orden puntual ----------
    public async ListarPorOrden(id_orden: number) {
        return await conexion.query(
            `SELECT id_solicitud, nombre_repuesto, cantidad, motivo, fecha_solicitud, atendida
             FROM solicitudesrepuesto
             WHERE id_orden = ?
             ORDER BY fecha_solicitud DESC`,
            [id_orden],
        );
    }

    // ---------- Detalle de UNA solicitud (vista "pedido de la pieza", como en la imagen) ----------
    public async ObtenerPorId(id_solicitud: number) {
        const [solicitud] = await conexion.query(
            `SELECT s.id_solicitud, s.id_orden, s.id_mecanico, s.nombre_repuesto, s.cantidad, s.motivo,
                    s.fecha_solicitud, s.atendida,
                    o.estado AS estado_orden, o.tipo_servicio,
                    v.placa, v.marca, v.modelo, v.anio,
                    c.nombre_completo AS propietario, c.telefono AS propietario_telefono,
                    m.nombre_completo AS mecanico
             FROM solicitudesrepuesto s
             INNER JOIN ordenestrabajo o ON o.id_orden = s.id_orden
             INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             INNER JOIN usuarios m ON m.id_usuario = s.id_mecanico
             WHERE s.id_solicitud = ?`,
            [id_solicitud],
        );
        return solicitud ?? null;
    }

    // ---------- Marcar como atendida (Admin, cuando ya entregó la pieza) ----------
    public async MarcarAtendida(id_solicitud: number) {
        const [solicitud] = await conexion.query(
            `SELECT id_solicitud FROM solicitudesrepuesto WHERE id_solicitud = ?`,
            [id_solicitud],
        );
        if (!solicitud) {
            return { success: false, message: "La solicitud no existe" };
        }

        await conexion.execute(
            `UPDATE solicitudesrepuesto SET atendida = 1 WHERE id_solicitud = ?`,
            [id_solicitud],
        );

        return { success: true, message: "Solicitud marcada como atendida" };
    }
}
