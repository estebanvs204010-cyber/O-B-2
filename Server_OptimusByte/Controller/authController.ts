import { Context } from "../Dependencies/dependencias.ts";
import { Usuario } from "../Model/usuarioModel.ts";
import { RecuperacionPassword } from "../Model/recuperacionModel.ts";
import { crearToken } from "../Helpers/Jwt.ts";
import { enviarCorreoHtml } from "../Helpers/emailService.ts";
import { correoRecuperacionPassword } from "../Helpers/templates.ts";
import { createRemoteJWKSet, jwtVerify } from "jose";

const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "http://localhost:4321";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// POST /api/auth/google { credential }
export const PostLoginGoogle = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const { credential } = await request.body.json() as { credential?: string };
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID")?.trim();

        if (!clientId) {
            response.status = 500;
            response.body = { success: false, message: "Falta configurar GOOGLE_CLIENT_ID en el servidor" };
            return;
        }
        if (!credential || credential.length > 10_000) {
            response.status = 400;
            response.body = { success: false, message: "No se recibió una credencial válida de Google" };
            return;
        }

        const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
            issuer: ["https://accounts.google.com", "accounts.google.com"],
            audience: clientId,
        });
        const correo = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
        if (!correo || payload.email_verified !== true) {
            response.status = 401;
            response.body = { success: false, message: "Google no devolvió un correo verificado" };
            return;
        }

        const resultado = await new Usuario().IniciarSesionGoogle(correo);
        if (!resultado.success || !resultado.data) {
            response.status = 401;
            response.body = { success: false, message: resultado.message };
            return;
        }

        const token = await crearToken(resultado.data.id_usuario, resultado.data.rol);
        response.status = 200;
        response.body = { success: true, message: resultado.message, token, usuario: resultado.data };
    } catch (error) {
        console.error("Error validando inicio de sesión de Google:", error);
        response.status = 401;
        response.body = { success: false, message: "No se pudo validar la cuenta de Google. Inténtalo de nuevo." };
    }
};

// POST /api/auth/login ....
export const PostLogin = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json() as { correo?: string; contrasena?: string };

        if (!body.correo || !body.contrasena) {
            response.status = 400;
            response.body = { success: false, message: "Correo y contraseña son obligatorios" };
            return;
        }

        const objUsuario = new Usuario({ correo: body.correo, contrasena: body.contrasena });
        const resultado = await objUsuario.IniciarSesion();

        if (resultado.success && resultado.data) {
            const token = await crearToken(resultado.data.id_usuario, resultado.data.rol);
            response.status = 200;
            response.body = {
                success: true,
                message: resultado.message,
                token,
                usuario: resultado.data,
            };
        } else {
            response.status = 401;
            response.body = { success: false, message: resultado.message };
        }
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// POST /api/auth/solicitar-recuperacion
export const PostSolicitarRecuperacion = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json() as { correo?: string };

        if (!body.correo) {
            response.status = 400;
            response.body = { success: false, message: "El correo es obligatorio" };
            return;
        }

        const objRecuperacion = new RecuperacionPassword();
        const resultado = await objRecuperacion.GenerarToken(body.correo);

        // Si el correo existe, mandamos el correo con el enlace.
        // Si NO existe, no hacemos nada más — pero respondemos EXACTAMENTE igual,
        // para no revelarle a quien está probando correos al azar cuáles sí están registrados.
        if (resultado) {
            const enlace = `${FRONTEND_URL}/restablecer-password?token=${resultado.token}`;
            const { asunto, mensaje, html } = correoRecuperacionPassword(resultado.nombre, enlace);

            enviarCorreoHtml({ destinatario: resultado.correo, asunto, mensaje, html }).catch((error) => {
                console.error("Error enviando correo de recuperación:", error);
            });
        }

        response.status = 200;
        response.body = {
            success: true,
            message: "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña",
        };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// POST /api/auth/restablecer-password
export const PostRestablecerPassword = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json() as { token?: string; nuevaContrasena?: string };

        if (!body.token || !body.nuevaContrasena) {
            response.status = 400;
            response.body = { success: false, message: "Token y nueva contraseña son obligatorios" };
            return;
        }

        if (body.nuevaContrasena.length < 8) {
            response.status = 400;
            response.body = { success: false, message: "La contraseña debe tener al menos 8 caracteres" };
            return;
        }

        const objRecuperacion = new RecuperacionPassword();
        const exito = await objRecuperacion.RestablecerPassword(body.token, body.nuevaContrasena);

        if (!exito) {
            response.status = 400;
            response.body = { success: false, message: "El enlace es inválido, ya fue usado, o expiró" };
            return;
        }

        response.status = 200;
        response.body = { success: true, message: "Contraseña actualizada correctamente" };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};
