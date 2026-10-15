import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { conexion } from "../Model/conexion.ts";

const obtenerIdAdmin = (ctx: Context) =>
  Number((ctx.state.user as { sub: string }).sub);

export const GetOrdenesAdmin = async (ctx: Context) => {
  try {
    const ordenes = await conexion.query(
      `SELECT o.id_orden, o.estado, o.tipo_servicio, o.descripcion_problema,
              o.fecha_apertura, o.fecha_entrega_estimada, o.fecha_cierre,
              v.id_vehiculo, v.placa, v.marca, v.modelo,
              c.nombre_completo AS cliente,
              m.id_usuario AS id_mecanico, m.nombre_completo AS mecanico
       FROM ordenestrabajo o
       INNER JOIN vehiculos v ON v.id_vehiculo = o.id_vehiculo
       INNER JOIN clientes c ON c.id_cliente = v.id_cliente
       LEFT JOIN usuarios m ON m.id_usuario = o.id_mecanico
       ORDER BY FIELD(o.estado, 'Pendiente', 'En Proceso', 'Esperando Repuestos', 'Finalizado', 'Entregado', 'Cancelado'),
                o.fecha_apertura DESC`,
    );
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: ordenes };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "No se pudieron cargar las órdenes" };
  }
};

export const PostCrearOrdenAdmin = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const id_vehiculo = Number(body.id_vehiculo);
    const id_mecanico = body.id_mecanico ? Number(body.id_mecanico) : null;
    const tipo_servicio = String(body.tipo_servicio ?? "Correctivo");
    const descripcion = String(body.descripcion_problema ?? "").trim();

    if (!Number.isInteger(id_vehiculo) || id_vehiculo < 1 || descripcion.length < 3 || descripcion.length > 5000) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Selecciona un vehículo y escribe una descripción válida" };
      return;
    }
    if (!["Correctivo", "Preventivo"].includes(tipo_servicio)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "El tipo de servicio no es válido" };
      return;
    }

    if (id_mecanico !== null) {
      const [mecanico] = await conexion.query(
        `SELECT u.id_usuario FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = ? AND u.activo = 1 AND r.nombre = 'Mecanico'`,
        [id_mecanico],
      );
      if (!mecanico) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "El mecánico seleccionado no está activo" };
        return;
      }
    }

    const [vehiculo] = await conexion.query(
      `SELECT id_vehiculo, km_actuales FROM vehiculos WHERE id_vehiculo = ? AND activo = 1`,
      [id_vehiculo],
    );
    if (!vehiculo) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Vehículo no encontrado o inactivo" };
      return;
    }

    const id_administrador = obtenerIdAdmin(ctx);
    const creado = await conexion.transaction(async (conn) => {
      const resultado = await conn.execute(
        `INSERT INTO ordenestrabajo
           (id_vehiculo, id_mecanico, id_administrador, estado, tipo_servicio, descripcion_problema, km_ingreso)
         VALUES (?, ?, ?, 'Pendiente', ?, ?, ?)`,
        [id_vehiculo, id_mecanico, id_administrador, tipo_servicio, descripcion, Number(vehiculo.km_actuales)],
      );
      await conn.execute(
        `INSERT INTO estadosorden (id_orden, id_usuario, estado_nuevo, observacion)
         VALUES (?, ?, 'Pendiente', 'Orden creada por administración')`,
        [resultado.lastInsertId, id_administrador],
      );
      return Number(resultado.lastInsertId);
    });

    ctx.response.status = 201;
    ctx.response.body = { success: true, message: "Orden creada correctamente", data: { id_orden: creado } };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "No se pudo crear la orden" };
  }
};

export const PatchAsignarMecanicoOrden = async (
  ctx: RouterContext<"/api/admin/ordenes/:id/asignacion">,
) => {
  try {
    const id_orden = Number(ctx.params.id);
    const body = await ctx.request.body.json();
    const id_mecanico = body.id_mecanico === null || body.id_mecanico === ""
      ? null
      : Number(body.id_mecanico);
    if (!Number.isInteger(id_orden) || id_orden < 1 || (id_mecanico !== null && (!Number.isInteger(id_mecanico) || id_mecanico < 1))) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "La orden o el mecánico no son válidos" };
      return;
    }
    const [orden] = await conexion.query(`SELECT id_orden FROM ordenestrabajo WHERE id_orden = ?`, [id_orden]);
    if (!orden) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Orden no encontrada" };
      return;
    }
    if (id_mecanico !== null) {
      const [mecanico] = await conexion.query(
        `SELECT u.id_usuario FROM usuarios u INNER JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = ? AND u.activo = 1 AND r.nombre = 'Mecanico'`,
        [id_mecanico],
      );
      if (!mecanico) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "El mecánico seleccionado no está activo" };
        return;
      }
    }
    await conexion.execute(`UPDATE ordenestrabajo SET id_mecanico = ? WHERE id_orden = ?`, [id_mecanico, id_orden]);
    ctx.response.status = 200;
    ctx.response.body = { success: true, message: id_mecanico ? "Mecánico asignado" : "Orden sin asignar" };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "No se pudo asignar el mecánico" };
  }
};
