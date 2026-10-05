import { RouterContext } from "../Dependencies/dependencias.ts";
import { MantenimientoModel } from "../Model/mantenimientoModel.ts";

const mantenimientoModel = new MantenimientoModel();

// PATCH /api/mantenimiento/vehiculos/:id/km   { km_nuevo }
// Lo usa el Admin/Mecánico, típicamente al recibir el vehículo en el taller.
// Internamente actualiza el km y dispara la revisión de mantenimientos vencidos.
export const PatchActualizarKm = async (ctx: RouterContext<"/api/mantenimiento/vehiculos/:id/km">) => {
  const { request, response, params } = ctx;

  try {
    const body = await request.body.json() as { km_nuevo?: number };
    if (body.km_nuevo === undefined || body.km_nuevo === null) {
      response.status = 400;
      response.body = { success: false, message: "km_nuevo es obligatorio" };
      return;
    }

    const resultado = await mantenimientoModel.ActualizarKmYVerificar(Number(params.id), body.km_nuevo);
    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};

// GET /api/mantenimiento/vehiculos/:id
export const GetMantenimientoDeVehiculo = async (ctx: RouterContext<"/api/mantenimiento/vehiculos/:id">) => {
  const { response, params } = ctx;
  const datos = await mantenimientoModel.ObtenerPorVehiculo(Number(params.id));
  response.status = 200;
  response.body = { success: true, data: datos };
};

// PATCH /api/mantenimiento/:id/realizado   { km_realizado }
// Se usa cuando el taller efectivamente hizo la parte (ej. cambió el aceite):
// reinicia el conteo para el siguiente ciclo.
export const PatchMarcarRealizado = async (ctx: RouterContext<"/api/mantenimiento/:id/realizado">) => {
  const { request, response, params } = ctx;

  const body = await request.body.json() as { km_realizado?: number };
  if (body.km_realizado === undefined) {
    response.status = 400;
    response.body = { success: false, message: "km_realizado es obligatorio" };
    return;
  }

  await mantenimientoModel.MarcarRealizado(Number(params.id), body.km_realizado);
  response.status = 200;
  response.body = { success: true, message: "Mantenimiento marcado como realizado" };
};
