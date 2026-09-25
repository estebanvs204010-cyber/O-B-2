// src/lib/api.ts
// Helper central para hablar con el backend Deno/Oak y manejar la sesión (JWT) en el navegador.

export const API_BASE_URL = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8002";

export interface Usuario {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  rol: "Admin" | "Mecanico" | "Cliente";
}

const TOKEN_KEY = "ob_token";
const USUARIO_KEY = "ob_usuario";

// ---------- Sesión (localStorage) ----------
export function guardarSesion(token: string, usuario: Usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function obtenerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function obtenerUsuario(): Usuario | null {
  const raw = localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

// Redirige a /login si no hay sesión o el rol no está permitido.
// Devuelve el usuario si todo está OK (para usarlo en la página).
export function exigirRol(rolesPermitidos: Array<Usuario["rol"]>): Usuario | null {
  const usuario = obtenerUsuario();
  const token = obtenerToken();

  if (!token || !usuario || !rolesPermitidos.includes(usuario.rol)) {
    cerrarSesion();
    window.location.href = "/login";
    return null;
  }

  return usuario;
}

// A dónde mandar a cada rol después de iniciar sesión.
export function rutaSegunRol(rol: Usuario["rol"]): string {
  if (rol === "Mecanico") return "/mecanico";
  if (rol === "Admin") return "/admin";
  if (rol === "Cliente") return "/cliente";
  return "/portal";
}

// ---------- fetch autenticado ----------
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  usuario?: Usuario;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = obtenerToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  // Token vencido o inválido -> a login.
  if (res.status === 401) {
    cerrarSesion();
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
