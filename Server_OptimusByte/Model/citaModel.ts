import { conexion } from "./conexion.ts";
import {
  combinarFechaHora,
  CUPO_POR_TURNO,
  esTurnoValido,
  turnosDelDia,
} from "../Helpers/horarioAtencion.ts";

// Estados posibles de una cita, en el orden natural del flujo:
// Sugerida -> Pendiente -> Confirmada -> Completada
//                       \-> Rechazada
// (desde Pendiente o Confirmada también se puede pasar a Cancelada)
export type EstadoCita =
  | "Sugerida"
  | "Pendiente"
  | "Confirmada"
  | "Rechazada"
  | "Cancelada"
  | "Completada";

export interface Cita {
  id_cita: number;
  id_cliente: number;
  id_vehiculo: number;
  id_mantenimiento: number | null;
  origen: "Manual" | "Mantenimiento";
  fecha_hora: string | null;
  duracion_minutos: number;
  motivo: string | null;
  estado: EstadoCita;
  fecha_solicitud: string;
}

export class CitaModel {
  // ---------- Disponibilidad ----------
  // Para una fecha dada, devuelve cada turno del día con su disponibilidad,
  // contando cuántas citas activas (no canceladas/rechazadas) ya hay en cada uno.
  public async ObtenerDisponibilidad(fechaISO: string) {
    const [anio, mes, dia] = fechaISO.split("-").map(Number);
    const fechaRef = new Date(anio, mes - 1, dia);
    const turnos = turnosDelDia(fechaRef);

    if (turnos.length === 0) {
      return { fecha: fechaISO, cerrado: true, turnos: [] };
    }

    const filas = await conexion.query(
      `SELECT fecha_hora FROM citas
       WHERE DATE(fecha_hora) = ?
         AND estado NOT IN ('Cancelada', 'Rechazada')`,
      [fechaISO],
    );

    const ocupadosPorHora = new Map<string, number>();
    for (const fila of filas) {
      const hhmm = new Date(fila.fecha_hora).toTimeString().slice(0, 5);
      ocupadosPorHora.set(hhmm, (ocupadosPorHora.get(hhmm) ?? 0) + 1);
    }

    const ahora = Date.now();
    const resultado = turnos.map((hora) => {
      const ocupados = ocupadosPorHora.get(hora) ?? 0;
      const fechaHoraTurno = combinarFechaHora(fechaISO, hora);
      return {
        hora,
        disponible: ocupados < CUPO_POR_TURNO && fechaHoraTurno.getTime() > ahora,
      };
    });

    return { fecha: fechaISO, cerrado: false, turnos: resultado };
  }

  // Cuenta cuántas citas activas hay ya en un turno exacto (para no sobre-agendar)
  private async CupoDisponibleEn(fechaHora: Date): Promise<boolean> {
    const [fila] = await conexion.query(
      `SELECT COUNT(*) AS total FROM citas
       WHERE fecha_hora = ? AND estado NOT IN ('Cancelada', 'Rechazada')`,
      [fechaHora],
    );
    return Number(fila.total) < CUPO_POR_TURNO;
  }

  // ---------- Creación ----------
  // Cita creada directamente por el cliente, eligiendo fecha y hora ya.
  public async Crear(
    id_cliente: number,
    id_vehiculo: number,
    fechaHora: Date,
    motivo: string | null,
  ): Promise<{ success: boolean; message: string; id_cita?: number }> {
    if (!esTurnoValido(fechaHora)) {
      return { success: false, message: "El horario elegido no es válido (revisa día y hora de atención)" };
    }

    if (!(await this.CupoDisponibleEn(fechaHora))) {
      return { success: false, message: "Ese turno ya está ocupado, elige otro horario" };
    }

    const resultado = await conexion.execute(
      `INSERT INTO citas (id_cliente, id_vehiculo, origen, fecha_hora, motivo, estado)
       VALUES (?, ?, 'Manual', ?, ?, 'Pendiente')`,
      [id_cliente, id_vehiculo, fechaHora, motivo],
    );

    return { success: true, message: "Cita solicitada, queda pendiente de confirmación", id_cita: resultado.lastInsertId };
  }

  // Cita "Sugerida" creada por el sistema cuando detecta un mantenimiento próximo.
  // Nace SIN fecha_hora: el cliente debe entrar a elegir el turno.
  public async CrearSugerida(
    id_cliente: number,
    id_vehiculo: number,
    id_mantenimiento: number,
    motivo: string,
  ): Promise<number> {
    const resultado = await conexion.execute(
      `INSERT INTO citas (id_cliente, id_vehiculo, id_mantenimiento, origen, motivo, estado)
       VALUES (?, ?, ?, 'Mantenimiento', ?, 'Sugerida')`,
      [id_cliente, id_vehiculo, id_mantenimiento, motivo],
    );
    return resultado.lastInsertId as number;
  }

