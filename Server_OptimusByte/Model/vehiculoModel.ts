import { conexion } from "./conexion.ts";

// NOTA: este modelo cubre solo lo mínimo que necesita el módulo de citas
// y de mantenimiento (consultar vehículos y actualizar el kilometraje).
// El CRUD completo de vehículos (registrar, editar, dar de baja, etc.)
// es un módulo aparte que no está implementado todavía.

export interface Vehiculo {
  id_vehiculo: number;
  id_cliente: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  km_actuales: number;
}

export class VehiculoModel {
  // Vehículos activos de un cliente (para que elija a cuál le agenda la cita)
  public async ObtenerPorCliente(id_cliente: number): Promise<Vehiculo[]> {
    return await conexion.query(
      `SELECT id_vehiculo, id_cliente, placa, marca, modelo, anio, km_actuales
       FROM vehiculos
       WHERE id_cliente = ? AND activo = 1
       ORDER BY marca, modelo`,
      [id_cliente],
    );
  }

  public async ObtenerPorId(id_vehiculo: number): Promise<Vehiculo | null> {
    const [fila] = await conexion.query(
      `SELECT id_vehiculo, id_cliente, placa, marca, modelo, anio, km_actuales
       FROM vehiculos WHERE id_vehiculo = ? AND activo = 1`,
      [id_vehiculo],
    );
    return fila ?? null;
  }

  // Verifica que el vehículo sea del cliente dado (para no dejar que alguien
  // agende una cita para el carro de otra persona).
  public async PerteneceACliente(id_vehiculo: number, id_cliente: number): Promise<boolean> {
    const [fila] = await conexion.query(
      `SELECT id_vehiculo FROM vehiculos WHERE id_vehiculo = ? AND id_cliente = ? AND activo = 1`,
      [id_vehiculo, id_cliente],
    );
    return !!fila;
  }

  public async ActualizarKm(id_vehiculo: number, km_nuevo: number): Promise<void> {
    await conexion.execute(
      `UPDATE vehiculos SET km_actuales = ? WHERE id_vehiculo = ?`,
      [km_nuevo, id_vehiculo],
    );
  }
}
