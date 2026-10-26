import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { SMTPClient } from "../Dependencies/dependencias.ts";

// Lee primero MAIL_* (como está en tu .env) y, si no existen, SMTP_* como respaldo.
function leerConfiguracionSMTP() {
  const host = (Deno.env.get("MAIL_HOST") ?? Deno.env.get("SMTP_HOST") ?? "").trim();
  const port = parseInt(
    Deno.env.get("MAIL_PORT") ?? Deno.env.get("SMTP_PORT") ?? "465",
  );
  const user = (Deno.env.get("MAIL_USER") ?? Deno.env.get("SMTP_USER") ?? "").trim();
  // Las contraseñas de aplicación de Gmail vienen con espacios; se quitan por seguridad.
  const password = (
    Deno.env.get("MAIL_PASS") ?? Deno.env.get("SMTP_PASSWORD") ?? ""
  ).replace(/\s+/g, "");
  const from = (Deno.env.get("MAIL_FROM") ?? user).trim();

  return { host, port, user, password, from };
}

function validarConfiguracionSMTP() {
  const { host, user, password } = leerConfiguracionSMTP();

  const faltantes: string[] = [];
  if (!host) faltantes.push("MAIL_HOST");
  if (!user) faltantes.push("MAIL_USER");
  if (!password) faltantes.push("MAIL_PASS");

  if (faltantes.length > 0) {
    throw new Error(
      `Configuración SMTP incompleta. Faltan en el .env: ${faltantes.join(", ")}`,
    );
  }
}

function crearClienteSMTP() {
  validarConfiguracionSMTP();
  const { host, port, user, password } = leerConfiguracionSMTP();

  return new SMTPClient({
    connection: {
      hostname: host,
      port,
      // 465 = TLS directo. 587 = conexión normal que se sube a STARTTLS sola.
      tls: port === 465,
      auth: {
        username: user,
        password,
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
  const { from } = leerConfiguracionSMTP();
  try {
    await client.send({
      from,
      to: destinatario,
      subject: asunto,
      content: mensaje,
      html,
    });
  } finally {
    await client.close();
  }
}