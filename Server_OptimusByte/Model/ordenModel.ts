import { conexion } from "./conexion.ts";

interface Solicitante {
    id_usuario: number;
    rol: string;
}

interface DatosCambioEstado {
    estado: string;
    observacion?: string;
}

const ESTADOS_QUE_CIERRAN_ORDEN = ["Finalizado", "Entregado", "Cancelado"];

export class Orden {
    // ---------- Todas las órdenes para la bandeja administrativa ----------
    public async ListarTodas() {
        return await conexion.query(
            `SELECT o.id_orden, o.estado, o.tipo_servicio, o.descripcion_problema,
                    o.fecha_apertura, o.fecha_entrega_estimada,
                    v.id_vehiculo, v.placa, v.marca, v.modelo,
                    c.id_cliente, c.nombre_completo AS propietario, c.telefono AS propietario_telefono,
                    o.id_mecanico, m.nombre_completo AS mecanico
             FROM ordenestrabajo o
             INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             LEFT JOIN usuarios m ON m.id_usuario = o.id_mecanico
             ORDER BY o.fecha_apertura DESC`,
        );
    }

    // ---------- Órdenes asignadas a UN mecánico (agenda / citas) ----------
    // Si "estado" viene vacío, trae todas las de ese mecánico.
    public async ListarPorMecanico(id_mecanico: number, estado?: string) {
        if (estado) {
            return await conexion.query(
                `SELECT o.id_orden, o.estado, o.tipo_servicio, o.descripcion_problema,
                        o.fecha_apertura, o.fecha_entrega_estimada, o.fecha_cierre,
                        v.id_vehiculo, v.placa, v.marca, v.modelo, v.anio,
                        c.id_cliente, c.nombre_completo AS propietario, c.telefono AS propietario_telefono
                 FROM ordenestrabajo o
                 INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
                 INNER JOIN clientes c ON c.id_cliente = v.id_cliente
                 WHERE o.id_mecanico = ? AND o.estado = ?
                 ORDER BY o.fecha_apertura DESC`,
                [id_mecanico, estado],
            );
        }

        return await conexion.query(
            `SELECT o.id_orden, o.estado, o.tipo_servicio, o.descripcion_problema,
                    o.fecha_apertura, o.fecha_entrega_estimada, o.fecha_cierre,
                    v.id_vehiculo, v.placa, v.marca, v.modelo, v.anio,
                    c.id_cliente, c.nombre_completo AS propietario, c.telefono AS propietario_telefono
             FROM ordenestrabajo o
             INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             WHERE o.id_mecanico = ?
             ORDER BY o.fecha_apertura DESC`,
            [id_mecanico],
        );
    }

    // ---------- Vehículos en los que ha trabajado un mecánico, con su dueño ----------
    public async VehiculosPorMecanico(id_mecanico: number) {
        return await conexion.query(
            `SELECT DISTINCT v.id_vehiculo, v.placa, v.marca, v.modelo, v.anio, v.color, v.km_actuales,
                    c.id_cliente, c.nombre_completo AS propietario,
                    c.telefono AS propietario_telefono, c.correo AS propietario_correo
             FROM ordenestrabajo o
             INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             WHERE o.id_mecanico = ?
             ORDER BY v.marca, v.modelo`,
            [id_mecanico],
        );
    }

    // ---------- Detalle completo de UNA orden (vehículo + dueño + servicio + fechas + repuestos + historial) ----------
    public async ObtenerDetalle(id_orden: number) {
        const [orden] = await conexion.query(
            `SELECT o.id_orden, o.id_vehiculo, o.id_mecanico, o.id_administrador,
                    o.estado, o.tipo_servicio, o.descripcion_problema, o.diagnostico, o.observaciones,
                    o.km_ingreso, o.fecha_apertura, o.fecha_cierre, o.fecha_entrega_estimada,
                    v.placa, v.marca, v.modelo, v.anio, v.color, v.km_actuales,
                    c.id_cliente, c.nombre_completo AS propietario,
                    c.telefono AS propietario_telefono, c.correo AS propietario_correo
             FROM ordenestrabajo o
             INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             WHERE o.id_orden = ?`,
            [id_orden],
        );

        if (!orden) return null;

        const repuestos = await conexion.query(
            `SELECT r.id_repuesto, r.nombre, r.referencia, orp.cantidad, orp.precio_usado
             FROM ordenrepuestos orp
             INNER JOIN repuestos r ON r.id_repuesto = orp.id_repuesto
             WHERE orp.id_orden = ?`,
            [id_orden],
        );

        const historial_vehiculo = await this.HistorialVehiculo(orden.id_vehiculo, id_orden);

        return { ...orden, repuestos, historial_vehiculo };
    }

