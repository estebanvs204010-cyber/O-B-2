import { Context } from "../Dependencies/dependencias.ts";
import { esCarpetaValida, firmarSubida } from "../Helpers/cloudinary.ts";

export const GetFirmaSubida = async (ctx: Context) => {
  try {
    const tipo = ctx.request.url.searchParams.get("tipo") ?? "";
    const usuario = ctx.state.user as { rol?: string } | undefined;

    if (!esCarpetaValida(tipo)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Tipo de imagen inválido" };
      return;
    }
    if (usuario?.rol === "Cliente" && tipo !== "solicitudes") {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "No tienes permiso para subir imágenes a esta carpeta" };
      return;
    }

    const firma = await firmarSubida(tipo);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: firma };
  } catch (error) {
    console.error("Error firmando subida:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "No se pudo generar la firma" };
  }
};