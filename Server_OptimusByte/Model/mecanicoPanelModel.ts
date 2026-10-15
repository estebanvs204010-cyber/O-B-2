import { conexion } from "./conexion.ts";

export class MecanicoPanel {
  public async RepuestosDisponibles() {
    return await conexion.query(
      `SELECT id_repuesto, nombre, referencia, precio_unitario, stock_actual
       FROM repuestos WHERE activo = 1 AND stock_actual > 0
       ORDER BY nombre, referencia`,
    );
  }

  public async RegistrarRepuestoUsado(
    id_orden: number,
    id_mecanico: number,
    id_repuesto: number,
    cantidad: number,
  ) {
    try {
      const resultado = await conexion.transaction(async (conn) => {
        const [orden] = await conn.query(
          `SELECT id_orden FROM ordenestrabajo
                     WHERE id_orden = ? AND id_mecanico = ? FOR UPDATE`,
          [id_orden, id_mecanico],
        );
        if (!orden) {
          return {
            success: false,
            status: 404,
            message: "Orden no encontrada o no asignada a este mecánico",
          };
        }

        const [repuesto] = await conn.query(
          `SELECT id_repuesto, precio_unitario, stock_actual
                     FROM repuestos WHERE id_repuesto = ? AND activo = 1 FOR UPDATE`,
          [id_repuesto],
        );
        if (!repuesto) {
          return {
            success: false,
            status: 404,
            message: "Repuesto no encontrado o inactivo",
          };
        }
        if (Number(repuesto.stock_actual) < cantidad) {
          return {
            success: false,
            status: 409,
            message: "No hay suficiente stock disponible",
          };
        }

        await conn.execute(
          `UPDATE repuestos SET stock_actual = stock_actual - ?
                     WHERE id_repuesto = ? AND stock_actual >= ?`,
          [cantidad, id_repuesto, cantidad],
        );

        const [usoExistente] = await conn.query(
          `SELECT id_orden FROM ordenrepuestos WHERE id_orden = ? AND id_repuesto = ? FOR UPDATE`,
          [id_orden, id_repuesto],
        );
        if (usoExistente) {
          await conn.execute(
            `UPDATE ordenrepuestos SET cantidad = cantidad + ? WHERE id_orden = ? AND id_repuesto = ?`,
            [cantidad, id_orden, id_repuesto],
          );
        } else {
          await conn.execute(
            `INSERT INTO ordenrepuestos (id_orden, id_repuesto, cantidad, precio_usado)
                         VALUES (?, ?, ?, ?)`,
            [id_orden, id_repuesto, cantidad, repuesto.precio_unitario],
          );
        }
        return {
          success: true,
          status: 201,
          message: "Repuesto registrado como utilizado",
        };
      });
      return resultado;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        status: 500,
        message: "No se pudo registrar el repuesto utilizado",
      };
    }
  }

  public async Dashboard(id_mecanico: number) {
    const [resumen] = await conexion.query(
      `SELECT COUNT(*) AS ordenes_asignadas,
                    SUM(o.estado = 'Pendiente') AS pendientes,
                    SUM(o.estado = 'En Proceso') AS en_reparacion,
                    SUM(o.estado = 'Esperando Repuestos') AS esperando_repuestos,
                    SUM(o.estado = 'Finalizado') AS finalizadas
             FROM ordenestrabajo o WHERE o.id_mecanico = ?`,
      [id_mecanico],
    );
    const trabajos_hoy = await conexion.query(
      `SELECT o.id_orden, o.estado, o.tipo_servicio, o.fecha_entrega_estimada,
                    v.placa, v.marca, v.modelo
             FROM ordenestrabajo o
             INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
             WHERE o.id_mecanico = ? AND DATE(o.fecha_entrega_estimada) = CURDATE()
               AND o.estado NOT IN ('Entregado', 'Cancelado')
             ORDER BY o.fecha_entrega_estimada`,
      [id_mecanico],
    );
    return {
      resumen: Object.fromEntries(
        Object.entries(resumen ?? {}).map((
          [key, value],
        ) => [key, Number(value ?? 0)]),
      ),
      trabajos_hoy,
    };
  }

  public async Perfil(id_usuario: number) {
    try {
      const [perfil] = await conexion.query(
        `SELECT u.id_usuario, u.nombre_completo, u.correo, u.telefono, u.activo,
                      u.especialidad, r.nombre AS rol
               FROM usuarios u INNER JOIN roles r ON r.id_rol = u.id_rol
               WHERE u.id_usuario = ?`,
        [id_usuario],
      );
      return perfil ?? null;
    } catch (error) {
      const detalle = String(error).toLowerCase();
      if (
        !detalle.includes("unknown column") || !detalle.includes("especialidad")
      ) {
        throw error;
      }
      const [perfil] = await conexion.query(
        `SELECT u.id_usuario, u.nombre_completo, u.correo, u.telefono, u.activo,
                      r.nombre AS rol
               FROM usuarios u INNER JOIN roles r ON r.id_rol = u.id_rol
               WHERE u.id_usuario = ?`,
        [id_usuario],
      );
      return perfil ? { ...perfil, especialidad: null } : null;
    }
  }

  public async HistorialOrden(id_orden: number) {
    return await conexion.query(
      `SELECT e.id_estado, e.id_orden, e.estado_nuevo, e.observacion, e.fecha_cambio,
                    u.nombre_completo AS usuario
             FROM estadosorden e
             INNER JOIN usuarios u ON u.id_usuario = e.id_usuario
             WHERE e.id_orden = ? ORDER BY e.fecha_cambio, e.id_estado`,
      [id_orden],
    );
  }

  public async ActualizarInforme(
    id_orden: number,
    id_mecanico: number,
    diagnostico: string | null,
    trabajo_realizado: string | null,
  ) {
    const [orden] = await conexion.query(
      `SELECT id_orden FROM ordenestrabajo WHERE id_orden = ? AND id_mecanico = ?`,
      [id_orden, id_mecanico],
    );
    if (!orden) return false;
    await conexion.execute(
      `UPDATE ordenestrabajo SET diagnostico = ?, trabajo_realizado = ? WHERE id_orden = ?`,
      [diagnostico, trabajo_realizado, id_orden],
    );
    return true;
  }

  public async AgregarEvidencia(
    id_orden: number,
    id_mecanico: number,
    url: string,
    descripcion: string | null,
  ) {
    const [orden] = await conexion.query(
      `SELECT id_orden FROM ordenestrabajo WHERE id_orden = ? AND id_mecanico = ?`,
      [id_orden, id_mecanico],
    );
    if (!orden) return false;
    await conexion.execute(
      `INSERT INTO evidenciasorden (id_orden, id_usuario, imagen_url, descripcion)
             VALUES (?, ?, ?, ?)`,
      [id_orden, id_mecanico, url, descripcion],
    );
    return true;
  }

  public async ListarEvidencias(id_orden: number) {
    return await conexion.query(
      `SELECT e.id_evidencia, e.imagen_url, e.descripcion, e.fecha_registro,
                    u.nombre_completo AS mecanico
             FROM evidenciasorden e INNER JOIN usuarios u ON u.id_usuario = e.id_usuario
             WHERE e.id_orden = ? ORDER BY e.fecha_registro, e.id_evidencia`,
      [id_orden],
    );
  }
}
