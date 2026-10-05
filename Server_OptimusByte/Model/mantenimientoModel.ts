import { conexion } from "./conexion.ts";
import { Vehiculo } from "./vehiculoModel.ts";
import { Cliente } from "./clienteModel.ts";
import { CitaModel } from "./citaModel.ts";
import { enviarYRegistrarCorreo } from "../Helpers/correoLogger.ts";
import { crearNotificacionParaRol } from "../Helpers/notificacionesService.ts";
import { correoMantenimientoPendiente } from "../Helpers/templates.ts";

// Cuántos km antes del vencimiento avisamos (para no avisar justo en el límite)
const UMBRAL_AVISO_KM = 500;

const vehiculoModel = new Vehiculo();
const clienteModel = new Cliente();
const citaModel = new CitaModel();

export class MantenimientoModel {
  // Se llama una vez, cuando se registra un vehículo nuevo: crea el primer
  // registro de seguimiento para cada parte del catálogo intervalosmanto.
  public async InicializarParaVehiculo(id_vehiculo: number, km_actuales: number): Promise<void> {
    const intervalos = await conexion.query(
      `SELECT id_intervalo, km_intervalo FROM intervalosmanto WHERE activo = 1`,
    );

    for (const intervalo of intervalos) {
      await conexion.execute(
        `INSERT INTO mantovehiculo (id_vehiculo, id_intervalo, km_registro, km_proximo)
         VALUES (?, ?, ?, ?)`,
        [id_vehiculo, intervalo.id_intervalo, km_actuales, km_actuales + intervalo.km_intervalo],
      );
    }
  }

  // Se llama cada vez que se actualiza el kilometraje de un vehículo
  // (por ejemplo, al abrir una orden de trabajo). Actualiza el km y
  // revisa si algún mantenimiento ya está por vencer.
  public async ActualizarKmYVerificar(id_vehiculo: number, km_nuevo: number) {
    const resultado = await vehiculoModel.ActualizarKm(id_vehiculo, km_nuevo);
    if (!resultado.success) return resultado;

    const notificados = await this.VerificarYNotificar(id_vehiculo, km_nuevo);

    return { success: true, message: "Kilometraje actualizado", mantenimientosNotificados: notificados };
  }

  // Revisa las partes pendientes de este vehículo. Si alguna ya entró en el
  // rango de aviso y todavía no se había notificado, crea la cita sugerida
  // y envía el correo al cliente.
  public async VerificarYNotificar(id_vehiculo: number, km_actuales: number): Promise<string[]> {
    const pendientes = await conexion.query(
      `SELECT mv.id_mantenimiento, mv.km_proximo, im.nombre_parte, im.descripcion, v.id_cliente
       FROM mantovehiculo mv
       JOIN intervalosmanto im ON im.id_intervalo = mv.id_intervalo
       JOIN vehiculos v ON v.id_vehiculo = mv.id_vehiculo
       WHERE mv.id_vehiculo = ?
         AND mv.notificado = 0
         AND mv.km_proximo - ? <= ?`,
      [id_vehiculo, km_actuales, UMBRAL_AVISO_KM],
    );

    const notificados: string[] = [];

    for (const item of pendientes) {
      const motivo = `Mantenimiento sugerido: ${item.nombre_parte} (próximo a los ${item.km_proximo} km)`;

      // 1) Crear la cita sugerida (sin horario, el cliente la completa después)
      await citaModel.CrearSugerida(item.id_cliente, id_vehiculo, item.id_mantenimiento, motivo);

      // 2) Marcar como notificado para no repetir el aviso
      await conexion.execute(
        `UPDATE mantovehiculo SET notificado = 1 WHERE id_mantenimiento = ?`,
        [item.id_mantenimiento],
      );

      // 3) Enviar el correo y notificar por la campana al equipo del taller.
      const cliente = await clienteModel.ObtenerPorId(item.id_cliente);
      if (cliente) {
        const { asunto, mensaje, html } = correoMantenimientoPendiente(
          cliente.nombre_completo,
          item.nombre_parte,
          item.km_proximo,
        );

        await enviarYRegistrarCorreo({
          id_cliente: item.id_cliente,
          destinatario: cliente.correo,
          asunto,
          mensaje,
          html,
          tipo_correo: "MantenimientoPendiente",
          id_mantenimiento: item.id_mantenimiento,
        });
      }

      await crearNotificacionParaRol({
        nombreRol: "Admin",
        tipo: "MantenimientoDetectado",
        titulo: "Mantenimiento próximo detectado",
        mensaje: `${item.nombre_parte} del vehículo #${id_vehiculo} está por vencer. Se le creó una cita sugerida al cliente.`,
        entidad_tipo: "cita",
      });

      notificados.push(item.nombre_parte);
    }

    return notificados;
  }

  // Cuando se termina de hacer una parte (ej. se cambió el aceite), se reinicia
  // el conteo: nuevo km_registro = km actual, próximo = actual + intervalo, y
  // se vuelve a habilitar la notificación para el siguiente ciclo.
  public async MarcarRealizado(id_mantenimiento: number, km_realizado: number): Promise<void> {
    const [fila] = await conexion.query(
      `SELECT im.km_intervalo
       FROM mantovehiculo mv
       JOIN intervalosmanto im ON im.id_intervalo = mv.id_intervalo
       WHERE mv.id_mantenimiento = ?`,
      [id_mantenimiento],
    );
    if (!fila) return;

    await conexion.execute(
      `UPDATE mantovehiculo
       SET km_registro = ?, km_proximo = ?, notificado = 0, fecha_calculo = current_timestamp()
       WHERE id_mantenimiento = ?`,
      [km_realizado, km_realizado + fila.km_intervalo, id_mantenimiento],
    );
  }

  public async ObtenerPorVehiculo(id_vehiculo: number) {
    return await conexion.query(
      `SELECT mv.id_mantenimiento, mv.km_registro, mv.km_proximo, mv.notificado,
              im.nombre_parte, im.descripcion
       FROM mantovehiculo mv
       JOIN intervalosmanto im ON im.id_intervalo = mv.id_intervalo
       WHERE mv.id_vehiculo = ?
       ORDER BY mv.km_proximo ASC`,
      [id_vehiculo],
    );
  }
}
