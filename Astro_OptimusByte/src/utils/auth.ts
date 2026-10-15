const COOKIE_NAME = "ob_token";

interface CookieValue {
  value: string;
}

interface CookiesSSR {
  get(nombre: string): CookieValue | undefined;
}

interface JwtPayload {
  sub?: string;
  rol?: string;
  exp?: number;
}

export function isAuthenticatedSSR(
  cookies: CookiesSSR,
): boolean {
  const token = cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  const payload = obtenerPayload(token);

  if (!payload) {
    return false;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return false;
  }

  return true;
}

export function getRolSSR(
  cookies: CookiesSSR,
): string | null {
  const token = cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = obtenerPayload(token);

  return payload?.rol?.trim() ?? null;
}

function obtenerPayload(
  token: string,
): JwtPayload | null {
  try {
    const partes = token.split(".");

    if (partes.length !== 3) {
      return null;
    }

    const payloadBase64 = partes[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const json = atob(payloadBase64);

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}