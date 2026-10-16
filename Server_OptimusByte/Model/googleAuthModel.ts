import { conexion } from "./conexion.ts";
import { hash } from "../Dependencies/dependencias.ts";

export interface PerfilGoogle {
    sub: string;      // id único e inmutable de la cuenta de Google
    correo: string;
    nombre: string;
    foto?: string;
}

interface UsuarioAutenticado {
    id_usuario: number;
    nombre_completo: string;
    correo: string;
    rol: string;
}

export class AuthGoogle {
    // Si el correo (o el google_id) ya existe -> inicia sesión (y vincula Google si faltaba).
    // Si no existe -> crea usuario + cliente en una transacción.
    public async IniciarSesionOCrear(
        perfil: PerfilGoogle,
    ): Promise<{ success: boolean; message: string; data?: UsuarioAutenticado }> {
        try {
            const [existente] = await conexion.query(
                `SELECT u.id_usuario, u.nombre_completo, u.correo, u.activo, u.google_id, r.nombre AS rol
                 FROM usuarios u
                 INNER JOIN roles r ON r.id_rol = u.id_rol
                 WHERE u.google_id = ? OR u.correo = ?
                 ORDER BY (u.google_id = ?) DESC
                 LIMIT 1`,
                [perfil.sub, perfil.correo, perfil.sub],
            );

            if (existente) {
                if (Number(existente.activo) === 0) {
                    return { success: false, message: "Esta cuenta está desactivada" };
                }

                if (existente.google_id && existente.google_id !== perfil.sub) {
                    return { success: false, message: "Este correo está vinculado a otra cuenta de Google" };
                }

                if (!existente.google_id) {
                    await conexion.execute(
                        `UPDATE usuarios SET google_id = ? WHERE id_usuario = ?`,
                        [perfil.sub, existente.id_usuario],
                    );
                }

                return {
                    success: true,
                    message: "Inicio de sesión exitoso",
                    data: {
                        id_usuario: existente.id_usuario,
                        nombre_completo: existente.nombre_completo,
                        correo: existente.correo,
                        rol: existente.rol,
                    },
                };
            }

            // ---------- Primera vez: se registra como Cliente ----------
            const [rolCliente] = await conexion.query(
                `SELECT id_rol FROM roles WHERE nombre = 'Cliente'`,
            );
            if (!rolCliente) {
                return { success: false, message: "No se encontró el rol Cliente. Contacta al administrador" };
            }

            // contrasena_hash es NOT NULL y el login normal hace compare() sobre él,
            // así que se guarda el hash de una clave aleatoria que nadie conoce.
            // Si luego quiere clave propia, usa "Olvidé mi contraseña".
            const claveAleatoria = await hash(crypto.randomUUID() + crypto.randomUUID());
            const nombre = perfil.nombre.slice(0, 100);
            let idUsuario = 0;

            await conexion.transaction(async (conn) => {
                const resultado = await conn.execute(
                    `INSERT INTO usuarios (nombre_completo, correo, telefono, contrasena_hash, google_id, id_rol)
                     VALUES (?, ?, NULL, ?, ?, ?)`,
                    [nombre, perfil.correo, claveAleatoria, perfil.sub, rolCliente.id_rol],
                );
                idUsuario = Number(resultado.lastInsertId);

                await conn.execute(
                    `INSERT INTO clientes (id_usuario, nombre_completo, tipo_documento, num_documento, telefono, correo, foto_url)
                     VALUES (?, ?, 'CC', NULL, NULL, ?, ?)`,
                    [idUsuario, nombre, perfil.correo, perfil.foto?.slice(0, 500) ?? null],
                );
            });

            return {
                success: true,
                message: "Cuenta creada con Google",
                data: { id_usuario: idUsuario, nombre_completo: nombre, correo: perfil.correo, rol: "Cliente" },
            };
        } catch (error) {
            console.error(error);
            return { success: false, message: "Error interno del servidor" };
        }
    }
}
