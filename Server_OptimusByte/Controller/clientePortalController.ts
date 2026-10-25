import { Context } from "../Dependencies/dependencias.ts";
import { conexion } from "../Model/conexion.ts";
import { Vehiculo } from "../Model/vehiculoModel.ts";

interface UsuarioJwt {
  sub?: string;
}

function obtenerIdUsuario(ctx: Context): number | null {
  const usuario = ctx.state.user as UsuarioJwt | undefined;
  const idUsuario = Number(usuario?.sub);

  return Number.isInteger(idUsuario) && idUsuario > 0
    ? idUsuario
    : null;
}

// GET /api/cliente/me
export const GetMiPerfilCliente = async (ctx: Context) => {
  const { response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = {
      success: false,
      message: "Usuario no autenticado",
    };
    return;
  }

  try {
    const [cliente] = await conexion.query(
      `SELECT
         id_cliente,
         id_usuario,
         nombre_completo,
         tipo_documento,
         num_documento,
         telefono,
         correo,
         direccion,
         foto_perfil,
         activo
       FROM clientes
       WHERE id_usuario = ?
         AND activo = 1`,
      [idUsuario],
    );

    if (!cliente) {
      response.status = 404;
      response.body = {
        success: false,
        message: "Perfil de cliente no encontrado",
      };
      return;
    }

    response.status = 200;
    response.body = {
      success: true,
      data: cliente,
    };
  } catch (error) {
    console.error("[GET PERFIL] Error real:", error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// PUT /api/cliente/me
export const PutActualizarMiPerfil = async (ctx: Context) => {
  const { request, response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = {
      success: false,
      message: "Usuario no autenticado",
    };
    return;
  }

  try {
    const body = await request.body.json();

    for (const campo of [
      "nombre_completo",
      "telefono",
      "correo",
    ]) {
      if (
        body[campo] === undefined ||
        body[campo] === null ||
        body[campo] === ""
      ) {
        response.status = 400;
        response.body = {
          success: false,
          message: `El campo ${campo} es obligatorio`,
        };
        return;
      }
    }

    const [cliente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE id_usuario = ?
         AND activo = 1`,
      [idUsuario],
    );

    if (!cliente) {
      response.status = 404;
      response.body = {
        success: false,
        message: "Perfil de cliente no encontrado",
      };
      return;
    }

    const correo = String(body.correo).trim();

    const [correoUsado] = await conexion.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE correo = ?
         AND id_usuario <> ?`,
      [correo, idUsuario],
    );

    if (correoUsado) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Ese correo ya está registrado",
      };
      return;
    }

    await conexion.transaction(async (conn) => {
      await conn.execute(
        `UPDATE clientes
         SET nombre_completo = ?,
             telefono = ?,
             correo = ?,
             direccion = ?
         WHERE id_cliente = ?`,
        [
          String(body.nombre_completo).trim(),
          String(body.telefono).trim(),
          correo,
          body.direccion
            ? String(body.direccion).trim()
            : null,
          Number(cliente.id_cliente),
        ],
      );

      await conn.execute(
        `UPDATE usuarios
         SET nombre_completo = ?,
             telefono = ?,
             correo = ?
         WHERE id_usuario = ?`,
        [
          String(body.nombre_completo).trim(),
          String(body.telefono).trim(),
          correo,
          idUsuario,
        ],
      );
    });

    response.status = 200;
    response.body = {
      success: true,
      message: "Perfil actualizado correctamente",
    };
  } catch (error) {
    console.error("[PUT PERFIL] Error real:", error);

    response.status = 500;
    response.body = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Error interno del servidor",
    };
  }
};

