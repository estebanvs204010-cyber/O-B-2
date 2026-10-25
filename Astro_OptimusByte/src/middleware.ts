import { defineMiddleware } from "astro:middleware";
import { getTokenSRR } from "./utils/auth";

const RUTAS_PROTEGIDAS = [
  "/cliente",
  "/mecanico",
  "/admin",
];

export const onRequest = defineMiddleware(
  ({ url, cookies, redirect }, next) => {
    const path = url.pathname;

    if (
      path.startsWith("/api") ||
      path.startsWith("/_astro") ||
      path.startsWith("/favicon")
    ) {
      return next();
    }

    const rutaProtegida = RUTAS_PROTEGIDAS.some(
      (ruta) =>
        path === ruta ||
        path.startsWith(`${ruta}/`),
    );

    if (!rutaProtegida) {
      return next();
    }

    const token = getTokenSRR(cookies);

    if (!token) {
      return redirect("/login");
    }

    return next();
  },
);