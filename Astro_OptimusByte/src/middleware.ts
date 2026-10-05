import { defineMiddleware } from "astro:middleware";
import { isAuthenticatedSSR, getRolSSR } from "./utils/auth";

const RutasMecanico: string[] = ["/mecanico"];
const RutasSoloAdmin: string[] = ["/admin"];
const RutasSoloCliente: string[] = ["/cliente"];

export const onRequest = defineMiddleware(({ url, cookies, redirect }, next) => {
  const path = url.pathname;

  // No interceptar rutas API ni recursos internos de Astro.
  if (path.startsWith("/api") || path.startsWith("/_astro")) {
    return next();
  }

  const esAutenticado = isAuthenticatedSSR(cookies);

  const esRutaMecanico = RutasMecanico.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  );

  const esRutaSoloAdmin = RutasSoloAdmin.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  );

  const esRutaCliente = RutasSoloCliente.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  );

  if (esRutaCliente) {
    if (!esAutenticado) return redirect("/login");

    const rol = getRolSSR(cookies);

    if (rol !== "Cliente") {
      return redirect("/login");
    }
  }

  if (esRutaMecanico) {
    if (!esAutenticado) return redirect("/login");

    const rol = getRolSSR(cookies);

    if (rol !== "Mecanico" && rol !== "Admin") {
      return redirect("/login");
    }
  }

  if (esRutaSoloAdmin) {
    if (!esAutenticado) return redirect("/login");

    const rol = getRolSSR(cookies);

    if (rol !== "Admin") {
      return redirect("/login");
    }
  }

  return next();
});