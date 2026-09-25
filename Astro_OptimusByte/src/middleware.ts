import { defineMiddleware } from 'astro:middleware';
import { isAuthenticatedSSR, getRolSSR } from './utils/auth';

// Rutas del panel de Mecánico (también entra Admin, para poder supervisar)
const RutasMecanico: string[] = ['/mecanico'];

// Rutas del panel de Admin, cuando las construyamos: ['/admin']
const RutasSoloAdmin: string[] = ["/admin"];

export const onRequest = defineMiddleware(({ url, cookies, redirect }, next) => {
  const path = url.pathname;

  // Nunca interceptar llamadas a la API ni archivos internos de Astro
  if (path.startsWith('/api') || path.startsWith('/_astro')) {
    return next();
  }

  const esAutenticado = isAuthenticatedSSR(cookies);

  const esRutaMecanico = RutasMecanico.some((ruta) => path === ruta || path.startsWith(ruta + '/'));
  const esRutaSoloAdmin = RutasSoloAdmin.some((ruta) => path === ruta || path.startsWith(ruta + '/'));

  if (esRutaMecanico) {
    if (!esAutenticado) return redirect('/login');
    const rol = getRolSSR(cookies);
    if (rol !== 'Mecanico' && rol !== 'Admin') return redirect('/login');
  }

  if (esRutaSoloAdmin) {
    if (!esAutenticado) return redirect('/login');
    const rol = getRolSSR(cookies);
    if (rol !== 'Admin') return redirect('/login');
  }

  return next();
});