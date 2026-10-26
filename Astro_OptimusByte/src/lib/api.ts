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
  // Cookie del backend Deno (ob_token) y cookies propias de Astro (jwt_token / ob_token).
  await Promise.allSettled([
    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }),
    fetch("/api/auth/logout", { method: "POST" }),
  ]);
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

  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  // Solo se expulsa a /login cuando la sesión expiró en una ruta protegida.
  // En /api/auth/* (login, recuperación…) el 401 significa "credenciales
  // incorrectas" y el mensaje debe mostrarse en el formulario.
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    throw new Error(data.message ?? `Error ${response.status}`);
  }

  return data;
}

export function rutaSegunRol(rol: Usuario["rol"]): string {
  const rolNormalizado = String(rol ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (rolNormalizado.startsWith("admin")) {
    return "/admin";
  }

  if (rolNormalizado.startsWith("mec") || rolNormalizado.startsWith("tecn")) {
    return "/mecanico";
  }

  if (rolNormalizado.startsWith("cli")) {
    return "/cliente";
  }

  return "/login";
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

/* Devuelve la clase CSS del badge según el estado de la orden. */
export function claseEstado(estado?: string | null): string {
  switch (estado) {
    case "Pendiente":
      return "badge-pendiente";
    case "En Proceso":
      return "badge-proceso";
    case "Esperando Repuestos":
      return "badge-espera";
    case "Finalizado":
    case "Entregado":
      return "badge-listo";
    case "Cancelado":
      return "badge-cancelado";
    default:
      return "badge-pendiente";
  }
}
