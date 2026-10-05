import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import {
  contarNoLeidas,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from "../Helpers/notificacionesService.ts";

function idUsuarioDelToken(ctx: Context): number {
  const user = ctx.state.user as { sub: string };
  return Number(user.sub);
}

// GET /api/notificaciones?soloNoLeidas=true
export const GetNotificaciones = async (ctx: Context) => {
  const { request, response } = ctx;
  const soloNoLeidas = request.url.searchParams.get("soloNoLeidas") === "true";

  const datos = await listarNotificaciones(idUsuarioDelToken(ctx), soloNoLeidas);
  response.status = 200;
  response.body = { success: true, data: datos };
};

// GET /api/notificaciones/contador  → para el numerito rojo de la campana
export const GetContadorNotificaciones = async (ctx: Context) => {
  const { response } = ctx;
  const total = await contarNoLeidas(idUsuarioDelToken(ctx));
  response.status = 200;
  response.body = { success: true, data: { noLeidas: total } };
};

// PATCH /api/notificaciones/:id/leer
export const PatchMarcarLeida = async (ctx: RouterContext<"/api/notificaciones/:id/leer">) => {
  const { response, params } = ctx;
  await marcarLeida(Number(params.id), idUsuarioDelToken(ctx));
  response.status = 200;
  response.body = { success: true, message: "Notificación marcada como leída" };
};

// PATCH /api/notificaciones/leer-todas
export const PatchMarcarTodasLeidas = async (ctx: Context) => {
  const { response } = ctx;
  await marcarTodasLeidas(idUsuarioDelToken(ctx));
  response.status = 200;
  response.body = { success: true, message: "Todas las notificaciones marcadas como leídas" };
};
