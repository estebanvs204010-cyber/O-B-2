// src/lib/api.ts
// Helper central para hablar con el backend. La sesión vive en una cookie
// httpOnly (el navegador la manda solo, no hay nada que guardar/leer aquí).

export interface Usuario {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  rol: "Admin" | "Mecanico" | "Cliente";
}

// A dónde mandar a cada rol después de iniciar sesión.
export function rutaSegunRol(rol: Usuario["rol"]): string {
  if (rol === "Mecanico") return "/mecanico";
  if (rol === "Admin") return "/admin";
  return "/portal";
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  usuario?: Usuario;
}

// ---------- fetch autenticado ----------
// Ya NO recibe ni maneja el token: la cookie httpOnly viaja sola en cada
// petición porque es del mismo origen (misma URL) que la página.
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

  const data = (await res.json().catch(() => ({}))) as ApiResponse<T>;

  if (!res.ok) {
    throw new Error(data.message ?? `Error ${res.status}`);
  }

  return data;
}

// ---------- formato ----------
export function formatearFecha(fecha?: string | null): string {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
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
    "Pendiente": "badge-pendiente",
    "En Proceso": "badge-proceso",
    "Esperando Repuestos": "badge-espera",
    "Finalizado": "badge-listo",
    "Entregado": "badge-listo",
    "Cancelado": "badge-cancelado",
  };
  return mapa[estado] ?? "badge-pendiente";
}