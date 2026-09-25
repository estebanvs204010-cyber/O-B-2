import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { Cliente } from "../Model/clienteModel.ts";

// POST /api/auth/registro-cliente  (público, cualquiera puede crear su cuenta)
export const PostRegistroCliente = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json();

        const camposObligatorios = ["nombre_completo", "tipo_documento", "num_documento", "telefono", "correo", "contrasena"];
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

        const objCliente = new Cliente();
        const resultado = await objCliente.RegistrarConCuenta(body);

        response.status = resultado.success ? 201 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// POST /api/clientes  (solo Admin, registra un cliente SIN cuenta de acceso)
export const PostCrearClienteAdmin = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json();

        const camposObligatorios = [
    "nombre_completo",
    "tipo_documento",
    "num_documento",
    "telefono",
    "correo",
    "contrasena",
];
        for (const campo of camposObligatorios) {
            if (!body[campo]) {
                response.status = 400;
                response.body = { success: false, message: `El campo ${campo} es obligatorio` };
                return;
            }
        }

        if (body.contrasena.length < 8) {
    response.status = 400;
    response.body = {
        success: false,
        message: "La contrasena debe tener al menos 8 caracteres",
    };
    return;
}

        const objCliente = new Cliente();
        const resultado = await objCliente.RegistrarSinCuenta(body);

        response.status = resultado.success ? 201 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/clientes?q=texto  (Admin o Mecanico)
export const GetClientes = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const busqueda = request.url.searchParams.get("q") ?? undefined;

        const objCliente = new Cliente();
        const clientes = await objCliente.Listar(busqueda);

        response.status = 200;
        response.body = { success: true, data: clientes };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/clientes/:id  (Admin o Mecanico)
export const GetClientePorId = async (ctx: RouterContext<"/api/clientes/:id">) => {
    const { params, response } = ctx;

    try {
        const id = Number(params.id);
        const objCliente = new Cliente();
        const cliente = await objCliente.ObtenerPorId(id);

        if (!cliente) {
            response.status = 404;
            response.body = { success: false, message: "Cliente no encontrado" };
            return;
        }

        response.status = 200;
        response.body = { success: true, data: cliente };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// PUT /api/clientes/:id  (solo Admin)
export const PutEditarCliente = async (ctx: RouterContext<"/api/clientes/:id">) => {
    const { params, request, response } = ctx;

    try {
        const id = Number(params.id);
        const body = await request.body.json();

        const camposObligatorios = ["nombre_completo", "tipo_documento", "num_documento", "telefono", "correo"];
        for (const campo of camposObligatorios) {
            if (!body[campo]) {
                response.status = 400;
                response.body = { success: false, message: `El campo ${campo} es obligatorio` };
                return;
            }
        }

        const objCliente = new Cliente();
        const resultado = await objCliente.Editar(id, body);

        response.status = resultado.success ? 200 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// DELETE /api/clientes/:id  (solo Admin) -> por dentro DESACTIVA, no borra físicamente
export const DeleteCliente = async (ctx: RouterContext<"/api/clientes/:id">) => {
    const { params, response } = ctx;

    try {
        const id = Number(params.id);
        const objCliente = new Cliente();
        const resultado = await objCliente.Desactivar(id);

        response.status = resultado.success ? 200 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};