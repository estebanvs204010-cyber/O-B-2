import "https://deno.land/std@0.224.0/dotenv/load.ts";

export interface WompiConfig {
  environment: "sandbox" | "production";
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
  apiUrl: string;
}

/**
 * Obtiene las credenciales y configuración activa de Wompi.
 */
export function getWompiConfig(): WompiConfig {
  const envRaw = (Deno.env.get("WOMPI_ENV") ?? "sandbox").toLowerCase();
  const environment: "sandbox" | "production" =
    envRaw === "production" || envRaw === "prod" ? "production" : "sandbox";

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

  const defaultApiUrl =
    environment === "production"
      ? "https://production.wompi.co/v1"
      : "https://sandbox.wompi.co/v1";

  const apiUrl = (Deno.env.get("WOMPI_API_URL") ?? defaultApiUrl)
    .trim()
    .replace(/\/$/, "");

  return {
    environment,
    publicKey,
    privateKey,
    integritySecret,
    eventsSecret,
    apiUrl,
  };
}

/**
 * Genera una referencia única para transacciones en formato OB-<timestamp>-<random>.
 * Ejemplo: OB-1732662000000-A9F3
 */
export function generarReferenciaUnica(): string {
  const timestamp = Date.now();
  const sufijo = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `OB-${timestamp}-${sufijo}`;
}

/**
 * Genera la firma de integridad oficial para el Widget de Wompi.
 * Algoritmo SHA-256 en minúsculas:
 * Cadena: <referencia><monto_en_centavos><moneda><secreto_de_integridad>
 *
 * @param referencia Referencia única de la orden/factura
 * @param montoEnCentavos Monto en centavos (ej: 10000 COP = 1000000 centavos)
 * @param moneda Moneda ISO 4217 (ej: 'COP')
 * @returns Firma SHA256 en cadena hexadecimal minúscula
 */
export async function generarFirmaIntegridad(
  referencia: string,
  montoEnCentavos: number,
  moneda: string = "COP",
): Promise<string> {
  const { integritySecret } = getWompiConfig();
  const cadena = `${referencia}${montoEnCentavos}${moneda}${integritySecret}`;

  const encoder = new TextEncoder();
  const datos = encoder.encode(cadena);
  const hashBuffer = await crypto.subtle.digest("SHA-256", datos);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Valida el checksum SHA-256 del webhook de eventos de Wompi.
 * Fórmula oficial de Wompi:
 * Concatena en orden los valores de los campos indicados en event.signature.properties,
 * luego event.timestamp, luego el event secret (WOMPI_EVENTS_SECRET).
 * Luego SHA-256 en minúsculas.
 *
 * @param evento Objeto completo del evento recibido
 * @param checksumRecibido Checksum recibido en el payload o header x-event-checksum
 * @returns boolean indicando si la firma coincide
 */
export async function validarFirmaWebhook(
  evento: any,
  checksumRecibido?: string,
): Promise<boolean> {
  const checksum = checksumRecibido ?? evento?.signature?.checksum;
  const properties = evento?.signature?.properties;

  if (!checksum || !Array.isArray(properties) || properties.length === 0) {
    return false;
  }

  const { eventsSecret } = getWompiConfig();

  // Construir cadena según las propiedades indicadas por Wompi
  let cadena = "";
  for (const prop of properties) {
    const partes = String(prop).split(".");
    let valorActual: any = evento.data;

    for (const parte of partes) {
      if (valorActual !== undefined && valorActual !== null) {
        valorActual = valorActual[parte];
      } else {
        valorActual = undefined;
        break;
      }
    }

    cadena += String(valorActual ?? "");
  }

  cadena += String(evento.timestamp ?? "");
  cadena += eventsSecret;

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(cadena));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const checksumCalculado = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return checksumCalculado.toLowerCase() === String(checksum).toLowerCase();
}

/**
 * Consulta el estado oficial de una transacción directamente al API REST de Wompi.
 * Endpoint: GET /v1/transactions/:id
 *
 * @param idTransaccion ID de transacción de Wompi
 */
export async function consultarTransaccionWompi(idTransaccion: string): Promise<any> {
  const { apiUrl, privateKey, publicKey } = getWompiConfig();
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
 * Valida la existencia y estado de la llave pública de comercio en Wompi Sandbox.
 */
export async function verificarComercioWompi(publicKey: string): Promise<boolean> {
  if (!publicKey || !publicKey.startsWith("pub_")) return false;
  try {
    const { apiUrl } = getWompiConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `${apiUrl}/merchants/${encodeURIComponent(publicKey)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${publicKey}` },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
