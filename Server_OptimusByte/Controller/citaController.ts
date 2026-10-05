import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { CitaModel } from "../Model/citaModel.ts";
import { Cliente } from "../Model/clienteModel.ts";
import { Vehiculo } from "../Model/vehiculoModel.ts";
import { MantenimientoModel } from "../Model/mantenimientoModel.ts";
import { conexion } from "../Model/conexion.ts";
import { combinarFechaHora } from "../Helpers/horarioAtencion.ts";
import { enviarYRegistrarCorreo } from "../Helpers/correoLogger.ts";
import { crearNotificacionParaRol } from "../Helpers/notificacionesService.ts";
import { correoCitaConfirmada, correoCitaRechazada } from "../Helpers/templates.ts";

const citaModel = new CitaModel();
const clienteModel = new Cliente();
const vehiculoModel = new Vehiculo();

async function avisarleAlAdminDeCitaPendiente(id_cita: number, nombreCliente: string) {
  await crearNotificacionParaRol({
    nombreRol: "Admin",
    tipo: "CitaPendiente",
    titulo: "Nueva cita por confirmar",
    mensaje: `${nombreCliente} solicitó una cita y está esperando tu confirmación.`,
    entidad_tipo: "cita",
    entidad_id: id_cita,
  });
}

async function resolverIdCliente(ctx: Context): Promise<number | null> {
  const user = ctx.state.user as { sub?: string } | undefined;
  const id_usuario = Number(user?.sub);
  if (!Number.isInteger(id_usuario) || id_usuario < 1) return null;
  return await clienteModel.ObtenerIdClientePorUsuario(id_usuario);
}

export const GetDisponibilidad = async (ctx: Context) => {
  const fecha = ctx.request.url.searchParams.get("fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "Debes indicar ?fecha=YYYY-MM-DD" };
    return;
  }
  const result = await citaModel.ObtenerDisponibilidad(fecha);
  ctx.response.status = 200;
  ctx.response.body = { success: true, data: result };
};

