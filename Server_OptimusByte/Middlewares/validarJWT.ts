import { VerificarTokenAcceso } from "../Helpers/Jwt.ts";
import { obtenerTokenCookie } from "../Helpers/cookies.ts";
import { Context, Next } from "../Dependencies/dependencias.ts";

export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  let token: string | null = obtenerTokenCookie(ctx.request);

  if (authHeader) {
    const [scheme, bearerToken] = authHeader.trim().split(/\s+/);

    if (scheme === "Bearer" && bearerToken) {
      token = bearerToken;
    }
  }

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      message: "No tiene autenticación",
    };
    return;
  }

  const usuario = await VerificarTokenAcceso(token);

  if (!usuario) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      message: "Token inválido o expirado",
    };
    return;
  }

  ctx.state.user = usuario;
  await next();
}

export function permitirRoles(...rolesPermitidos: string[]) {
  return async (ctx: Context, next: Next) => {
    const usuario = ctx.state.user as { rol?: string } | undefined;

    const rolUsuario = usuario?.rol?.trim().toLowerCase() ?? "";

    const tienePermiso = rolesPermitidos.some(
      (rol) => rol.trim().toLowerCase() === rolUsuario,
    );

    if (!usuario || !tienePermiso) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "No tiene permisos para esta acción",
      };
      return;
    }

    await next();
  };
}