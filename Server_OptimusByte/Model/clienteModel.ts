import { conexion } from "./conexion.ts";

export class ClienteModel {
  // El JWT solo trae id_usuario. Este helper lo traduce a id_cliente,
  // porque las citas/vehículos se guardan contra clientes, no contra usuarios.
  public async ObtenerIdClientePorUsuario(id_usuario: number): Promise<number | null> {
    const [fila] = await conexion.query(
      `SELECT id_cliente FROM clientes WHERE id_usuario = ? AND activo = 1`,
      [id_usuario],
    );
    return fila?.id_cliente ?? null;
  }

  public async ObtenerContactoPorId(id_cliente: number): Promise<{ nombre_completo: string; correo: string } | null> {
    const [fila] = await conexion.query(
      `SELECT nombre_completo, correo FROM clientes WHERE id_cliente = ?`,
      [id_cliente],
    );
    return fila ?? null;
  }
}
