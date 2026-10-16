import { Context } from "../Dependencies/dependencias.ts";
import { AuthGoogle } from "../Model/googleAuthModel.ts";
import { crearToken } from "../Helpers/Jwt.ts";

interface GoogleTokenInfo {
    iss: string;
    aud: string;
    sub: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
}

// Le pregunta a Google si el ID token es auténtico (firma y expiración las valida Google).
// Nosotros comprobamos que fue emitido PARA NUESTRA app (aud) y que el correo está verificado.
async function verificarCredencialGoogle(credential: string): Promise<GoogleTokenInfo | null> {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    if (!clientId) {
        throw new Error("Falta GOOGLE_CLIENT_ID en el .env del servidor");
    }

    const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!res.ok) return null;

    const info = await res.json() as GoogleTokenInfo;

    if (info.aud !== clientId) return null;
    if (info.iss !== "accounts.google.com" && info.iss !== "https://accounts.google.com") return null;
    if (String(info.email_verified) !== "true" || !info.email) return null;

    return info;
}

// POST /api/auth/google   body: { credential: "<ID token de Google>" }
export const PostLoginGoogle = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json() as { credential?: string };

        if (!body.credential) {
            response.status = 400;
            response.body = { success: false, message: "Falta la credencial de Google" };
            return;
        }

        const info = await verificarCredencialGoogle(body.credential);

        if (!info) {
            response.status = 401;
            response.body = { success: false, message: "No se pudo validar tu cuenta de Google" };
            return;
        }

        const objGoogle = new AuthGoogle();
        const resultado = await objGoogle.IniciarSesionOCrear({
            sub: info.sub,
            correo: info.email!.toLowerCase(),
            nombre: info.name ?? info.email!,
            foto: info.picture,
        });

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
