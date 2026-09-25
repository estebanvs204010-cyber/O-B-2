import type { APIRoute } from "astro";
import { getTokenSRR } from "../../utils/auth";

const DENO_API_URL = "http://127.0.0.1:8002";

async function reenviar({ params, request, cookies }: { params: { path?: string }; request: Request; cookies: any }) {
  const token = getTokenSRR(cookies);
  const path = params.path ?? "";
  const search = new URL(request.url).search;

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: string | undefined;
  const metodosConBody = ["POST", "PUT", "PATCH"];
  if (metodosConBody.includes(request.method)) {
    headers["Content-Type"] = "application/json";
    body = await request.text();
  }

  try {
    const denoResponse = await fetch(`${DENO_API_URL}/api/${path}${search}`, {
      method: request.method,
      headers,
      body,
    });

    const data = await denoResponse.text();

    return new Response(data, {
      status: denoResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: "Error al conectar con el servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const GET: APIRoute = (context) => reenviar(context as any);
export const POST: APIRoute = (context) => reenviar(context as any);
export const PUT: APIRoute = (context) => reenviar(context as any);
export const DELETE: APIRoute = (context) => reenviar(context as any);