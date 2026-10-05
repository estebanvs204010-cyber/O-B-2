// Reglas del horario de atención del taller.
// Lunes(1) a Sábado(6): 7:00-12:00 y 13:00-18:00 (12-13 es almuerzo del mecánico).
// Domingo(0): cerrado.
// Turnos de 1 hora → 10 turnos por día.

export const DURACION_TURNO_MINUTOS = 60;
export const CUPO_POR_TURNO = 1; // cuántas citas caben en el mismo turno (1 bahía/mecánico por ahora)

const HORAS_MANANA = [7, 8, 9, 10, 11];
const HORAS_TARDE = [13, 14, 15, 16, 17];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Devuelve los turnos ("HH:00") de un día dado, o [] si es domingo.
export function turnosDelDia(fecha: Date): string[] {
  const diaSemana = fecha.getDay(); // 0 = domingo
  if (diaSemana === 0) return [];
  return [...HORAS_MANANA, ...HORAS_TARDE].map((h) => `${pad(h)}:00`);
}

// Construye un Date a partir de "YYYY-MM-DD" + "HH:mm", en hora local del servidor.
export function combinarFechaHora(fechaISO: string, horaHHmm: string): Date {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const [hora, minuto] = horaHHmm.split(":").map(Number);
  return new Date(anio, mes - 1, dia, hora, minuto, 0, 0);
}

// Valida que una fecha/hora propuesta caiga EXACTAMENTE en uno de los turnos válidos
// (protege contra que el cliente mande una hora arbitraria, ej. 7:35 o domingo).
export function esTurnoValido(fechaHora: Date): boolean {
  const turnosValidos = turnosDelDia(fechaHora);
  const horaStr = `${pad(fechaHora.getHours())}:${pad(fechaHora.getMinutes())}`;
  if (!turnosValidos.includes(horaStr)) return false;

  // No se permite agendar en el pasado
  if (fechaHora.getTime() < Date.now()) return false;

  return true;
}
