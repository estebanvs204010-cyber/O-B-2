/**
 * Verifica si el token existe Y no ha expirado (leyendo el campo "exp" del JWT).
 * No verifica la firma (eso lo hace el backend), pero es suficiente para
 * decidir si vale la pena mostrar la app como "logueado" o mandar a /login.
 */
export function isAuthenticatedSSR(cookies: { get: (key: string) => { value: string } | undefined }): boolean {
  const token = cookies.get('jwt_token')?.value;
  if (!token) return false;

  try {
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    const ahoraEnSegundos = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < ahoraEnSegundos) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** Obtiene el token JWT crudo desde la cookie httpOnly. */
export function getTokenSRR(cookies: { get: (key: string) => { value: string } | undefined }): string | null {
  return cookies.get('jwt_token')?.value ?? null;
}

/**
 * Extrae el rol del payload del JWT, sin verificar la firma.
 * OJO: esto es solo para decidir qué página mostrar (UX), no es la
 * verificación de seguridad real — esa ya la hace el backend Deno
 * con "permitirRoles" en cada endpoint protegido.
 */
export function getRolSSR(cookies: { get: (key: string) => { value: string } | undefined }): string | null {
  const token = getTokenSRR(cookies);
  if (!token) return null;

  try {
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    return payload.rol ?? null;
  } catch {
    return null;
  }
}