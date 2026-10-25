import { conexion } from "./conexion.ts";
import { hash } from "../Dependencies/dependencias.ts";

interface DatosRegistroCliente {
  nombre_completo: string;
  tipo_documento: string;
  num_documento: string;
  telefono: string;
  correo: string;
  contrasena: string;
  direccion?: string;
  nombre_completo: string;
  tipo_documento: string;
  num_documento: string;
  telefono: string;
  correo: string;
  contrasena: string;
  direccion?: string;
}

interface DatosClienteSinCuenta {
  nombre_completo: string;
  tipo_documento: string;
  num_documento: string;
  telefono: string;
  correo: string;
  contrasena: string;
  direccion?: string;
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
  public async RegistrarConCuenta(
    datos: DatosRegistroCliente,
  ) {
    const [correoExistente] = await conexion.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE correo = ?`,
      [datos.correo],
    );

    if (correoExistente) {
      return {
        success: false,
        message: "Ese correo ya está registrado",
      };
    }
  public async RegistrarConCuenta(
    datos: DatosRegistroCliente,
  ) {
    const [correoExistente] = await conexion.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE correo = ?`,
      [datos.correo],
    );

    if (correoExistente) {
      return {
        success: false,
        message: "Ese correo ya está registrado",
      };
    }

    const [documentoExistente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE num_documento = ?`,
      [datos.num_documento],
    );

    if (documentoExistente) {
      return {
        success: false,
        message: "Ese número de documento ya está registrado",
      };
    }
    const [documentoExistente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE num_documento = ?`,
      [datos.num_documento],
    );

    if (documentoExistente) {
      return {
        success: false,
        message: "Ese número de documento ya está registrado",
      };
    }

    const [rolCliente] = await conexion.query(
      `SELECT id_rol
       FROM roles
       WHERE nombre = 'Cliente'`,
    );

    if (!rolCliente) {
      return {
        success: false,
        message: "No se encontró el rol Cliente",
      };
    }
    const [rolCliente] = await conexion.query(
      `SELECT id_rol
       FROM roles
       WHERE nombre = 'Cliente'`,
    );

    if (!rolCliente) {
      return {
        success: false,
        message: "No se encontró el rol Cliente",
      };
    }

    const contrasenaHasheada = await hash(datos.contrasena);
    const contrasenaHasheada = await hash(datos.contrasena);

