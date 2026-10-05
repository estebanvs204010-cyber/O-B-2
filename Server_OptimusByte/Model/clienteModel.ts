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
}

interface DatosClienteSinCuenta {
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
    tipo_documento: string;
    num_documento: string;
    telefono: string;
    correo: string;
    direccion?: string;
}



export class Cliente {
    // ---------- Vía 1: el cliente se auto-registra (crea usuario + cliente juntos) ----------
    public async RegistrarConCuenta(datos: DatosRegistroCliente) {
        const [correoExistente] = await conexion.query(
            `SELECT id_usuario FROM usuarios WHERE correo = ?`,
            [datos.correo],
        );
        if (correoExistente) {
            return { success: false, message: "Ese correo ya está registrado" };
        }

        const [documentoExistente] = await conexion.query(
            `SELECT id_cliente FROM clientes WHERE num_documento = ?`,
            [datos.num_documento],
        );
        if (documentoExistente) {
            return { success: false, message: "Ese número de documento ya está registrado" };
        }

        const [rolCliente] = await conexion.query(
            `SELECT id_rol FROM roles WHERE nombre = 'Cliente'`,
        );
        if (!rolCliente) {
            return { success: false, message: "No se encontró el rol Cliente. Contacta al administrador" };
        }

        const contrasenaHasheada = await hash(datos.contrasena);

        try {
            // Transacción: las dos inserciones se tratan como una sola unidad.
            // Si algo falla dentro de este bloque, MySQL deshace TODO lo que
            // alcanzó a hacer (ningún INSERT queda a medias).
            await conexion.transaction(async (conn) => {
                const resultadoUsuario = await conn.execute(
                    `INSERT INTO usuarios (nombre_completo, correo, telefono, contrasena_hash, id_rol)
                     VALUES (?, ?, ?, ?, ?)`,
                    [datos.nombre_completo, datos.correo, datos.telefono, contrasenaHasheada, rolCliente.id_rol],
                );

                const idUsuario = resultadoUsuario.lastInsertId;

                await conn.execute(
                    `INSERT INTO clientes (id_usuario, nombre_completo, tipo_documento, num_documento, telefono, correo, direccion)
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

            return { success: true, message: "Cuenta creada correctamente" };
        } catch (error) {
            console.error(error);
            return { success: false, message: "No se pudo completar el registro" };
        }
    }

    // ---------- Vía 2: el Admin registra al cliente, sin crearle una cuenta ----------
    public async RegistrarSinCuenta(datos: DatosClienteSinCuenta) {
    const [correoUsuarioExistente] = await conexion.query(
        `SELECT id_usuario FROM usuarios WHERE correo = ?`,
        [datos.correo],
    );

    if (correoUsuarioExistente) {
        return {
            success: false,
            message: "Ese correo ya tiene una cuenta registrada",
        };
    }

    const [documentoExistente] = await conexion.query(
        `SELECT id_cliente FROM clientes WHERE num_documento = ?`,
        [datos.num_documento],
    );

    if (documentoExistente) {
        return {
            success: false,
            message: "Ese numero de documento ya esta registrado",
        };
    }

    const [rolCliente] = await conexion.query(
        `SELECT id_rol FROM roles WHERE nombre = 'Cliente'`,
    );

    if (!rolCliente) {
        return {
            success: false,
            message: "No se encontro el rol Cliente",
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

        return {
            success: true,
            message: "Cliente y cuenta de acceso creados correctamente",
        };
    } catch (error) {
        console.error(error);

        return {
            success: false,
            message: "No se pudo crear el cliente y su cuenta",
        };
    }
}



        // ---------- Listar / buscar clientes activos ----------
    // Si "busqueda" viene vacío, trae todos. Si viene, filtra por nombre, documento o correo.
    public async Listar(busqueda?: string) {
        if (busqueda) {
            const termino = `%${busqueda}%`;
            return await conexion.query(
                `SELECT id_cliente, id_usuario, nombre_completo, tipo_documento, num_documento, telefono, correo, activo
                 FROM clientes
                 WHERE activo = 1
                   AND (nombre_completo LIKE ? OR num_documento LIKE ? OR correo LIKE ?)
                 ORDER BY nombre_completo`,
                [termino, termino, termino],
            );
        }

        return await conexion.query(
            `SELECT id_cliente, id_usuario, nombre_completo, tipo_documento, num_documento, telefono, correo, activo
             FROM clientes
             WHERE activo = 1
             ORDER BY nombre_completo`,
        );
    }


        // ---------- Obtener uno solo, por id ----------
    public async ObtenerPorId(id_cliente: number) {
        const [cliente] = await conexion.query(
            `SELECT id_cliente, id_usuario, nombre_completo, tipo_documento, num_documento, telefono, correo, direccion, activo
             FROM clientes
             WHERE id_cliente = ?`,
            [id_cliente],
        );
        return cliente ?? null;
    }

    // ---------- Editar ----------
    public async Editar(id_cliente: number, datos: DatosEdicionCliente) {
        const clienteActual = await this.ObtenerPorId(id_cliente);
        if (!clienteActual) {
            return { success: false, message: "El cliente no existe" };
        }

        const [documentoDuplicado] = await conexion.query(
            `SELECT id_cliente FROM clientes WHERE num_documento = ? AND id_cliente != ?`,
            [datos.num_documento, id_cliente],
        );
        if (documentoDuplicado) {
            return { success: false, message: "Ese número de documento ya lo usa otro cliente" };
        }

        const [correoDuplicado] = await conexion.query(
            `SELECT id_cliente FROM clientes WHERE correo = ? AND id_cliente != ?`,
            [datos.correo, id_cliente],
        );
        if (correoDuplicado) {
            return { success: false, message: "Ese correo ya lo usa otro cliente" };
        }

        try {
            await conexion.transaction(async (conn) => {
                await conn.execute(
                    `UPDATE clientes
                     SET nombre_completo = ?, tipo_documento = ?, num_documento = ?, telefono = ?, correo = ?, direccion = ?
                     WHERE id_cliente = ?`,
                    [
                        datos.nombre_completo,
                        datos.tipo_documento,
                        datos.num_documento,
                        datos.telefono,
                        datos.correo,
                        datos.direccion ?? null,
                        id_cliente,
                    ],
                );

                // Si este cliente SÍ tiene cuenta de acceso, mantenemos sincronizados
                // nombre/correo/teléfono también en la tabla usuarios, para que no
                // quede desactualizada con lo que ve al iniciar sesión.
                if (clienteActual.id_usuario) {
                    await conn.execute(
                        `UPDATE usuarios SET nombre_completo = ?, correo = ?, telefono = ? WHERE id_usuario = ?`,
                        [datos.nombre_completo, datos.correo, datos.telefono, clienteActual.id_usuario],
                    );
                }
            });

            return { success: true, message: "Cliente actualizado correctamente" };
        } catch (error) {
            console.error(error);
            return { success: false, message: "No se pudo actualizar el cliente" };
        }
    }

    // ---------- "Eliminar" = desactivar (nunca borrado físico) ----------
    public async Desactivar(id_cliente: number) {
        const clienteActual = await this.ObtenerPorId(id_cliente);
        if (!clienteActual) {
            return { success: false, message: "El cliente no existe" };
        }

        await conexion.execute(
            `UPDATE clientes SET activo = 0 WHERE id_cliente = ?`,
            [id_cliente],
        );

        // Si tiene cuenta de acceso, también se la desactivamos: no debería
        // poder seguir iniciando sesión si el taller ya no lo tiene como cliente activo.
        if (clienteActual.id_usuario) {
            await conexion.execute(
                `UPDATE usuarios SET activo = 0 WHERE id_usuario = ?`,
                [clienteActual.id_usuario],
            );
        }

        return { success: true, message: "Cliente desactivado correctamente" };
    }
}