import { defineMiddleware } from "astro:middleware";
import { isAuthenticatedSSR, getRolSSR } from "./utils/auth";

const RUTAS_MECANICO = ["/mecanico"];
const RUTAS_ADMIN = ["/admin"];
const RUTAS_CLIENTE = ["/cliente"];

function perteneceARuta(path: string, rutas: string[]) {
  return rutas.some(
    (ruta) => path === ruta || path.startsWith(`${ruta}/`),
  );
}

export const onRequest = defineMiddleware(
  ({ url, cookies, redirect }, next) => {
    const path = url.pathname;

    // No proteger rutas API ni archivos internos de Astro.
    if (
      path.startsWith("/api") ||
      path.startsWith("/_astro") ||
      path.startsWith("/favicon")
    ) {
      return next();
    }

    const autenticado = isAuthenticatedSSR(cookies);

    const esRutaCliente = perteneceARuta(path, RUTAS_CLIENTE);
    const esRutaMecanico = perteneceARuta(path, RUTAS_MECANICO);
    const esRutaAdmin = perteneceARuta(path, RUTAS_ADMIN);

    if (!esRutaCliente && !esRutaMecanico && !esRutaAdmin) {
      return next();
    }

    if (!autenticado) {
      return redirect("/login");
    }

    const rol = getRolSSR(cookies);

    if (esRutaCliente && rol !== "Cliente") {
      return redirect("/login");
    }

    if (
      esRutaMecanico &&
      rol !== "Mecanico" &&
      rol !== "Admin"
    ) {
      return redirect("/login");
    }

    if (esRutaAdmin && rol !== "Admin") {
      return redirect("/login");
    }

    return next();
  },
);