export const PostCrearCita = async (ctx: Context) => {
  const { request, response } = ctx;
  try {
    const id_cliente = await resolverIdCliente(ctx);
    if (!id_cliente) {
      response.status = 403;
      response.body = { success: false, message: "No existe un perfil de cliente asociado" };
      return;
    }
    const body = await request.body.json() as { id_vehiculo?: number; fecha?: string; hora?: string; motivo?: string };
    if (!Number.isInteger(Number(body.id_vehiculo)) || !body.fecha || !body.hora) {
      response.status = 400;
      response.body = { success: false, message: "id_vehiculo, fecha y hora son obligatorios" };
      return;
    }
    if (!(await vehiculoModel.PerteneceACliente(Number(body.id_vehiculo), id_cliente))) {
      response.status = 403;
      response.body = { success: false, message: "Ese vehículo no pertenece a tu cuenta" };
      return;
    }
    const fechaHora = combinarFechaHora(body.fecha, body.hora);
    const resultado = await citaModel.Crear(id_cliente, Number(body.id_vehiculo), fechaHora, body.motivo?.trim() || null);
    if (resultado.success && resultado.id_cita) {
      const cliente = await clienteModel.ObtenerContactoPorId(id_cliente);
      if (cliente) await avisarleAlAdminDeCitaPendiente(resultado.id_cita, cliente.nombre_completo);
    }
    response.status = resultado.success ? 201 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};

export const PatchElegirHorario = async (ctx: RouterContext<"/api/citas/:id/elegir-horario">) => {
  const { request, response, params } = ctx;
  try {
    const id_cliente = await resolverIdCliente(ctx);
    if (!id_cliente) {
      response.status = 403;
      response.body = { success: false, message: "No existe un perfil de cliente asociado" };
      return;
    }
    const body = await request.body.json() as { fecha?: string; hora?: string };
    if (!body.fecha || !body.hora) {
      response.status = 400;
      response.body = { success: false, message: "fecha y hora son obligatorios" };
      return;
    }
    const resultado = await citaModel.ElegirHorario(
      Number(params.id), id_cliente, combinarFechaHora(body.fecha, body.hora),
    );
    if (resultado.success) {
      const cliente = await clienteModel.ObtenerContactoPorId(id_cliente);
      if (cliente) await avisarleAlAdminDeCitaPendiente(Number(params.id), cliente.nombre_completo);
    }
    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};

export const GetMisCitas = async (ctx: Context) => {
  const id_cliente = await resolverIdCliente(ctx);
  if (!id_cliente) {
    ctx.response.status = 403;
    ctx.response.body = { success: false, message: "No existe un perfil de cliente asociado" };
    return;
  }
  ctx.response.status = 200;
  ctx.response.body = { success: true, data: await citaModel.MisCitas(id_cliente) };
};

export const GetListarCitas = async (ctx: Context) => {
  const estado = ctx.request.url.searchParams.get("estado") ?? undefined;
  const fecha = ctx.request.url.searchParams.get("fecha") ?? undefined;
  ctx.response.status = 200;
  ctx.response.body = { success: true, data: await citaModel.Listar({ estado, fecha }) };
};

export const PatchConfirmarCita = async (ctx: RouterContext<"/api/citas/:id/confirmar">) => {
  const { response, params, state } = ctx;
  const user = state.user as { sub: string };
  const cita = await citaModel.ObtenerPorId(Number(params.id));
  const resultado = await citaModel.Confirmar(Number(params.id), Number(user.sub));
  if (resultado.success && cita?.fecha_hora) {
    const cliente = await clienteModel.ObtenerContactoPorId(cita.id_cliente);
    if (cliente) {
      const { asunto, mensaje, html } = correoCitaConfirmada(cliente.nombre_completo, String(cita.fecha_hora));
      await enviarYRegistrarCorreo({ id_cliente: cita.id_cliente, id_cita: cita.id_cita,
        destinatario: cliente.correo, asunto, mensaje, html, tipo_correo: "CitaConfirmada" });
    }
  }
  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};

export const PatchRechazarCita = async (ctx: RouterContext<"/api/citas/:id/rechazar">) => {
  const { request, response, params, state } = ctx;
  const user = state.user as { sub: string };
  const body = await request.body.json() as { motivo?: string };
  const motivo = body.motivo?.trim();
  if (!motivo) {
    response.status = 400;
    response.body = { success: false, message: "Debes indicar el motivo del rechazo" };
    return;
  }
  const cita = await citaModel.ObtenerPorId(Number(params.id));
  const resultado = await citaModel.Rechazar(Number(params.id), Number(user.sub), motivo);
  if (resultado.success && cita?.fecha_hora) {
    const cliente = await clienteModel.ObtenerContactoPorId(cita.id_cliente);
    if (cliente) {
      const { asunto, mensaje, html } = correoCitaRechazada(cliente.nombre_completo, String(cita.fecha_hora), motivo);
      await enviarYRegistrarCorreo({ id_cliente: cita.id_cliente, id_cita: cita.id_cita,
        destinatario: cliente.correo, asunto, mensaje, html, tipo_correo: "CitaRechazada" });
    }
  }
  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};

export const PatchCompletarCita = async (ctx: RouterContext<"/api/citas/:id/completar">) => {
  const { response, params, state } = ctx;
  const user = state.user as { sub: string };
  const cita = await citaModel.ObtenerPorId(Number(params.id));
  const resultado = await citaModel.Completar(Number(params.id), Number(user.sub));
  if (resultado.success && cita?.id_mantenimiento) {
    const [vehiculo] = await conexion.query(
      `SELECT km_actuales FROM vehiculos WHERE id_vehiculo = ?`, [cita.id_vehiculo],
    );
    if (vehiculo) {
      await new MantenimientoModel().MarcarRealizado(
        Number(cita.id_mantenimiento), Number(vehiculo.km_actuales),
      );
    }
  }
  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};

export const PatchCancelarCita = async (ctx: RouterContext<"/api/citas/:id/cancelar">) => {
  const { response, params, state } = ctx;
  const user = state.user as { sub: string; rol?: string };
  const id_cliente = user.rol === "Cliente" ? await resolverIdCliente(ctx) : undefined;
  const resultado = await citaModel.Cancelar(Number(params.id), id_cliente ?? undefined);
  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};
