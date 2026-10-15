import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { MecanicoPanel } from "../Model/mecanicoPanelModel.ts";
import { conexion } from "../Model/conexion.ts";

const idUsuario = (ctx: Context) =>
  Number((ctx.state.user as { sub: string }).sub);

export const GetDashboardMecanico = async (ctx: Context) => {
  try {
    const data = await new MecanicoPanel().Dashboard(idUsuario(ctx));
    ctx.response.status = 200;
    ctx.response.body = { success: true, data };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo cargar el resumen del mecánico",
    };
  }
};

export const GetPerfilMecanico = async (ctx: Context) => {
  try {
    const data = await new MecanicoPanel().Perfil(idUsuario(ctx));
    ctx.response.status = data ? 200 : 404;
    ctx.response.body = data
      ? { success: true, data }
      : { success: false, message: "Usuario no encontrado" };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo cargar el perfil",
    };
  }
};

export const GetRepuestosDisponibles = async (ctx: Context) => {
  try {
    const data = await new MecanicoPanel().RepuestosDisponibles();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo cargar el inventario",
    };
  }
};

export const GetHistorialOrden = async (
  ctx: RouterContext<"/api/mecanico/ordenes/:id/historial">,
) => {
  try {
    const user = ctx.state.user as { sub: string; rol: string };
    const [orden] = await conexion.query(
      `SELECT id_orden, id_mecanico FROM ordenestrabajo WHERE id_orden = ?`,
      [Number(ctx.params.id)],
    );
    if (!orden) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Orden no encontrada" };
      return;
    }
    if (
      user.rol === "Mecanico" && Number(orden.id_mecanico) !== Number(user.sub)
    ) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "Esta orden no está asignada a este mecánico",
      };
      return;
    }
    const data = await new MecanicoPanel().HistorialOrden(
      Number(ctx.params.id),
    );
    ctx.response.status = 200;
    ctx.response.body = { success: true, data };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo cargar el historial",
    };
  }
};

export const PutInformeOrden = async (
  ctx: RouterContext<"/api/mecanico/ordenes/:id/informe">,
) => {
  try {
    const body = await ctx.request.body.json();
    if (
      !body || typeof body !== "object" || Array.isArray(body) ||
      !("diagnostico" in body) || !("trabajo_realizado" in body)
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message:
          "Envía diagnostico y trabajo_realizado; usa null para limpiar un campo",
      };
      return;
    }
    for (const key of ["diagnostico", "trabajo_realizado"]) {
      if (
        body[key] !== undefined && body[key] !== null &&
        typeof body[key] !== "string"
      ) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: `El campo ${key} debe ser texto`,
        };
        return;
      }
    }
    const updated = await new MecanicoPanel().ActualizarInforme(
      Number(ctx.params.id),
      idUsuario(ctx),
      body.diagnostico ?? null,
      body.trabajo_realizado ?? null,
    );
    ctx.response.status = updated ? 200 : 404;
    ctx.response.body = updated
      ? { success: true, message: "Informe de trabajo actualizado" }
      : {
        success: false,
        message: "Orden no encontrada o no asignada a este mecánico",
      };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo actualizar el informe",
    };
  }
};

export const GetEvidenciasOrden = async (
  ctx: RouterContext<"/api/mecanico/ordenes/:id/evidencias">,
) => {
  try {
    const user = ctx.state.user as { sub: string; rol: string };
    const [orden] = await conexion.query(
      `SELECT id_orden, id_mecanico FROM ordenestrabajo WHERE id_orden = ?`,
      [Number(ctx.params.id)],
    );
    if (
      !orden ||
      (user.rol === "Mecanico" &&
        Number(orden.id_mecanico) !== Number(user.sub))
    ) {
      ctx.response.status = orden ? 403 : 404;
      ctx.response.body = {
        success: false,
        message: orden
          ? "Esta orden no está asignada a este mecánico"
          : "Orden no encontrada",
      };
      return;
    }
    const data = await new MecanicoPanel().ListarEvidencias(
      Number(ctx.params.id),
    );
    ctx.response.status = 200;
    ctx.response.body = { success: true, data };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudieron cargar las evidencias",
    };
  }
};

export const PostEvidenciaOrden = async (
  ctx: RouterContext<"/api/mecanico/ordenes/:id/evidencias">,
) => {
  try {
    const body = await ctx.request.body.json();
    if (
      typeof body.imagen_url !== "string" ||
      !/^https?:\/\//i.test(body.imagen_url.trim())
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "imagen_url debe ser una URL http o https válida",
      };
      return;
    }
    if (body.imagen_url.trim().length > 1000) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "La URL no puede superar 1000 caracteres",
      };
      return;
    }
    if (
      body.descripcion !== undefined && body.descripcion !== null &&
      typeof body.descripcion !== "string"
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "descripcion debe ser texto",
      };
      return;
    }
    if (typeof body.descripcion === "string" && body.descripcion.length > 300) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "descripcion no puede superar 300 caracteres",
      };
      return;
    }
    const created = await new MecanicoPanel().AgregarEvidencia(
      Number(ctx.params.id),
      idUsuario(ctx),
      body.imagen_url.trim(),
      body.descripcion ?? null,
    );
    ctx.response.status = created ? 201 : 404;
    ctx.response.body = created
      ? { success: true, message: "Evidencia registrada" }
      : {
        success: false,
        message: "Orden no encontrada o no asignada a este mecánico",
      };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo registrar la evidencia",
    };
  }
};

export const PostRepuestoUsado = async (
  ctx: RouterContext<"/api/mecanico/ordenes/:id/repuestos">,
) => {
  try {
    const body = await ctx.request.body.json();
    const id_repuesto = Number(body.id_repuesto);
    const cantidad = Number(body.cantidad);
    if (
      !Number.isInteger(id_repuesto) || id_repuesto < 1 ||
      !Number.isInteger(cantidad) || cantidad < 1
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "id_repuesto y cantidad deben ser enteros positivos",
      };
      return;
    }
    const resultado = await new MecanicoPanel().RegistrarRepuestoUsado(
      Number(ctx.params.id),
      idUsuario(ctx),
      id_repuesto,
      cantidad,
    );
    ctx.response.status = resultado.status;
    ctx.response.body = {
      success: resultado.success,
      message: resultado.message,
    };
  } catch (error) {
    console.error(error);
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "Solicitud inválida" };
  }
};
