/**
 * Verifica si el token existe y no ha expirado leyendo el campo "exp" del JWT.
 * No verifica la firma: esa validación real se realiza en el backend Deno.
 */
export function isAuthenticatedSSR(
  cookies: {
    get: (key: string) => { value: string } | undefined;
  },
): boolean {
  const token = cookies.get("jwt_token")?.value;

  if (!token) return false;

  try {
    const payloadBase64 = token.split(".")[1];

    if (!payloadBase64) {
      return false;
    }

    const payloadJson = atob(
      payloadBase64.replace(/-/g, "+").replace(/_/g, "/"),
    );

    const payload = JSON.parse(payloadJson);
    const ahoraEnSegundos = Math.floor(Date.now() / 1000);

    if (
      typeof payload.exp === "number" &&
      payload.exp < ahoraEnSegundos
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene el JWT desde la cookie HttpOnly.
 */
export function getTokenSRR(
  cookies: {
    get: (key: string) => { value: string } | undefined;
  },
): string | null {
  return cookies.get("jwt_token")?.value ?? null;
}

/**
 * Extrae el rol del JWT para redirecciones de interfaz.
 * La validación real de permisos ocurre en el backend Deno.
 */
export function getRolSSR(
  cookies: {
    get: (key: string) => { value: string } | undefined;
  },
): string | null {
  const token = getTokenSRR(cookies);

  if (!token) return null;

  try {
    const payloadBase64 = token.split(".")[1];

    if (!payloadBase64) {
      return null;
    }

    const payloadJson = atob(
      payloadBase64.replace(/-/g, "+").replace(/_/g, "/"),
    );

    const payload = JSON.parse(payloadJson);

    return typeof payload.rol === "string" ? payload.rol : null;
  } catch {
    return null;
  }
}