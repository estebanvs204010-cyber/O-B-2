import { Context } from "../Dependencies/dependencias.ts";
import { Usuario } from "../Model/usuarioModel.ts";

// POST /api/usuarios/mecanico  (solo Admin)
export const PostCrearMecanico = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json();

        const camposObligatorios = ["nombre_completo", "correo", "telefono", "contrasena"];
        for (const campo of camposObligatorios) {
            if (!body[campo]) {
                response.status = 400;
                response.body = { success: false, message: `El campo ${campo} es obligatorio` };
                return;
            }
        }

        if (body.contrasena.length < 8) {
            response.status = 400;
            response.body = { success: false, message: "La contraseña debe tener al menos 8 caracteres" };
            return;
        }

        const objUsuario = new Usuario();
        const resultado = await objUsuario.CrearMecanico(body);

        response.status = resultado.success ? 201 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};



// GET /api/usuarios/mecanico  (solo Admin)
export const GetMecanicos = async (ctx: Context) => {
    const { response } = ctx;

    try {
        const objUsuario = new Usuario();
        const mecanicos = await objUsuario.ListarMecanicos();

        response.status = 200;
        response.body = { success: true, data: mecanicos };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};