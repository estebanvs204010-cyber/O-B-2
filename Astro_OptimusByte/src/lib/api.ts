// Helper central para hablar con el backend.
// La sesión vive en una cookie HttpOnly.

export interface Usuario {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  rol: "Admin" | "Mecanico" | "Cliente";
}

// Ruta inicial para cada rol después de iniciar sesión.
export function rutaSegunRol(rol: Usuario["rol"]): string {
  if (rol === "Mecanico") return "/mecanico";
  if (rol === "Admin") return "/admin";
  if (rol === "Cliente") return "/cliente";

  return "/login";
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  usuario?: Usuario;
}

// Fetch autenticado: Astro obtiene el JWT desde la cookie HttpOnly.
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(path, {
    ...options,
    headers,
  });

  // Durante el login, necesitamos mostrar el mensaje del backend.
  // Para las demás rutas, 401 significa sesión expirada.
  if (res.status === 401 && path !== "/api/auth/login") {
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

  const data = (await res.json().catch(() => ({}))) as ApiResponse<T>;

  if (!res.ok) {
    throw new Error(data.message ?? `Error ${res.status}`);
  }

  return data;
}

export function formatearFecha(fecha?: string | null): string {
  if (!fecha) return "—";

  const d = new Date(fecha);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}



export function formatearFechaHora(fecha?: string | null): string {
  if (!fecha) return "—";

  const d = new Date(fecha);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("es-CO", {
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