import { conexion } from "./conexion.ts";
import { hash } from "../Dependencies/dependencias.ts";

interface DatosCliente {
  nombre_completo: string;
  tipo_documento: string;
  num_documento: string;
  telefono: string;
  correo: string;
  contrasena: string;
  direccion?: string;
}

interface DatosEdicionCliente {
  nombre_completo: string;
  telefono: string;
  correo: string;
  direccion?: string;
}

export class Cliente {
  public async RegistrarConCuenta(datos: DatosCliente) {
    return await this.crearClienteConUsuario(
      datos,
      "Cuenta creada correctamente",
    );
  }

  public async RegistrarSinCuenta(datos: DatosCliente) {
    return await this.crearClienteConUsuario(
      datos,
      "Cliente y cuenta creados correctamente",
    );
  }

  private async crearClienteConUsuario(
    datos: DatosCliente,
    mensajeExito: string,
  ) {
    const [correoExistente] = await conexion.query(
      "SELECT id_usuario FROM usuarios WHERE correo = ?",
      [datos.correo],
    );

    if (correoExistente) {
      return {
        success: false,
        message: "Ese correo ya está registrado",
      };
    }

    const [documentoExistente] = await conexion.query(
      "SELECT id_cliente FROM clientes WHERE num_documento = ?",
      [datos.num_documento],
    );

    if (documentoExistente) {
      return {
        success: false,
        message: "Ese número de documento ya está registrado",
      };
    }

    const [rolCliente] = await conexion.query(
      "SELECT id_rol FROM roles WHERE nombre = 'Cliente'",
    );

    if (!rolCliente) {
      return {
        success: false,
        message: "No se encontró el rol Cliente",
      };
    }

    try {
      const contrasenaHasheada = await hash(datos.contrasena);

      await conexion.transaction(async (conn) => {
        const resultadoUsuario = await conn.execute(
          `INSERT INTO usuarios (
            nombre_completo,
            correo,
            telefono,
            contrasena_hash,
            id_rol,
            activo
          ) VALUES (?, ?, ?, ?, ?, 1)`,
          [
            datos.nombre_completo.trim(),
            datos.correo.trim(),
            datos.telefono.trim(),
            contrasenaHasheada,
            rolCliente.id_rol,
          ],
        );

        await conn.execute(
          `INSERT INTO clientes (
            id_usuario,
            nombre_completo,
            tipo_documento,
            num_documento,
            telefono,
            correo,
            direccion,
            activo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            resultadoUsuario.lastInsertId,
            datos.nombre_completo.trim(),
            datos.tipo_documento,
            datos.num_documento.trim(),
            datos.telefono.trim(),
            datos.correo.trim(),
            datos.direccion?.trim() || null,
          ],
        );
      });

      return {
        success: true,
        message: mensajeExito,
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        message: "No se pudo crear el cliente y su cuenta",
      };
    }
  }

  public async Listar(
    busqueda?: string,
    incluirInactivos = false,
  ) {
    const condiciones: string[] = [];
    const parametros: string[] = [];

    if (!incluirInactivos) {
      condiciones.push("activo = 1");
    }

    if (busqueda) {
      const termino = `%${busqueda}%`;

      condiciones.push(
        "(nombre_completo LIKE ? OR num_documento LIKE ? OR correo LIKE ?)",
      );

      parametros.push(termino, termino, termino);
    }

    const where = condiciones.length
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

    return await conexion.query(
      `SELECT
        id_cliente,
        id_usuario,
        nombre_completo,
        foto_url,
        tipo_documento,
        num_documento,
        telefono,
        correo,
        direccion,
        activo
      FROM clientes
      ${where}
      ORDER BY nombre_completo`,
      parametros,
    );
  }

  public async ObtenerPorId(id_cliente: number) {
    const [cliente] = await conexion.query(
      `SELECT
        id_cliente,
        id_usuario,
        nombre_completo,
        foto_url,
        tipo_documento,
        num_documento,
        telefono,
        correo,
        direccion,
        activo
      FROM clientes
      WHERE id_cliente = ?`,
      [id_cliente],
    );

    return cliente ?? null;
  }

  public async Editar(
    id_cliente: number,
    datos: DatosEdicionCliente,
  ) {
    const clienteActual = await this.ObtenerPorId(id_cliente);

    if (!clienteActual) {
      return {
        success: false,
        message: "El cliente no existe",
      };
    }

    const [correoDuplicado] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE correo = ? AND id_cliente != ?`,
      [datos.correo.trim(), id_cliente],
    );

    if (correoDuplicado) {
      return {
        success: false,
        message: "Ese correo ya lo usa otro cliente",
      };
    }

    try {
      await conexion.transaction(async (conn) => {
        await conn.execute(
          `UPDATE clientes
           SET nombre_completo = ?,
               telefono = ?,
               correo = ?,
               direccion = ?,
               foto_url = COALESCE(?, foto_url)
           WHERE id_cliente = ?`,
          [
            datos.nombre_completo.trim(),
            datos.telefono.trim(),
            datos.correo.trim(),
            datos.direccion?.trim() || null,
            datos.foto_url ?? null,
            id_cliente,
          ],
        );

        if (clienteActual.id_usuario) {
          await conn.execute(
            `UPDATE usuarios
             SET nombre_completo = ?,
                 correo = ?,
                 telefono = ?
             WHERE id_usuario = ?`,
            [
              datos.nombre_completo.trim(),
              datos.correo.trim(),
              datos.telefono.trim(),
              clienteActual.id_usuario,
            ],
          );
        }
      });

      return {
        success: true,
        message: "Cliente actualizado correctamente",
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        message: "No se pudo actualizar el cliente",
      };
    }
  }

  public async Desactivar(id_cliente: number) {
    return await this.CambiarEstado(id_cliente, false);
  }

  public async CambiarEstado(
    id_cliente: number,
    activo: boolean,
  ) {
    const clienteActual = await this.ObtenerPorId(id_cliente);

    if (!clienteActual) {
      return {
        success: false,
        message: "El cliente no existe",
      };
    }

    try {
      await conexion.transaction(async (conn) => {
        await conn.execute(
          "UPDATE clientes SET activo = ? WHERE id_cliente = ?",
          [activo ? 1 : 0, id_cliente],
        );

        if (clienteActual.id_usuario) {
          await conn.execute(
            "UPDATE usuarios SET activo = ? WHERE id_usuario = ?",
            [activo ? 1 : 0, clienteActual.id_usuario],
          );
        }
      });

      return {
        success: true,
        message: activo
          ? "Cliente activado correctamente"
          : "Cliente desactivado correctamente",
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        message: "No se pudo cambiar el estado del cliente",
      };
    }
  }
}