import type { APIRoute } from "astro";
import { normalizarRol } from "../../../utils/auth";

const DENO_API_URL = "http://127.0.0.1:8002";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Lee el payload del JWT (sin verificar firma; eso lo hace el backend Deno).
function leerPayloadJwt(token: string): Record<string, any> | null {
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    return JSON.parse(atob(parte.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    const denoResponse = await fetch(`${DENO_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: body.correo,
        contrasena: body.contrasena,
      }),
    });

    const data = await denoResponse.json().catch(() => ({}));

    // El backend Deno entrega el JWT en una cookie HttpOnly ("ob_token") vía Set-Cookie,
    // no en el cuerpo. La leemos aquí y la guardamos como "jwt_token" en Astro.
    const tokenDeCookie = denoResponse.headers
      .getSetCookie()
      .map((c) => c.trim())
      .find((c) => c.startsWith("ob_token="))
      ?.split(";")[0]
      .slice("ob_token=".length);

    // Respaldo: por si algún día el backend lo manda en el cuerpo (raíz o dentro de "data").
    const token: string | undefined =
      (tokenDeCookie ? decodeURIComponent(tokenDeCookie) : undefined) ??
      data.token ??
      data.data?.token ??
      data.access_token ??
      data.data?.access_token ??
      data.jwt ??
      data.data?.jwt;

    if (denoResponse.ok && token) {
      cookies.set("jwt_token", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hora, igual que la expiración del JWT
      });

      // Usuario: del cuerpo de la respuesta o, si no viene, del propio JWT.
      const payload = leerPayloadJwt(token);
      const u = data.usuario ?? data.data?.usuario ?? data.user ?? data.data?.user ?? {};

      const usuario = {
        id_usuario: u.id_usuario ?? u.id ?? payload?.id_usuario ?? payload?.id ?? payload?.sub,
        nombre_completo: u.nombre_completo ?? u.nombre ?? payload?.nombre_completo ?? payload?.nombre,
        correo: u.correo ?? payload?.correo ?? body.correo,
        rol: normalizarRol(u.rol ?? u.role ?? payload?.rol ?? payload?.role),
      };

      // El token NUNCA viaja de vuelta al navegador — solo lo que necesita para redirigir.
      return json({ success: true, usuario });
    }

    // Ayuda para depurar: en la terminal de Astro se ve qué campos mandó el Deno.
    console.warn(
      "[login] Deno respondió",
      denoResponse.status,
      "sin token reconocible. Campos recibidos:",
      Object.keys(data),
      data.data && typeof data.data === "object" ? `data: ${Object.keys(data.data)}` : "",
    );

    return json(
      {
        success: false,
        message: denoResponse.ok
          ? "El servidor respondió, pero no entregó el token de sesión"
          : (data.message ?? "Credenciales incorrectas"),
      },
      denoResponse.ok ? 502 : denoResponse.status || 401,
    );
  } catch (error) {
    return json({ success: false, message: "Error al conectar con el servidor" }, 500);
  }
};