// PUT /api/cliente/foto
export const PutActualizarFotoPerfil = async (ctx: Context) => {
  const { request, response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = {
      success: false,
      message: "Usuario no autenticado",
    };
    return;
  }

  try {
    const body = await request.body.json();
    const fotoPerfil = String(body.foto_perfil ?? "");

    if (!fotoPerfil) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Debes seleccionar una imagen",
      };
      return;
    }

    if (
      !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(
        fotoPerfil,
      )
    ) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Solo se permiten imágenes PNG, JPG o WEBP",
      };
      return;
    }

    if (fotoPerfil.length > 7_000_000) {
      response.status = 400;
      response.body = {
        success: false,
        message: "La imagen no puede superar los 5 MB",
      };
      return;
    }

    const [cliente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE id_usuario = ?
         AND activo = 1`,
      [idUsuario],
    );

    if (!cliente) {
      response.status = 404;
      response.body = {
        success: false,
        message: "Perfil de cliente no encontrado",
      };
      return;
    }

    await conexion.execute(
      `UPDATE clientes
       SET foto_perfil = ?
       WHERE id_cliente = ?`,
      [
        fotoPerfil,
        Number(cliente.id_cliente),
      ],
    );

    response.status = 200;
    response.body = {
      success: true,
      message: "Foto de perfil actualizada correctamente",
      data: {
        foto_perfil: fotoPerfil,
      },
    };
  } catch (error) {
    console.error("[PUT FOTO] Error real:", error);

    response.status = 500;
    response.body = {
      success: false,
      message: "No se pudo actualizar la foto",
    };
  }
};

// GET /api/cliente/mis-vehiculos
export const GetMisVehiculos = async (ctx: Context) => {
  const { response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = {
      success: false,
      message: "Usuario no autenticado",
    };
    return;
  }

  try {
    const vehiculos = await conexion.query(
      `SELECT
         v.id_vehiculo,
         v.id_cliente,
         v.placa,
         v.marca,
         v.modelo,
         v.anio,
         v.color,
         v.vin,
         v.km_actuales,
         v.activo
       FROM vehiculos v
       INNER JOIN clientes c
         ON c.id_cliente = v.id_cliente
       WHERE c.id_usuario = ?
         AND c.activo = 1
         AND v.activo = 1
       ORDER BY v.fecha_registro DESC`,
      [idUsuario],
    );

    response.status = 200;
    response.body = {
      success: true,
      data: vehiculos,
    };
  } catch (error) {
    console.error("[GET VEHICULOS] Error real:", error);

    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

// POST /api/cliente/mis-vehiculos
export const PostRegistrarMiVehiculo = async (
  ctx: Context,
) => {
  const { request, response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = {
      success: false,
      message: "Usuario no autenticado",
    };
    return;
  }

  try {
    const body = await request.body.json();

    for (const campo of [
      "placa",
      "marca",
      "modelo",
      "anio",
    ]) {
      if (
        body[campo] === undefined ||
        body[campo] === null ||
        body[campo] === ""
      ) {
        response.status = 400;
        response.body = {
          success: false,
          message: `El campo ${campo} es obligatorio`,
        };
        return;
      }
    }

    const [cliente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE id_usuario = ?
         AND activo = 1`,
      [idUsuario],
    );

    if (!cliente) {
      response.status = 404;
      response.body = {
        success: false,
        message: "Perfil de cliente no encontrado",
      };
      return;
    }

    const vehiculo = new Vehiculo();

    const resultado = await vehiculo.Crear({
      id_cliente: Number(cliente.id_cliente),
      placa: String(body.placa).trim().toUpperCase(),
      marca: String(body.marca).trim(),
      modelo: String(body.modelo).trim(),
      anio: Number(body.anio),
      color: body.color
        ? String(body.color).trim()
        : undefined,
      vin: body.vin
        ? String(body.vin).trim()
        : undefined,
      km_actuales:
        body.km_actuales === undefined ||
        body.km_actuales === ""
          ? 0
          : Number(body.km_actuales),
    });

    response.status = resultado.success ? 201 : 400;
    response.body = resultado;
  } catch (error) {
    console.error("[POST VEHICULO] Error real:", error);

    response.status = 500;
    response.body = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo registrar el vehículo",
    };
  }
};

