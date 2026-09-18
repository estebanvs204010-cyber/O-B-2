import { VerificarTokenAcceso } from "../Helpers/Jwt.ts";
import { Context, Next } from "../Dependencies/dependencias.ts";

// Middleware para proteger rutas: exige un token válido
export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No tiene autenticación" };
    return;
  }

  const [scheme, token] = authHeader.trim().split(/\s+/);

  if (scheme !== "Bearer" || !token) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Formato de autenticación inválido" };
    return;
  }

  const usuario = await VerificarTokenAcceso(token);

  if (!usuario) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Token inválido o expirado" };
    return;
  }

  ctx.state.user = usuario;
  await next();
}

// Middleware para proteger rutas por rol.
// Uso: permitirRoles("Admin") o permitirRoles("Admin", "Mecanico")
// Se usa DESPUÉS de authMiddleware, porque necesita ctx.state.user ya definido.
export function permitirRoles(...rolesPermitidos: string[]) {
  return async (ctx: Context, next: Next) => {
    const usuario = ctx.state.user as { rol?: string } | undefined;

    if (!usuario || !rolesPermitidos.includes(usuario.rol ?? "")) {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "No tiene permisos para esta acción" };
      return;
    }

    await next();
  };
}