import type { APIRoute } from "astro";

const DENO_API_URL = "http://127.0.0.1:8002";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as { credential?: string };
    if (!body.credential) {
      return Response.json({ success: false, message: "No se recibió la credencial de Google" }, { status: 400 });
    }

    const denoResponse = await fetch(`${DENO_API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: body.credential }),
    });
    const data = await denoResponse.json();

    if (denoResponse.ok && data.token && data.usuario) {
      cookies.set("jwt_token", data.token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });
      return Response.json({ success: true, usuario: data.usuario });
    }

    return Response.json(
      { success: false, message: data.message ?? "No se pudo iniciar sesión con Google" },
      { status: denoResponse.status || 401 },
    );
  } catch {
    return Response.json({ success: false, message: "Error al conectar con el servidor" }, { status: 500 });
  }
};
