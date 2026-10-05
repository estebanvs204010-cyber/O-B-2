import type { APIRoute } from "astro";

const DENO_API_URL = "http://127.0.0.1:8002";

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

    const data = await denoResponse.json();

    if (denoResponse.ok && data.token) {
      cookies.set("jwt_token", data.token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hora, igual que la expiración del JWT
      });

      // El token NUNCA viaja de vuelta al navegador — solo lo que necesita para redirigir.
      return new Response(JSON.stringify({ success: true, usuario: data.usuario }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, message: data.message ?? "Credenciales incorrectas" }), {
      status: denoResponse.status || 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: "Error al conectar con el servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};