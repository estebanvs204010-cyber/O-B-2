import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { conexion } from "../Model/conexion.ts";
import { CitaModel } from "../Model/citaModel.ts";
import { Cliente } from "../Model/clienteModel.ts";
import { combinarFechaHora } from "../Helpers/horarioAtencion.ts";
import { enviarYRegistrarCorreo } from "../Helpers/correoLogger.ts";
import { crearNotificacionParaRol } from "../Helpers/notificacionesService.ts";
import { correoCitaConfirmada, correoCitaRechazada } from "../Helpers/templates.ts";

const citaModel = new CitaModel();
const clienteModel = new Cliente();

interface UsuarioJwt {
  sub?: string;
}

function obtenerIdUsuario(ctx: Context): number | null {
  const usuario = ctx.state.user as UsuarioJwt | undefined;
  const idUsuario = Number(usuario?.sub);
  return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

// El JWT solo trae el id_usuario. Esto lo traduce a id_cliente, igual que
// hace clientePortalController.ts para el resto del portal de cliente.
async function resolverIdCliente(ctx: Context): Promise<number | null> {
  const idUsuario = obtenerIdUsuario(ctx);
  if (!idUsuario) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Usuario no autenticado" };
    return null;
  }

  const [cliente] = await conexion.query(
    `SELECT id_cliente FROM clientes WHERE id_usuario = ? AND activo = 1`,
    [idUsuario],
  );

  if (!cliente) {
    ctx.response.status = 403;
    ctx.response.body = { success: false, message: "Este usuario no tiene un perfil de cliente asociado" };
    return null;
  }
  return cliente.id_cliente;
}

async function perteneceACliente(id_vehiculo: number, id_cliente: number): Promise<boolean> {
  const [fila] = await conexion.query(
    `SELECT id_vehiculo FROM vehiculos WHERE id_vehiculo = ? AND id_cliente = ? AND activo = 1`,
    [id_vehiculo, id_cliente],
  );
  return !!fila;
}

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

// GET /api/citas/disponibilidad?fecha=YYYY-MM-DD
export const GetDisponibilidad = async (ctx: Context) => {
  const { request, response } = ctx;
  const fecha = request.url.searchParams.get("fecha");

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    response.status = 400;
    response.body = { success: false, message: "Debes indicar ?fecha=YYYY-MM-DD" };
    return;
  }

  const disponibilidad = await citaModel.ObtenerDisponibilidad(fecha);
  response.status = 200;
  response.body = { success: true, data: disponibilidad };
};

