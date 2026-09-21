import { conexion } from "./conexion.ts";
import { compare, hash } from "../Dependencies/dependencias.ts";

interface LoginInput {
    correo: string;
    contrasena: string;
}

interface UsuarioAutenticado {
    id_usuario: number;
    nombre_completo: string;
    correo: string;
    rol: string;
}

interface DatosMecanico {
    nombre_completo: string;
    correo: string;
    telefono: string;
    contrasena: string;
}

export class Usuario {
    private _correo: string | null;
    private _contrasena: string | null;

    constructor(datos: LoginInput | null = null) {
        this._correo = datos?.correo ?? null;
        this._contrasena = datos?.contrasena ?? null;
    }

    // ---------- Login ----------
    public async IniciarSesion(): Promise<{ success: boolean; message: string; data?: UsuarioAutenticado }> {
        try {
            const [fila] = await conexion.query(
                `SELECT u.id_usuario, u.nombre_completo, u.correo, u.contrasena_hash, u.activo, r.nombre AS rol
                 FROM usuarios u
                 INNER JOIN roles r ON r.id_rol = u.id_rol
                 WHERE u.correo = ?`,
                [this._correo],
            );

            if (!fila) {
                return { success: false, message: "Correo o contraseña incorrectos" };
            }

            if (Number(fila.activo) === 0) {
                return { success: false, message: "Esta cuenta está desactivada" };
            }

            const passwordValida = await compare(this._contrasena as string, fila.contrasena_hash);

            if (!passwordValida) {
                return { success: false, message: "Correo o contraseña incorrectos" };
            }

            return {
                success: true,
                message: "Inicio de sesión exitoso",
                data: {
                    id_usuario: fila.id_usuario,
                    nombre_completo: fila.nombre_completo,
                    correo: fila.correo,
                    rol: fila.rol,
                },
            };
        } catch (error) {
            console.error(error);
            return { success: false, message: "Error interno del servidor" };
        }
    }

        // ---------- Solo Admin: crear cuenta de Mecánico ----------
    public async CrearMecanico(datos: DatosMecanico): Promise<{ success: boolean; message: string }> {
        try {
            const [correoExistente] = await conexion.query(
                `SELECT id_usuario FROM usuarios WHERE correo = ?`,
                [datos.correo],
            );
            if (correoExistente) {
                return { success: false, message: "Ese correo ya está registrado" };
            }

            const [rolMecanico] = await conexion.query(
                `SELECT id_rol FROM roles WHERE nombre = 'Mecanico'`,
            );
            if (!rolMecanico) {
                return { success: false, message: "No se encontró el rol Mecanico. Contacta al administrador" };
            }

            const contrasenaHasheada = await hash(datos.contrasena);

            await conexion.execute(
                `INSERT INTO usuarios (nombre_completo, correo, telefono, contrasena_hash, id_rol)
                 VALUES (?, ?, ?, ?, ?)`,
                [datos.nombre_completo, datos.correo, datos.telefono, contrasenaHasheada, rolMecanico.id_rol],
            );

            return { success: true, message: "Mecánico registrado correctamente" };
        } catch (error) {
            console.error(error);
            return { success: false, message: "Error interno del servidor" };
        }
    }


        // ---------- Solo Admin: listar Mecánicos ----------
    public async ListarMecanicos() {
        const filas = await conexion.query(
            `SELECT u.id_usuario, u.nombre_completo, u.correo, u.telefono, u.activo, u.fecha_creacion
             FROM usuarios u
             INNER JOIN roles r ON r.id_rol = u.id_rol
             WHERE r.nombre = 'Mecanico'
             ORDER BY u.fecha_creacion DESC`,
        );
        return filas;
    }
}