import { defineMiddleware } from "astro:middleware";
import { isAuthenticatedSSR, getRolSSR } from "./utils/auth";

const RUTAS_MECANICO = ["/mecanico"];
const RUTAS_SOLO_ADMIN = ["/admin"];
const RUTAS_SOLO_CLIENTE = ["/cliente"];

export const onRequest = defineMiddleware(
  ({ url, cookies, redirect }, next) => {
    const path = url.pathname;

    // No proteger APIs ni archivos internos de Astro.
    if (
      path.startsWith("/api") ||
      path.startsWith("/_astro") ||
      path.startsWith("/favicon")
    ) {
      return next();
    }

    const esRutaMecanico = RUTAS_MECANICO.some(
      (ruta) => path === ruta || path.startsWith(`${ruta}/`),
    );

    const esRutaSoloAdmin = RUTAS_SOLO_ADMIN.some(
      (ruta) => path === ruta || path.startsWith(`${ruta}/`),
    );

    const esRutaSoloCliente = RUTAS_SOLO_CLIENTE.some(
      (ruta) => path === ruta || path.startsWith(`${ruta}/`),
    );

    const esAutenticado = isAuthenticatedSSR(cookies);

    /*
     * Cliente:
     * Solo comprobamos que exista una cookie de sesión.
     * La validación real del rol la hace el backend con:
     * permitirRoles("Cliente")
     */
    if (esRutaSoloCliente) {
      if (!esAutenticado) {
        return redirect("/login");
      }

      return next();
    }

    if (esRutaMecanico) {
      if (!esAutenticado) {
        return redirect("/login");
      }

      const rol = String(getRolSSR(cookies) ?? "")
        .trim()
        .toLowerCase();

      if (rol !== "mecanico" && rol !== "admin") {
        return redirect("/login");
      }
    }

    if (esRutaSoloAdmin) {
      if (!esAutenticado) {
        return redirect("/login");
      }

      const rol = String(getRolSSR(cookies) ?? "")
        .trim()
        .toLowerCase();

      if (rol !== "admin") {
        return redirect("/login");
      }
    }

    return next();
  },
);