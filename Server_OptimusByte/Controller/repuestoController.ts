import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { DatosRepuesto, Repuesto } from "../Model/repuestoModel.ts";

function validarDatos(body: Record<string, unknown>): string | null {
    if (typeof body.referencia !== "string" || !body.referencia.trim()) {
        return "La referencia del repuesto es obligatoria";
    }
    if (body.referencia.trim().length > 50) {
        return "La referencia no puede superar 50 caracteres";
    }
    if (typeof body.nombre !== "string" || !body.nombre.trim()) {
        return "El nombre del repuesto es obligatorio";
    }
    if (body.nombre.trim().length > 100) {
        return "El nombre no puede superar 100 caracteres";
    }
    if (body.categoria !== undefined && typeof body.categoria !== "string") {
        return "La categoría debe ser texto";
    }
    if (typeof body.categoria === "string" && body.categoria.trim().length > 50) {
        return "La categoría no puede superar 50 caracteres";
    }
    if (body.descripcion !== undefined && body.descripcion !== null && typeof body.descripcion !== "string") {
        return "La descripción debe ser texto";
    }
    if (typeof body.descripcion === "string" && body.descripcion.length > 300) {
        return "La descripción no puede superar 300 caracteres";
    }
    if (typeof body.marca !== "string" || !body.marca.trim() || body.marca.trim().length > 50) {
        return "La marca es obligatoria y no puede superar 50 caracteres";
    }
    if (body.modelo !== undefined && body.modelo !== null && typeof body.modelo !== "string") {
        return "El modelo debe ser texto";
    }
    if (typeof body.modelo === "string" && body.modelo.trim().length > 50) {
        return "El modelo no puede superar 50 caracteres";
    }
    if (
        body.imagen_url !== undefined &&
        body.imagen_url !== null &&
        typeof body.imagen_url !== "string"
    ) {
        return "La imagen del repuesto no es válida";
    }
    if (typeof body.imagen_url === "string") {
        const esImagenPredeterminada =
            /^\/images\/repuestos\/(frenos|filtros|motor|electrico|suspension|fluidos|general)\.svg$/.test(
                body.imagen_url,
            );
        const esImagenCloudinary =
            /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/[A-Za-z0-9_./-]+$/.test(
                body.imagen_url,
            );
        if (
            body.imagen_url.length > 300 ||
            (!esImagenPredeterminada && !esImagenCloudinary)
        ) {
            return "La imagen debe ser una imagen predeterminada o una URL de Cloudinary válida";
        }
    }
    if (
        typeof body.precio_unitario !== "number" ||
        !Number.isFinite(body.precio_unitario) ||
        body.precio_unitario < 0
    ) {
        return "El precio debe ser un número igual o mayor que cero";
    }
    if (!Number.isInteger(body.stock_actual) || Number(body.stock_actual) < 0) {
        return "El stock debe ser un entero igual o mayor que cero";
    }
    if (!Number.isInteger(body.stock_minimo) || Number(body.stock_minimo) < 0) {
        return "El stock mínimo debe ser un entero igual o mayor que cero";
    }
    return null;
}

function esObjetoJson(body: unknown): body is Record<string, unknown> {
    return typeof body === "object" && body !== null && !Array.isArray(body);
}

function normalizarDatos(body: Record<string, unknown>): DatosRepuesto {
    return {
        referencia: String(body.referencia).trim(),
        nombre: String(body.nombre).trim(),
        descripcion: typeof body.descripcion === "string" ? body.descripcion.trim() || null : null,
        categoria: typeof body.categoria === "string" ? body.categoria.trim() || "General" : "General",
        precio_unitario: Number(body.precio_unitario),
        stock_actual: Number(body.stock_actual),
        stock_minimo: Number(body.stock_minimo),
        marca: String(body.marca).trim(),
        modelo: typeof body.modelo === "string" ? body.modelo.trim() || null : null,
        ...(typeof body.imagen_url === "string" || body.imagen_url === null
            ? { imagen_url: body.imagen_url }
            : {}),
    };
}

export const GetRepuestos = async (ctx: Context) => {
    try {
        const incluirInactivos = ctx.request.url.searchParams.get("incluir_inactivos") === "true";
        const data = await new Repuesto().Listar(incluirInactivos);
        ctx.response.status = 200;
        ctx.response.body = { success: true, data };
    } catch (error) {
        console.error("Error listando repuestos:", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "No se pudieron cargar los repuestos" };
    }
};

export const GetRepuestoPorId = async (ctx: RouterContext<"/api/admin/repuestos/:id">) => {
    try {
        const id = Number(ctx.params.id);
        if (!Number.isInteger(id) || id < 1) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El identificador no es válido" };
            return;
        }

        const data = await new Repuesto().ObtenerPorId(id);
        if (!data) {
            ctx.response.status = 404;
            ctx.response.body = { success: false, message: "El repuesto no existe" };
            return;
        }
        ctx.response.status = 200;
        ctx.response.body = { success: true, data };
    } catch (error) {
        console.error("Error consultando repuesto:", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "No se pudo consultar el repuesto" };
    }
};

