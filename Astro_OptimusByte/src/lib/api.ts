export const API_BASE_URL =
  import.meta.env.PUBLIC_API_URL ?? "http://localhost:8002";

export interface Usuario {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  rol: "Admin" | "Mecanico" | "Cliente";
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  usuario?: Usuario;
}

export async function cerrarSesion(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(data.message ?? `Error ${response.status}`);
  }

  return data;
}

export function rutaSegunRol(rol: Usuario["rol"]): string {
  const rolNormalizado = rol.trim().toLowerCase();

  if (rolNormalizado === "admin") return "/admin";
  if (rolNormalizado === "mecanico") return "/mecanico";
  if (rolNormalizado === "cliente") return "/cliente";

  return "/portal";
}