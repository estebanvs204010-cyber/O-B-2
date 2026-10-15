const COOKIE_NAME = "ob_token";

type HeadersCompatibles = {
  get(nombre: string): string | null;
  set(nombre: string, valor: string): void;
};

type ObjetoConHeaders = {
  headers: HeadersCompatibles;
};

export function obtenerTokenCookie(
  request: ObjetoConHeaders,
): string | null {
  const cookies = request.headers.get("Cookie") ?? "";

  const cookie = cookies
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(
    cookie.substring(COOKIE_NAME.length + 1),
  );
}

export function guardarTokenCookie(
  response: ObjetoConHeaders,
  token: string,
) {
  response.headers.set(
    "Set-Cookie",
    [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=3600",
    ].join("; "),
  );
}

export function eliminarTokenCookie(
  response: ObjetoConHeaders,
) {
  response.headers.set(
    "Set-Cookie",
    [
      `${COOKIE_NAME}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
    ].join("; "),
  );
}