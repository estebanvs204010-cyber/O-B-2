import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { SMTPClient } from "../Dependencies/dependencias.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") ?? "";

function validarConfiguracionSMTP() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error(
      "Configuración SMTP incompleta. Revisa las variables de entorno en .env",
    );
  }
}

function crearClienteSMTP() {
  validarConfiguracionSMTP();

  return new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: {
        username: SMTP_USER,
        password: SMTP_PASSWORD,
      },
    },
  });
}

interface DatosCorreoHtml {
  destinatario: string;
  asunto: string;
  mensaje: string;
  html: string;
}

export async function enviarCorreoHtml(
  { destinatario, asunto, mensaje, html }: DatosCorreoHtml,
) {
  const client = crearClienteSMTP();
  try {
    await client.send({
      from: SMTP_USER,
      to: destinatario,
      subject: asunto,
      content: mensaje,
      html,
    });
  } finally {
    await client.close();
  }
}