  // El cliente elige horario para una cita que estaba "Sugerida"
  public async ElegirHorario(
    id_cita: number,
    id_cliente: number,
    fechaHora: Date,
  ): Promise<{ success: boolean; message: string }> {
    const [cita] = await conexion.query(
      `SELECT id_cita, estado FROM citas WHERE id_cita = ? AND id_cliente = ?`,
      [id_cita, id_cliente],
    );

    if (!cita) return { success: false, message: "Cita no encontrada" };
    if (cita.estado !== "Sugerida") {
      return { success: false, message: "Esta cita ya tiene un horario asignado" };
    }
    if (!esTurnoValido(fechaHora)) {
      return { success: false, message: "El horario elegido no es válido" };
    }
    if (!(await this.CupoDisponibleEn(fechaHora))) {
      return { success: false, message: "Ese turno ya está ocupado, elige otro horario" };
    }

    await conexion.execute(
      `UPDATE citas SET fecha_hora = ?, estado = 'Pendiente' WHERE id_cita = ?`,
      [fechaHora, id_cita],
    );

    return { success: true, message: "Horario asignado, tu cita queda pendiente de confirmación" };
  }

  // ---------- Consultas ----------
  public async MisCitas(id_cliente: number): Promise<Cita[]> {
    return await conexion.query(
      `SELECT c.*, v.placa, v.marca, v.modelo
       FROM citas c
       JOIN vehiculos v ON v.id_vehiculo = c.id_vehiculo
       WHERE c.id_cliente = ?
       ORDER BY (c.fecha_hora IS NULL), c.fecha_hora DESC, c.fecha_solicitud DESC`,
      [id_cliente],
    );
  }

  public async Listar(filtros: { estado?: string; fecha?: string }): Promise<Cita[]> {
    const condiciones: string[] = [];
    const valores: unknown[] = [];

    if (filtros.estado) {
      condiciones.push("c.estado = ?");
      valores.push(filtros.estado);
    }
    if (filtros.fecha) {
      condiciones.push("DATE(c.fecha_hora) = ?");
      valores.push(filtros.fecha);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    return await conexion.query(
      `SELECT c.*, cl.nombre_completo, cl.telefono, cl.correo, v.placa, v.marca, v.modelo
       FROM citas c
       JOIN clientes cl ON cl.id_cliente = c.id_cliente
       JOIN vehiculos v ON v.id_vehiculo = c.id_vehiculo
       ${where}
       ORDER BY (c.fecha_hora IS NULL), c.fecha_hora ASC`,
      valores,
    );
  }

  public async ObtenerPorId(id_cita: number): Promise<Cita | null> {
    const [fila] = await conexion.query(`SELECT * FROM citas WHERE id_cita = ?`, [id_cita]);
    return fila ?? null;
  }

  // ---------- Gestión (Admin) ----------
  public async Confirmar(id_cita: number, id_usuario_admin: number) {
    return await this.CambiarEstadoGestionado(id_cita, "Confirmada", id_usuario_admin, null, ["Pendiente"]);
  }

  public async Rechazar(id_cita: number, id_usuario_admin: number, motivo: string) {
    return await this.CambiarEstadoGestionado(id_cita, "Rechazada", id_usuario_admin, motivo, ["Pendiente"]);
  }

  public async Completar(id_cita: number, id_usuario_admin: number) {
    return await this.CambiarEstadoGestionado(id_cita, "Completada", id_usuario_admin, null, ["Confirmada"]);
  }

  // El cliente o el admin cancelan (no se puede cancelar algo ya completado/rechazado)
  public async Cancelar(id_cita: number) {
    return await this.CambiarEstadoGestionado(id_cita, "Cancelada", null, null, [
      "Sugerida",
      "Pendiente",
      "Confirmada",
    ]);
  }

  private async CambiarEstadoGestionado(
    id_cita: number,
    nuevoEstado: EstadoCita,
    id_usuario_gestion: number | null,
    motivo_rechazo: string | null,
    estadosPermitidos: EstadoCita[],
  ): Promise<{ success: boolean; message: string }> {
    const cita = await this.ObtenerPorId(id_cita);
    if (!cita) return { success: false, message: "Cita no encontrada" };

    if (!estadosPermitidos.includes(cita.estado)) {
      return {
        success: false,
        message: `No se puede pasar de '${cita.estado}' a '${nuevoEstado}'`,
      };
    }

    await conexion.execute(
      `UPDATE citas
       SET estado = ?, id_usuario_gestion = ?, motivo_rechazo = ?, fecha_gestion = current_timestamp()
       WHERE id_cita = ?`,
      [nuevoEstado, id_usuario_gestion, motivo_rechazo, id_cita],
    );

    return { success: true, message: `Cita marcada como ${nuevoEstado}` };
  }
}