    // ---------- Historial de otras órdenes del mismo vehículo (panel "Historial del vehículo") ----------
    public async HistorialVehiculo(id_vehiculo: number, id_orden_excluir?: number) {
        if (id_orden_excluir) {
            return await conexion.query(
                `SELECT o.id_orden, o.fecha_apertura, o.descripcion_problema, o.estado,
                        u.nombre_completo AS tecnico,
                        (SELECT COUNT(*) FROM ordenrepuestos orp WHERE orp.id_orden = o.id_orden) AS total_repuestos
                 FROM ordenestrabajo o
                 LEFT JOIN usuarios u ON u.id_usuario = o.id_mecanico
                 WHERE o.id_vehiculo = ? AND o.id_orden != ?
                 ORDER BY o.fecha_apertura DESC`,
                [id_vehiculo, id_orden_excluir],
            );
        }

        return await conexion.query(
            `SELECT o.id_orden, o.fecha_apertura, o.descripcion_problema, o.estado,
                    u.nombre_completo AS tecnico,
                    (SELECT COUNT(*) FROM ordenrepuestos orp WHERE orp.id_orden = o.id_orden) AS total_repuestos
             FROM ordenestrabajo o
             LEFT JOIN usuarios u ON u.id_usuario = o.id_mecanico
             WHERE o.id_vehiculo = ?
             ORDER BY o.fecha_apertura DESC`,
            [id_vehiculo],
        );
    }

    // ---------- Aceptar una cita y asignarla a un mecánico ----------
    public async AsignarMecanico(
        id_orden: number,
        id_mecanico: number,
        id_administrador: number,
    ): Promise<{ success: boolean; message: string }> {
        const [mecanico] = await conexion.query(
            `SELECT u.id_usuario
             FROM usuarios u
             INNER JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = ? AND r.nombre = 'Mecanico' AND u.activo = 1`,
            [id_mecanico],
        );

        if (!mecanico) {
            return { success: false, message: "El mecánico no existe o está inactivo" };
        }

        return await conexion.transaction(async (conn) => {
            const resultadoOrden = await conn.query(
                `SELECT id_orden, estado
                 FROM ordenestrabajo
                 WHERE id_orden = ?
                 FOR UPDATE`,
                [id_orden],
            );
            const orden = Array.isArray(resultadoOrden) ? resultadoOrden[0] : undefined;

            if (!orden) {
                return { success: false, message: "La orden no existe" };
            }
            if (orden.estado !== "Pendiente") {
                return { success: false, message: "Solo se pueden aceptar órdenes pendientes" };
            }

            await conn.execute(
                `UPDATE ordenestrabajo
                 SET id_mecanico = ?, id_administrador = ?, estado = 'En Proceso'
                 WHERE id_orden = ?`,
                [id_mecanico, id_administrador, id_orden],
            );

            await conn.execute(
                `INSERT INTO estadosorden (id_orden, id_usuario, estado_nuevo, observacion)
                 VALUES (?, ?, 'En Proceso', ?)`,
                [id_orden, id_administrador, "Cita aceptada y asignada a un mecánico"],
            );

            return { success: true, message: "Cita aceptada y mecánico asignado correctamente" };
        });
    }

    // ---------- Cambiar el estado de una orden (acción rápida "Cambiar estado") ----------
    public async CambiarEstado(id_orden: number, solicitante: Solicitante, datos: DatosCambioEstado) {
        const [ordenActual] = await conexion.query(
            `SELECT id_orden, id_mecanico, estado FROM ordenestrabajo WHERE id_orden = ?`,
            [id_orden],
        );
        if (!ordenActual) {
            return { success: false, message: "La orden no existe" };
        }

        // Un mecánico solo puede tocar SUS órdenes; el Admin puede tocar cualquiera.
        if (solicitante.rol === "Mecanico" && ordenActual.id_mecanico !== solicitante.id_usuario) {
            return { success: false, message: "Esta orden no está asignada a este mecánico" };
        }

        try {
            const cierraOrden = ESTADOS_QUE_CIERRAN_ORDEN.includes(datos.estado);

            await conexion.transaction(async (conn) => {
                if (cierraOrden) {
                    await conn.execute(
                        `UPDATE ordenestrabajo SET estado = ?, fecha_cierre = CURRENT_TIMESTAMP WHERE id_orden = ?`,
                        [datos.estado, id_orden],
                    );
                } else {
                    await conn.execute(
                        `UPDATE ordenestrabajo SET estado = ? WHERE id_orden = ?`,
                        [datos.estado, id_orden],
                    );
                }

                await conn.execute(
                    `INSERT INTO estadosorden (id_orden, id_usuario, estado_nuevo, observacion)
                     VALUES (?, ?, ?, ?)`,
                    [id_orden, solicitante.id_usuario, datos.estado, datos.observacion ?? null],
                );
            });

            return { success: true, message: "Estado actualizado correctamente" };
        } catch (error) {
            console.error(error);
            return { success: false, message: "No se pudo actualizar el estado" };
        }
    }

    // ---------- Definir/actualizar la fecha estimada de entrega (acción rápida "Tiempo estimado") ----------
    public async ActualizarEntregaEstimada(id_orden: number, solicitante: Solicitante, fecha_entrega_estimada: string) {
        const [ordenActual] = await conexion.query(
            `SELECT id_orden, id_mecanico FROM ordenestrabajo WHERE id_orden = ?`,
            [id_orden],
        );
        if (!ordenActual) {
            return { success: false, message: "La orden no existe" };
        }

        if (solicitante.rol === "Mecanico" && ordenActual.id_mecanico !== solicitante.id_usuario) {
            return { success: false, message: "Esta orden no está asignada a este mecánico" };
        }

        await conexion.execute(
            `UPDATE ordenestrabajo SET fecha_entrega_estimada = ? WHERE id_orden = ?`,
            [fecha_entrega_estimada, id_orden],
        );

        return { success: true, message: "Fecha estimada de entrega actualizada" };
    }
}