export const PostCrearRepuesto = async (ctx: Context) => {
    try {
        const body: unknown = await ctx.request.body.json();
        if (!esObjetoJson(body)) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El cuerpo de la solicitud no es válido" };
            return;
        }
        const errorValidacion = validarDatos(body);
        if (errorValidacion) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: errorValidacion };
            return;
        }

        const resultado = await new Repuesto().Crear(normalizarDatos(body));
        ctx.response.status = resultado.success ? 201 : 409;
        ctx.response.body = resultado;
    } catch (error) {
        console.error("Error creando repuesto:", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "No se pudo crear el repuesto" };
    }
};

export const PutEditarRepuesto = async (ctx: RouterContext<"/api/admin/repuestos/:id">) => {
    try {
        const id = Number(ctx.params.id);
        if (!Number.isInteger(id) || id < 1) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El identificador no es válido" };
            return;
        }
        const body: unknown = await ctx.request.body.json();
        if (!esObjetoJson(body)) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El cuerpo de la solicitud no es válido" };
            return;
        }
        const errorValidacion = validarDatos(body);
        if (errorValidacion) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: errorValidacion };
            return;
        }

        const resultado = await new Repuesto().Editar(id, normalizarDatos(body));
        ctx.response.status = resultado.success
            ? 200
            : resultado.message === "El repuesto no existe"
              ? 404
              : 409;
        ctx.response.body = resultado;
    } catch (error) {
        console.error("Error editando repuesto:", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "No se pudo actualizar el repuesto" };
    }
};

export const PutEstadoRepuesto = async (
    ctx: RouterContext<"/api/admin/repuestos/:id/estado">,
) => {
    try {
        const id = Number(ctx.params.id);
        if (!Number.isInteger(id) || id < 1) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El identificador no es válido" };
            return;
        }
        const body: unknown = await ctx.request.body.json();
        if (!esObjetoJson(body)) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El cuerpo de la solicitud no es válido" };
            return;
        }
        if (typeof body.activo !== "boolean") {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "El campo activo debe ser booleano" };
            return;
        }

        const resultado = await new Repuesto().CambiarEstado(id, body.activo);
        ctx.response.status = resultado.success
            ? 200
            : resultado.message === "El repuesto no existe"
              ? 404
              : 409;
        ctx.response.body = resultado;
    } catch (error) {
        console.error("Error cambiando estado del repuesto:", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "No se pudo cambiar el estado del repuesto" };
    }
};

const IMAGENES_PREDETERMINADAS: Record<string, { categoria: string; imagen: string }> = {
    frenos: { categoria: "Frenos", imagen: "/images/repuestos/frenos.svg" },
    filtros: { categoria: "Filtros", imagen: "/images/repuestos/filtros.svg" },
    motor: { categoria: "Motor", imagen: "/images/repuestos/motor.svg" },
    electrico: { categoria: "Eléctrico", imagen: "/images/repuestos/electrico.svg" },
    suspension: { categoria: "Suspensión", imagen: "/images/repuestos/suspension.svg" },
    fluidos: { categoria: "Fluidos", imagen: "/images/repuestos/fluidos.svg" },
    general: { categoria: "General", imagen: "/images/repuestos/general.svg" },
};

function normalizarCategoria(categoria: string): string {
    return categoria
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("es");
}

export const PutImagenPredeterminadaCategoria = async (ctx: Context) => {
    try {
        const body: unknown = await ctx.request.body.json();
        if (
            !esObjetoJson(body) ||
            typeof body.categoria !== "string" ||
            !body.categoria.trim()
        ) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "Selecciona una categoría válida" };
            return;
        }

        const categoria = body.categoria.trim();
        const existeCategoria = await new Repuesto().ExisteCategoria(categoria);
        if (!existeCategoria) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "La categoría no existe en el inventario" };
            return;
        }

        const preset = IMAGENES_PREDETERMINADAS[normalizarCategoria(categoria)];
        const imagenUrl = body.imagen_url;
        const imagenFinal = typeof imagenUrl === "string"
            ? imagenUrl
            : preset?.imagen;
        const esImagenPredeterminada =
            typeof imagenFinal === "string" &&
            /^\/images\/repuestos\/(frenos|filtros|motor|electrico|suspension|fluidos|general)\.svg$/.test(
                imagenFinal,
            );
        const esImagenCloudinary =
            typeof imagenFinal === "string" &&
            /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/[A-Za-z0-9_./-]+$/.test(
                imagenFinal,
            );
        if (
            !imagenFinal ||
            imagenFinal.length > 300 ||
            (!esImagenPredeterminada && !esImagenCloudinary)
        ) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: "Selecciona una imagen predeterminada o sube una imagen válida",
            };
            return;
        }

        const resultado = await new Repuesto().CambiarImagenCategoria(categoria, imagenFinal);
        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: `Imagen aplicada a todos los repuestos de ${categoria}`,
            data: { categoria, actualizados: resultado.affectedRows },
        };
    } catch (error) {
        console.error("Error actualizando imagen predeterminada por categoría:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "No se pudo actualizar la imagen de la categoría",
        };
    }
};