// GET /api/cliente/citas
export const GetMisCitas = async (ctx: Context) => {
  const { response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = {
      success: false,
      message: "Usuario no autenticado",
    };
    return;
  }

  try {
    const [cliente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE id_usuario = ?
         AND activo = 1`,
      [idUsuario],
    );

    if (!cliente) {
      response.status = 404;
      response.body = {
        success: false,
        message: "Perfil de cliente no encontrado",
      };
      return;
    }

    const citas = await conexion.query(
      `SELECT
         c.id_cita,
         c.id_cliente,
         c.id_vehiculo,
         c.fecha_cita,
         c.hora_cita,
         c.servicio,
         c.observaciones,
         c.estado,
         c.fecha_creacion,
         v.placa,
         v.marca,
         v.modelo
       FROM citas c
       LEFT JOIN vehiculos v
         ON v.id_vehiculo = c.id_vehiculo
       WHERE c.id_cliente = ?
       ORDER BY c.fecha_cita ASC, c.hora_cita ASC`,
      [Number(cliente.id_cliente)],
    );

    response.status = 200;
    response.body = {
      success: true,
      data: citas,
    };
  } catch (error) {
    console.error("[GET CITAS] Error real:", error);

    response.status = 500;
    response.body = {
      success: false,
      message: "No se pudieron cargar las citas",
    };
  }
};

// POST /api/cliente/citas
export const PostSolicitarCita = async (ctx: Context) => {
  const { request, response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = {
      success: false,
      message: "Usuario no autenticado",
    };
    return;
  }

  try {
    const body = await request.body.json();

    for (const campo of [
      "id_vehiculo",
      "fecha_cita",
      "hora_cita",
      "servicio",
    ]) {
      if (
        body[campo] === undefined ||
        body[campo] === null ||
        body[campo] === ""
      ) {
        response.status = 400;
        response.body = {
          success: false,
          message: `El campo ${campo} es obligatorio`,
        };
        return;
      }
    }

    const [cliente] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE id_usuario = ?
         AND activo = 1`,
      [idUsuario],
    );

    if (!cliente) {
      response.status = 404;
      response.body = {
        success: false,
        message: "Perfil de cliente no encontrado",
      };
      return;
    }

    const idCliente = Number(cliente.id_cliente);
    const idVehiculo = Number(body.id_vehiculo);
    const fechaCita = String(body.fecha_cita);
    const horaCita = String(body.hora_cita);
    const servicio = String(body.servicio).trim();
    const observaciones = body.observaciones
      ? String(body.observaciones).trim()
      : null;

    const [vehiculo] = await conexion.query(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?
         AND activo = 1`,
      [idVehiculo, idCliente],
    );

    if (!vehiculo) {
      response.status = 400;
      response.body = {
        success: false,
        message: "El vehículo no pertenece a tu cuenta",
      };
      return;
    }

    const fechaHora = new Date(
      `${fechaCita}T${horaCita}`,
    );

    if (Number.isNaN(fechaHora.getTime())) {
      response.status = 400;
      response.body = {
        success: false,
        message: "La fecha o la hora no son válidas",
      };
      return;
    }

    if (fechaHora.getTime() < Date.now()) {
      response.status = 400;
      response.body = {
        success: false,
        message: "La cita debe ser futura",
      };
      return;
    }

    const [citaExistente] = await conexion.query(
      `SELECT id_cita
       FROM citas
       WHERE fecha_cita = ?
         AND hora_cita = ?
         AND estado NOT IN ('Cancelada', 'Rechazada')`,
      [fechaCita, horaCita],
    );

    if (citaExistente) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Ese horario ya está ocupado",
      };
      return;
    }

    const resultado = await conexion.execute(
      `INSERT INTO citas (
         id_cliente,
         id_vehiculo,
         fecha_cita,
         hora_cita,
         servicio,
         observaciones,
         estado
       )
       VALUES (?, ?, ?, ?, ?, ?, 'Pendiente')`,
      [
        idCliente,
        idVehiculo,
        fechaCita,
        horaCita,
        servicio,
        observaciones,
      ],
    );

    response.status = 201;
    response.body = {
      success: true,
      message: "Cita solicitada correctamente",
      data: {
        id_cita: resultado.lastInsertId,
      },
    };
  } catch (error) {
    console.error("[POST CITA] Error real:", error);

    response.status = 500;
    response.body = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo solicitar la cita",
    };
  }
};