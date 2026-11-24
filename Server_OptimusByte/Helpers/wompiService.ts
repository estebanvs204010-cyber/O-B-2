import "https://deno.land/std@0.224.0/dotenv/load.ts";

export interface WompiConfig {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
  apiUrl: string;
}

export function obtenerConfiguracionWompi(): WompiConfig {
  const publicKey = (
    Deno.env.get("WOMPI_PUBLIC_KEY") ?? "pub_test_X0zDA9xoKdePuotLdvdqqVioT6BHbgD6"
  ).trim();
  const privateKey = (
    Deno.env.get("WOMPI_PRIVATE_KEY") ?? "prv_test_V0aN9c9wP3n1QW7xYZ8bCD2eFG4hIJ6k"
  ).trim();
  const integritySecret = (
    Deno.env.get("WOMPI_INTEGRITY_SECRET") ?? "test_integrity_4hn55x78d91z4q59c86w"
  ).trim();
  const eventsSecret = (
    Deno.env.get("WOMPI_EVENTS_SECRET") ?? "test_events_7x9q3z1w5a8m2b4c6e0d"
  ).trim();
  const apiUrl = (
    Deno.env.get("WOMPI_API_URL") ?? "https://sandbox.wompi.co/v1"
  ).trim().replace(/\/$/, "");

  return {
    publicKey,
    privateKey,
    integritySecret,
    eventsSecret,
    apiUrl,
  };
}

/**
 * Genera una referencia única para cada transacción en formato OB-<timestamp>-<random>.
 */
export function generarReferenciaUnica(): string {
  const timestamp = Date.now();
  const sufijo = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `OB-${timestamp}-${sufijo}`;
}

/**
 * Calcula la firma de integridad oficial de Wompi Colombia (SHA-256 en minúsculas):
 * Cadena: <referencia><monto_en_centavos><moneda><secreto_de_integridad>
 */
export async function calcularFirmaIntegridad(
  referencia: string,
  montoEnCentavos: number,
  moneda: string = "COP",
): Promise<string> {
  const { integritySecret } = obtenerConfiguracionWompi();
  const cadena = `${referencia}${montoEnCentavos}${moneda}${integritySecret}`;

  const encoder = new TextEncoder();
  const datos = encoder.encode(cadena);
  const hashBuffer = await crypto.subtle.digest("SHA-256", datos);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifica si la llave pública de comercio está registrada y activa en el Sandbox de Wompi.
 */
export async function verificarComercioWompi(publicKey: string): Promise<boolean> {
  if (!publicKey || !publicKey.startsWith("pub_")) return false;
  try {
    const { apiUrl } = obtenerConfiguracionWompi();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${apiUrl}/merchants/${encodeURIComponent(publicKey)}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${publicKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Consulta el estado de una transacción directamente en el API oficial de Wompi.
 */
export async function consultarTransaccionWompi(idTransaccion: string): Promise<any> {
  const { apiUrl, privateKey, publicKey } = obtenerConfiguracionWompi();
  const url = `${apiUrl}/transactions/${encodeURIComponent(idTransaccion)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${privateKey || publicKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorTexto = await response.text().catch(() => "");
    throw new Error(
      `Error al consultar transacción en Wompi (${response.status}): ${errorTexto}`,
    );
  }

  const json = await response.json();
  return json.data;
}

/**
 * Valida el checksum de un evento recibido por webhook de Wompi.
 */
export async function validarChecksumEvento(
  evento: any,
  checksumRecibido?: string,
): Promise<boolean> {
  if (!checksumRecibido || !evento?.signature?.properties) {
    return false;
  }

  const { eventsSecret } = obtenerConfiguracionWompi();
  const properties: string[] = evento.signature.properties;

  let cadena = "";
  for (const prop of properties) {
    const partes = prop.split(".");
    let valor: any = evento.data;
    for (const p of partes) {
      if (valor !== undefined && valor !== null) {
        valor = valor[p];
      }
    }
    cadena += String(valor ?? "");
  }

  cadena += String(evento.timestamp ?? "");
  cadena += eventsSecret;

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(cadena));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const checksumCalculado = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return checksumCalculado.toLowerCase() === checksumRecibido.toLowerCase();
}
