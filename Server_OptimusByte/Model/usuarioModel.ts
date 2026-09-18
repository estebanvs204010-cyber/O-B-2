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
}