    try {
      await conexion.transaction(async (conn) => {
        const resultadoUsuario = await conn.execute(
          `INSERT INTO usuarios (
             nombre_completo,
             correo,
             telefono,
             contrasena_hash,
             id_rol
           )
           VALUES (?, ?, ?, ?, ?)`,
          [
            datos.nombre_completo,
            datos.correo,
            datos.telefono,
            contrasenaHasheada,
            rolCliente.id_rol,
          ],
        );
    try {
      await conexion.transaction(async (conn) => {
        const resultadoUsuario = await conn.execute(
          `INSERT INTO usuarios (
             nombre_completo,
             correo,
             telefono,
             contrasena_hash,
             id_rol
           )
           VALUES (?, ?, ?, ?, ?)`,
          [
            datos.nombre_completo,
            datos.correo,
            datos.telefono,
            contrasenaHasheada,
            rolCliente.id_rol,
          ],
        );

        const idUsuario = resultadoUsuario.lastInsertId;
        const idUsuario = resultadoUsuario.lastInsertId;

        await conn.execute(
          `INSERT INTO clientes (
             id_usuario,
             nombre_completo,
             tipo_documento,
             num_documento,
             telefono,
             correo,
             direccion
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            idUsuario,
            datos.nombre_completo,
            datos.tipo_documento,
            datos.num_documento,
            datos.telefono,
            datos.correo,
            datos.direccion ?? null,
          ],
        );
      });
        await conn.execute(
          `INSERT INTO clientes (
             id_usuario,
             nombre_completo,
             tipo_documento,
             num_documento,
             telefono,
             correo,
             direccion
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            idUsuario,
            datos.nombre_completo,
            datos.tipo_documento,
            datos.num_documento,
            datos.telefono,
            datos.correo,
            datos.direccion ?? null,
          ],
        );
      });

      return {
        success: true,
        message: "Cuenta creada correctamente",
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        message: "No se pudo completar el registro",
      };
    }
  }

  public async RegistrarSinCuenta(
    datos: DatosClienteSinCuenta,
  ) {
    const [correoExistente] = await conexion.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE correo = ?`,
      [datos.correo],
      return {
        success: true,
        message: "Cuenta creada correctamente",
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        message: "No se pudo completar el registro",
      };
    }
  }

  public async RegistrarSinCuenta(
    datos: DatosClienteSinCuenta,
  ) {
    const [correoExistente] = await conexion.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE correo = ?`,
      [datos.correo],
    );

    if (correoExistente) {
      return {
        success: false,
        message: "Ese correo ya tiene una cuenta registrada",
      };
    if (correoExistente) {
      return {
        success: false,
        message: "Ese correo ya tiene una cuenta registrada",
      };
    }

    const [documentoExistente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE num_documento = ?`,
      [datos.num_documento],
      `SELECT id_cliente
       FROM clientes
       WHERE num_documento = ?`,
      [datos.num_documento],
    );

    if (documentoExistente) {
      return {
        success: false,
        message: "Ese número de documento ya está registrado",
      };
      return {
        success: false,
        message: "Ese número de documento ya está registrado",
      };
    }

    const [rolCliente] = await conexion.query(
      `SELECT id_rol
       FROM roles
       WHERE nombre = 'Cliente'`,
      `SELECT id_rol
       FROM roles
       WHERE nombre = 'Cliente'`,
    );

    if (!rolCliente) {
      return {
        success: false,
        message: "No se encontró el rol Cliente",
      };
      return {
        success: false,
        message: "No se encontró el rol Cliente",
      };
    }

    const contrasenaHasheada = await hash(datos.contrasena);

    try {
      await conexion.transaction(async (conn) => {
        const resultadoUsuario = await conn.execute(
          `INSERT INTO usuarios (
             nombre_completo,
             correo,
             telefono,
             contrasena_hash,
             id_rol,
             activo
           )
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            datos.nombre_completo,
            datos.correo,
            datos.telefono,
            contrasenaHasheada,
            rolCliente.id_rol,
          ],
        );
      await conexion.transaction(async (conn) => {
        const resultadoUsuario = await conn.execute(
          `INSERT INTO usuarios (
             nombre_completo,
             correo,
             telefono,
             contrasena_hash,
             id_rol,
             activo
           )
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            datos.nombre_completo,
            datos.correo,
            datos.telefono,
            contrasenaHasheada,
            rolCliente.id_rol,
          ],
        );

        const idUsuario = resultadoUsuario.lastInsertId;
        const idUsuario = resultadoUsuario.lastInsertId;

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
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            idUsuario,
            datos.nombre_completo,
            datos.tipo_documento,
            datos.num_documento,
            datos.telefono,
            datos.correo,
            datos.direccion ?? null,
          ],
        );
      });
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
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            idUsuario,
            datos.nombre_completo,
            datos.tipo_documento,
            datos.num_documento,
            datos.telefono,
            datos.correo,
            datos.direccion ?? null,
          ],
        );
      });

      return {
        success: true,
        message: "Cliente y cuenta creados correctamente",
      };
      return {
        success: true,
        message: "Cliente y cuenta creados correctamente",
      };
    } catch (error) {
      console.error(error);
      console.error(error);

      return {
        success: false,
        message: "No se pudo crear el cliente y su cuenta",
      };
      return {
        success: false,
        message: "No se pudo crear el cliente y su cuenta",
      };
    }
  }
  }

  public async Listar(
    busqueda?: string,
    incluirInactivos = false,
  ) {
    const condiciones: string[] = [];
    const parametros: string[] = [];
  public async Listar(
    busqueda?: string,
    incluirInactivos = false,
  ) {
    const condiciones: string[] = [];
    const parametros: string[] = [];

    if (!incluirInactivos) {
      condiciones.push("activo = 1");
    }
    if (!incluirInactivos) {
      condiciones.push("activo = 1");
    }

    if (busqueda) {
      const termino = `%${busqueda}%`;
    if (busqueda) {
      const termino = `%${busqueda}%`;

      condiciones.push(
        `(nombre_completo LIKE ?
          OR num_documento LIKE ?
          OR correo LIKE ?)`,
      );
      condiciones.push(
        `(nombre_completo LIKE ?
          OR num_documento LIKE ?
          OR correo LIKE ?)`,
      );

      parametros.push(termino, termino, termino);
    }
      parametros.push(termino, termino, termino);
    }

    const where = condiciones.length > 0
    const where = condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

    return await conexion.query(
      `SELECT
         id_cliente,
         id_usuario,
         nombre_completo,
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

  // El documento no se modifica después del registro.
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
       WHERE correo = ?
         AND id_cliente != ?`,
      [datos.correo, id_cliente],
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
               direccion = ?
           WHERE id_cliente = ?`,
          [
            datos.nombre_completo,
            datos.telefono,
            datos.correo,
            datos.direccion ?? null,
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
              datos.nombre_completo,
              datos.correo,
              datos.telefono,
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
    const clienteActual = await this.ObtenerPorId(id_cliente);

    if (!clienteActual) {
      return {
        success: false,
        message: "El cliente no existe",
      };
    }

    await conexion.execute(
      `UPDATE clientes
       SET activo = 0
       WHERE id_cliente = ?`,
      [id_cliente],
    );

    if (clienteActual.id_usuario) {
      await conexion.execute(
        `UPDATE usuarios
         SET activo = 0
         WHERE id_usuario = ?`,
        [clienteActual.id_usuario],
      );
    }

    return {
      success: true,
      message: "Cliente desactivado correctamente",
    };
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
    if (!clienteActual) {
      return {
        success: false,
        message: "El cliente no existe",
      };
    }

    try {
      await conexion.transaction(async (conn) => {
        await conn.execute(
          `UPDATE clientes
           SET activo = ?
           WHERE id_cliente = ?`,
          [activo ? 1 : 0, id_cliente],
        );
    try {
      await conexion.transaction(async (conn) => {
        await conn.execute(
          `UPDATE clientes
           SET activo = ?
           WHERE id_cliente = ?`,
          [activo ? 1 : 0, id_cliente],
        );

        if (clienteActual.id_usuario) {
          await conn.execute(
            `UPDATE usuarios
             SET activo = ?
             WHERE id_usuario = ?`,
            [activo ? 1 : 0, clienteActual.id_usuario],
          );
        }
      });
        if (clienteActual.id_usuario) {
          await conn.execute(
            `UPDATE usuarios
             SET activo = ?
             WHERE id_usuario = ?`,
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
      return {
        success: false,
        message: "No se pudo cambiar el estado del cliente",
      };
    }
  }
}