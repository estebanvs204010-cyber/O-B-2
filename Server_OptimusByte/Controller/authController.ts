import { Context } from "../Dependencies/dependencias.ts";
import { Usuario } from "../Model/usuarioModel.ts";
import { RecuperacionPassword } from "../Model/recuperacionModel.ts";
import { crearToken } from "../Helpers/Jwt.ts";
import {
  guardarTokenCookie,
  eliminarTokenCookie,
} from "../Helpers/cookies.ts";
import { enviarCorreoHtml } from "../Helpers/emailService.ts";
import { correoRecuperacionPassword } from "../Helpers/templates.ts";

const FRONTEND_URL =
  Deno.env.get("FRONTEND_URL") ?? "http://localhost:4321";

// POST /api/auth/login
export const PostLogin = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json() as {
      correo?: string;
      contrasena?: string;
    };

    if (!body.correo || !body.contrasena) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Correo y contraseña son obligatorios",
      };
      return;
    }

    const objUsuario = new Usuario({
      correo: body.correo,
      contrasena: body.contrasena,
    });

    const resultado = await objUsuario.IniciarSesion();

    if (!resultado.success || !resultado.data) {
      response.status = 401;
      response.body = {
        success: false,
        message: resultado.message,
      };
      return;
    }

    const token = await crearToken(
      resultado.data.id_usuario,
      resultado.data.rol,
    );

    // El JWT se guarda en una cookie HttpOnly.
    guardarTokenCookie(response, token);

    response.status = 200;
    response.body = {
      success: true,
      message: resultado.message,
      usuario: resultado.data,
    };
  } catch (error) {
    console.error("Error en login:", error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// POST /api/auth/logout
export const PostLogout = (ctx: Context) => {
  eliminarTokenCookie(ctx.response);

  ctx.response.status = 200;
  ctx.response.body = {
    success: true,
    message: "Sesión cerrada correctamente",
  };
};

// POST /api/auth/solicitar-recuperacion
export const PostSolicitarRecuperacion = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json() as {
      correo?: string;
    };

    if (!body.correo) {
      response.status = 400;
      response.body = {
        success: false,
        message: "El correo es obligatorio",
      };
      return;
    }

    const objRecuperacion = new RecuperacionPassword();
    const resultado = await objRecuperacion.GenerarToken(body.correo);

    // Se responde igual exista o no el correo.
    if (resultado) {
      const enlace =
        `${FRONTEND_URL}/restablecer-password?token=${resultado.token}`;

      const { asunto, mensaje, html } = correoRecuperacionPassword(
        resultado.nombre,
        enlace,
      );

      enviarCorreoHtml({
        destinatario: resultado.correo,
        asunto,
        mensaje,
        html,
      }).catch((error) => {
        console.error("Error enviando correo de recuperación:", error);
      });
    }

    response.status = 200;
    response.body = {
      success: true,
      message:
        "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña",
    };
  } catch (error) {
    console.error("Error solicitando recuperación:", error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// POST /api/auth/restablecer-password
export const PostRestablecerPassword = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json() as {
      token?: string;
      nuevaContrasena?: string;
    };

    if (!body.token || !body.nuevaContrasena) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Token y nueva contraseña son obligatorios",
      };
      return;
    }

    if (body.nuevaContrasena.length < 8) {
      response.status = 400;
      response.body = {
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres",
      };
      return;
    }

    const objRecuperacion = new RecuperacionPassword();

    const exito = await objRecuperacion.RestablecerPassword(
      body.token,
      body.nuevaContrasena,
    );

    if (!exito) {
      response.status = 400;
      response.body = {
        success: false,
        message: "El enlace es inválido, ya fue usado, o expiró",
      };
      return;
    }

    response.status = 200;
    response.body = {
      success: true,
      message: "Contraseña actualizada correctamente",
    };
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};