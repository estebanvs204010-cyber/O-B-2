import { Context } from "../Dependencies/dependencias.ts";
import { esCarpetaValida, firmarSubida } from "../Helpers/cloudinary.ts";

export const GetFirmaSubida = async (ctx: Context) => {
  try {
    const tipo = ctx.request.url.searchParams.get("tipo") ?? "";

    if (!esCarpetaValida(tipo)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Tipo de imagen inválido" };
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