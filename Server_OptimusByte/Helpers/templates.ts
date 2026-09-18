export function correoRecuperacionPassword(nombre: string, enlace: string) {
  const asunto = "Recupera tu contraseña — OptimusByte";
  const mensaje = `Hola ${nombre}, recibimos una solicitud para restablecer tu contraseña. Entra a este enlace (válido por 30 minutos): ${enlace}. Si no fuiste tú, ignora este correo.`;
  const html = `
    <h1>Recuperación de contraseña</h1>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en OptimusByte.</p>
    <p><a href="${enlace}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Restablecer mi contraseña</a></p>
    <p>Este enlace es válido por <strong>30 minutos</strong> y solo se puede usar una vez.</p>
    <p>Si tú no solicitaste esto, simplemente ignora este correo — tu contraseña actual sigue funcionando.</p>
  `;
  return { asunto, mensaje, html };
}