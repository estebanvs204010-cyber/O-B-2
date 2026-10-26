// Carpetas permitidas: el cliente NO puede inventar carpetas
const CARPETAS_PERMITIDAS = ["clientes", "repuestos", "solicitudes"] as const;
export type CarpetaImagen = typeof CARPETAS_PERMITIDAS[number];

export function esCarpetaValida(valor: string): valor is CarpetaImagen {
  return (CARPETAS_PERMITIDAS as readonly string[]).includes(valor);
}

export async function firmarSubida(carpeta: CarpetaImagen) {
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Configuración de Cloudinary incompleta");
  }

  const folder = `optimusbyte/${carpeta}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Regla de Cloudinary: parámetros en orden alfabético + API_SECRET al final, todo en SHA-1
  const paramsAFirmar = `folder=${folder}&timestamp=${timestamp}`;
  const datos = new TextEncoder().encode(paramsAFirmar + apiSecret);
  const hash = await crypto.subtle.digest("SHA-1", datos);
  const signature = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // El apiSecret NO se devuelve nunca
  return { cloudName, apiKey, timestamp, folder, signature };
}