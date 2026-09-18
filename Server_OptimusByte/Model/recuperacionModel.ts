import { conexion } from "./conexion.ts";
import { hash } from "../Dependencies/dependencias.ts";

const MINUTOS_EXPIRACION = 30;

export class RecuperacionPassword {
    // Genera y guarda un token de recuperación para el usuario con ese correo.
    // Devuelve el token SOLO si el correo existe; si no existe, devuelve null
    // (el controller decide qué responder al cliente en ambos casos, para no revelar
    // si un correo está o no registrado).
    public async GenerarToken(correo: string): Promise<{ token: string; nombre: string; correo: string } | null> {
        const [usuario] = await conexion.query(
            `SELECT id_usuario, nombre_completo, correo FROM usuarios WHERE correo = ? AND activo = 1`,
            [correo],
        );

        if (!usuario) return null;

        const token = crypto.randomUUID();
        const fechaExpiracion = new Date(Date.now() + MINUTOS_EXPIRACION * 60 * 1000);

        await conexion.execute(
            `INSERT INTO recuperacionpassword (id_usuario, token, fecha_expiracion) VALUES (?, ?, ?)`,
            [usuario.id_usuario, token, fechaExpiracion],
        );

        return { token, nombre: usuario.nombre_completo, correo: usuario.correo };
    }

    // Valida que el token exista, no esté usado y no haya expirado.
    public async ValidarToken(token: string): Promise<{ id_usuario: number } | null> {
        const [fila] = await conexion.query(
            `SELECT id_usuario, usado, fecha_expiracion
             FROM recuperacionpassword
             WHERE token = ?`,
            [token],
        );

        if (!fila) return null;
        if (Number(fila.usado) === 1) return null;
        if (new Date(fila.fecha_expiracion) < new Date()) return null;

        return { id_usuario: fila.id_usuario };
    }

    // Cambia la contraseña del usuario dueño del token, y marca el token como usado.
    public async RestablecerPassword(token: string, nuevaContrasena: string): Promise<boolean> {
        const tokenValido = await this.ValidarToken(token);
        if (!tokenValido) return false;

        const nuevoHash = await hash(nuevaContrasena);

        await conexion.execute(
            `UPDATE usuarios SET contrasena_hash = ? WHERE id_usuario = ?`,
            [nuevoHash, tokenValido.id_usuario],
        );

        await conexion.execute(
            `UPDATE recuperacionpassword SET usado = 1 WHERE token = ?`,
            [token],
        );

        return true;
    }
}