// POST /api/citas  { id_vehiculo, fecha, hora, motivo }
export const PostCrearCita = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const id_cliente = await resolverIdCliente(ctx);
    if (!id_cliente) return;

    const body = await request.body.json() as {
      id_vehiculo?: number;
      fecha?: string;
      hora?: string;
      motivo?: string;
    };

    if (!body.id_vehiculo || !body.fecha || !body.hora) {
      response.status = 400;
      response.body = { success: false, message: "id_vehiculo, fecha y hora son obligatorios" };
      return;
    }

    const esDelCliente = await perteneceACliente(body.id_vehiculo, id_cliente);
    if (!esDelCliente) {
      response.status = 403;
      response.body = { success: false, message: "Ese vehículo no pertenece a tu cuenta" };
      return;
    }

    const fechaHora = combinarFechaHora(body.fecha, body.hora);
    const resultado = await citaModel.Crear(id_cliente, body.id_vehiculo, fechaHora, body.motivo ?? null);

    if (resultado.success && resultado.id_cita) {
      const cliente = await clienteModel.ObtenerPorId(id_cliente);
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

// PATCH /api/citas/:id/elegir-horario  { fecha, hora }
export const PatchElegirHorario = async (ctx: RouterContext<"/api/citas/:id/elegir-horario">) => {
  const { request, response, params } = ctx;

  try {
    const id_cliente = await resolverIdCliente(ctx);
    if (!id_cliente) return;

    const body = await request.body.json() as { fecha?: string; hora?: string };
    if (!body.fecha || !body.hora) {
      response.status = 400;
      response.body = { success: false, message: "fecha y hora son obligatorios" };
      return;
    }

    const fechaHora = combinarFechaHora(body.fecha, body.hora);
    const resultado = await citaModel.ElegirHorario(Number(params.id), id_cliente, fechaHora);

    if (resultado.success) {
      const cliente = await clienteModel.ObtenerPorId(id_cliente);
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

// GET /api/citas/mias
export const GetMisCitas = async (ctx: Context) => {
  const { response } = ctx;
  const id_cliente = await resolverIdCliente(ctx);
  if (!id_cliente) return;

  const citas = await citaModel.MisCitas(id_cliente);
  response.status = 200;
  response.body = { success: true, data: citas };
};

// GET /api/citas?estado=Pendiente&fecha=YYYY-MM-DD   (Admin / Mecanico)
export const GetListarCitas = async (ctx: Context) => {
  const { request, response } = ctx;
  const estado = request.url.searchParams.get("estado") ?? undefined;
  const fecha = request.url.searchParams.get("fecha") ?? undefined;

  const citas = await citaModel.Listar({ estado, fecha });
  response.status = 200;
  response.body = { success: true, data: citas };
};

// PATCH /api/citas/:id/confirmar   (Admin)
export const PatchConfirmarCita = async (ctx: RouterContext<"/api/citas/:id/confirmar">) => {
  const { response, params } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  const cita = await citaModel.ObtenerPorId(Number(params.id));
  const resultado = await citaModel.Confirmar(Number(params.id), Number(idUsuario));

  if (resultado.success && cita) {
    const cliente = await clienteModel.ObtenerPorId(cita.id_cliente);
    if (cliente && cita.fecha_hora) {
      const { asunto, mensaje, html } = correoCitaConfirmada(cliente.nombre_completo, cita.fecha_hora);
      enviarYRegistrarCorreo({
        id_cliente: cita.id_cliente,
        destinatario: cliente.correo,
        asunto,
        mensaje,
        html,
        tipo_correo: "CitaConfirmada",
      });
    }
  }

  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};

// PATCH /api/citas/:id/rechazar   { motivo }   (Admin)
export const PatchRechazarCita = async (ctx: RouterContext<"/api/citas/:id/rechazar">) => {
  const { request, response, params } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  const body = await request.body.json() as { motivo?: string };
  if (!body.motivo) {
    response.status = 400;
    response.body = { success: false, message: "Debes indicar el motivo del rechazo" };
    return;
  }

  const cita = await citaModel.ObtenerPorId(Number(params.id));
  const resultado = await citaModel.Rechazar(Number(params.id), Number(idUsuario), body.motivo);

  if (resultado.success && cita) {
    const cliente = await clienteModel.ObtenerPorId(cita.id_cliente);
    if (cliente && cita.fecha_hora) {
      const { asunto, mensaje, html } = correoCitaRechazada(cliente.nombre_completo, cita.fecha_hora, body.motivo);
      enviarYRegistrarCorreo({
        id_cliente: cita.id_cliente,
        destinatario: cliente.correo,
        asunto,
        mensaje,
        html,
        tipo_correo: "CitaRechazada",
      });
    }
  }

  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};

// PATCH /api/citas/:id/completar   (Admin / Mecanico)
export const PatchCompletarCita = async (ctx: RouterContext<"/api/citas/:id/completar">) => {
  const { response, params } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  const resultado = await citaModel.Completar(Number(params.id), Number(idUsuario));
  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};

// PATCH /api/citas/:id/cancelar   (Cliente o Admin)
export const PatchCancelarCita = async (ctx: RouterContext<"/api/citas/:id/cancelar">) => {
  const { response, params } = ctx;
  const resultado = await citaModel.Cancelar(Number(params.id));
  response.status = resultado.success ? 200 : 400;
  response.body = resultado;
};
