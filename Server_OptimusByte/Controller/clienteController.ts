import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { Cliente } from "../Model/clienteModel.ts";

// POST /api/auth/registro-cliente
export const PostRegistroCliente = async (ctx: Context) => {
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
        response.body = {
          success: false,
          message: `El campo ${campo} es obligatorio`,
        };
        return;
      }
    }

    if (body.contrasena.length < 8) {
      response.status = 400;
      response.body = {
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres",
      };
      return;
    }

    const cliente = new Cliente();
    const resultado = await cliente.RegistrarConCuenta(body);

    response.status = resultado.success ? 201 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// POST /api/clientes
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
        response.body = {
          success: false,
          message: `El campo ${campo} es obligatorio`,
        };
        return;
      }
    }

    if (body.contrasena.length < 8) {
      response.status = 400;
      response.body = {
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres",
      };
      return;
    }

    const cliente = new Cliente();
    const resultado = await cliente.RegistrarSinCuenta(body);

    response.status = resultado.success ? 201 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// GET /api/clientes?q=texto
export const GetClientes = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const busqueda =
      request.url.searchParams.get("q") ?? undefined;

    const incluirInactivos =
      request.url.searchParams.get("incluir_inactivos") === "true";

    const cliente = new Cliente();
    const clientes = await cliente.Listar(
      busqueda,
      incluirInactivos,
    );

    response.status = 200;
    response.body = {
      success: true,
      data: clientes,
    };
  } catch (error) {
    console.error(error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// GET /api/clientes/:id
export const GetClientePorId = async (
  ctx: RouterContext<"/api/clientes/:id">,
) => {
  const { params, response } = ctx;

  try {
    const id = Number(params.id);

    const cliente = new Cliente();
    const resultado = await cliente.ObtenerPorId(id);

    if (!resultado) {
      response.status = 404;
      response.body = {
        success: false,
        message: "Cliente no encontrado",
      };
      return;
    }

    response.status = 200;
    response.body = {
      success: true,
      data: resultado,
    };
  } catch (error) {
    console.error(error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// PUT /api/clientes/:id
// El documento NO se puede modificar.
export const PutEditarCliente = async (
  ctx: RouterContext<"/api/clientes/:id">,
) => {
  const { params, request, response } = ctx;

  try {
    const id = Number(params.id);
    const body = await request.body.json();

    const camposObligatorios = [
      "nombre_completo",
      "telefono",
      "correo",
    ];

for (const campo of camposObligatorios) {
  if (!body[campo]) {
    response.status = 400;
    response.body = {
      success: false,
      message: `El campo ${campo} es obligatorio`,
    };
    return;
  }
}

if (
  body.foto_url !== undefined &&
  (typeof body.foto_url !== "string" ||
    !body.foto_url.startsWith("https://"))
) {
  response.status = 400;
  response.body = {
    success: false,
    message: "La URL de la foto no es válida",
  };
  return;
}

    const cliente = new Cliente();

    const resultado = await cliente.Editar(id, {
      nombre_completo: body.nombre_completo,
      telefono: body.telefono,
      correo: body.correo,
      direccion: body.direccion,
    });

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// DELETE /api/clientes/:id
export const DeleteCliente = async (
  ctx: RouterContext<"/api/clientes/:id">,
) => {
  const { params, response } = ctx;

  try {
    const id = Number(params.id);

    const cliente = new Cliente();
    const resultado = await cliente.Desactivar(id);

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// PUT /api/clientes/:id/estado
export const PutEstadoCliente = async (
  ctx: RouterContext<"/api/clientes/:id/estado">,
) => {
  const { params, request, response } = ctx;

  try {
    const id = Number(params.id);
    const body = await request.body.json();

    if (typeof body.activo !== "boolean") {
      response.status = 400;
      response.body = {
        success: false,
        message: "El campo activo debe ser booleano",
      };
      return;
    }

    const cliente = new Cliente();
    const resultado = await cliente.CambiarEstado(
      id,
      body.activo,
    );

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};