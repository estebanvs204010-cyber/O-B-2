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

export function correoMantenimientoPendiente(nombre: string, nombreParte: string, kmProximo: number) {
  const asunto = `Tu vehículo necesita mantenimiento pronto — OptimusByte`;
  const mensaje = `Hola ${nombre}, tu vehículo está próximo a necesitar: ${nombreParte} (a los ${kmProximo} km). Entra a tu cuenta de OptimusByte para elegir el día y la hora que más te convenga.`;
  const html = `
    <h1>Mantenimiento preventivo próximo</h1>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Según el kilometraje registrado, tu vehículo está próximo a necesitar:</p>
    <p style="font-size:18px;"><strong>${nombreParte}</strong> (a los ${kmProximo.toLocaleString("es-CO")} km)</p>
    <p>Ya dejamos una cita sugerida en tu cuenta. Solo entra a OptimusByte y elige el día y la hora que más te convenga dentro de nuestro horario de atención (Lunes a Sábado, 7:00 a 12:00 y 1:00 a 6:00 pm).</p>
    <p>Si no eliges un horario, tu vehículo puede quedar expuesto a fallas evitables — te recomendamos agendar pronto.</p>
  `;
  return { asunto, mensaje, html };
}

export function correoCitaConfirmada(nombre: string, fechaHora: string) {
  const asunto = `Tu cita fue confirmada — OptimusByte`;
  const mensaje = `Hola ${nombre}, tu cita para el ${fechaHora} fue confirmada. Te esperamos en el taller.`;
  const html = `
    <h1>Cita confirmada</h1>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Tu cita para el <strong>${fechaHora}</strong> fue confirmada por el taller.</p>
    <p>Te esperamos puntual. Si necesitas cambiarla, ingresa a tu cuenta de OptimusByte.</p>
  `;
  return { asunto, mensaje, html };
}

export function correoCitaRechazada(nombre: string, fechaHora: string, motivo: string) {
  const asunto = `Tu cita no pudo confirmarse — OptimusByte`;
  const mensaje = `Hola ${nombre}, tu cita para el ${fechaHora} no pudo confirmarse. Motivo: ${motivo}. Por favor agenda un nuevo horario.`;
  const html = `
    <h1>Cita no confirmada</h1>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Tu cita para el <strong>${fechaHora}</strong> no pudo confirmarse.</p>
    <p><strong>Motivo:</strong> ${motivo}</p>
    <p>Ingresa a tu cuenta de OptimusByte para elegir un nuevo horario.</p>
  `;
  return { asunto, mensaje, html };
}