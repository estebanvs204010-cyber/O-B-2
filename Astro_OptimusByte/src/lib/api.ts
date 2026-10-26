export const API_BASE_URL = "";

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
  token?: string;
}

/*
 * La sesión se guarda en una cookie HttpOnly desde el backend.
 * Esta función se conserva para evitar errores en login. 
 * No utiliza localStorage.
 */
export function guardarSesion(
  _token: string,
  _usuario: Usuario,
): void {
  // La cookie la crea el backend durante el login.
}

export async function cerrarSesion(): Promise<void> {
  await fetch("/api/auth/logout", {
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

  const response = await fetch(path, {
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

  if (rolNormalizado === "admin") {
    return "/admin";
  }

  if (rolNormalizado === "mecanico") {
    return "/mecanico";
  }

  if (rolNormalizado === "cliente") {
    return "/cliente";
  }

  return "/portal";
}

export function formatearFecha(
  fecha?: string | null,
): string {
  if (!fecha) {
    return "—";
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatearFechaHora(
  fecha?: string | null,
): string {
  if (!fecha) {
    return "—";
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ESTADOS_ORDEN = [
  "Pendiente",
  "En Proceso",
  "Esperando Repuestos",
  "Finalizado",
  "Entregado",
  "Cancelado",
] as const;

export function claseEstado(estado: string): string {
  const mapa: Record<string, string> = {
    Pendiente: "badge-pendiente",
    "En Proceso": "badge-proceso",
    "Esperando Repuestos": "badge-espera",
    Finalizado: "badge-listo",
    Entregado: "badge-listo",
    Cancelado: "badge-cancelado",
  };

  return mapa[estado] ?? "badge-pendiente";
}