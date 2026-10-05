import { conexion } from "../Model/conexion.ts";
import { enviarCorreoHtml } from "./emailService.ts";

// Este es el único lugar del sistema donde se debería llamar enviarCorreoHtml()
// directamente. Todo controlador/modelo que necesite mandar un correo llama a
// enviarYRegistrarCorreo() en su lugar, así:
//   - nunca se nos olvida dejar el rastro en correosenviados
//   - si el SMTP falla, el error queda guardado en vez de perderse en consola
//   - el resto del sistema puede seguir funcionando aunque el correo falle
//     (por eso NUNCA relanzamos el error hacia quien llamó)

interface EnvioCorreo {
  id_cliente: number;
  destinatario: string;
  asunto: string;
  mensaje: string;
  html: string;
  tipo_correo: string; // 'MantenimientoPendiente' | 'CitaConfirmada' | 'CitaRechazada' | ...
  id_mantenimiento?: number;
  id_orden?: number;
}

export async function enviarYRegistrarCorreo(
  datos: EnvioCorreo,
): Promise<{ enviado: boolean; error?: string }> {
  let enviado = true;
  let mensajeError: string | null = null;

  try {
    await enviarCorreoHtml({
      destinatario: datos.destinatario,
      asunto: datos.asunto,
      mensaje: datos.mensaje,
      html: datos.html,
    });
  } catch (error) {
    enviado = false;
    mensajeError = error instanceof Error ? error.message : String(error);
    console.error(`Error enviando correo (${datos.tipo_correo}) a ${datos.destinatario}:`, error);
  }

  try {
    await conexion.execute(
      `INSERT INTO correosenviados
         (id_cliente, id_mantenimiento, id_orden, tipo_correo, asunto, destinatario, estado_envio, mensaje_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.id_cliente,
        datos.id_mantenimiento ?? null,
        datos.id_orden ?? null,
        datos.tipo_correo,
        datos.asunto,
        datos.destinatario,
        enviado ? "Enviado" : "Fallido",
        mensajeError,
      ],
    );
  } catch (errorRegistro) {
    // Si ni siquiera se pudo dejar el registro, al menos que quede en consola.
    console.error("Error registrando el envío en correosenviados:", errorRegistro);
  }

  return { enviado, error: mensajeError ?? undefined };
}
