import { conexion } from "../Model/conexion.ts";

// Servicio genérico de notificaciones in-app. No sabe nada de citas,
// órdenes ni de ningún módulo específico: solo crea, lista y marca
// como leídas filas de la tabla `notificaciones`. Cada módulo decide
// el "tipo" y el texto.

export interface Notificacion {
  id_notificacion: number;
  id_usuario: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad_tipo: string | null;
  entidad_id: number | null;
  leida: boolean;
  fecha_creacion: string;
}

export async function crearNotificacion(datos: {
  id_usuario: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad_tipo?: string;
  entidad_id?: number;
}): Promise<void> {
  await conexion.execute(
    `INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, entidad_tipo, entidad_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      datos.id_usuario,
      datos.tipo,
      datos.titulo,
      datos.mensaje,
      datos.entidad_tipo ?? null,
      datos.entidad_id ?? null,
    ],
  );
}

// Para avisos que le interesan a todo un rol (ej. "todos los Admin"),
// no a un usuario puntual: crea una notificación por cada usuario activo de ese rol.
export async function crearNotificacionParaRol(datos: {
  nombreRol: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad_tipo?: string;
  entidad_id?: number;
}): Promise<void> {
  const usuarios = await conexion.query(
    `SELECT u.id_usuario FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE r.nombre = ? AND u.activo = 1`,
    [datos.nombreRol],
  );

  for (const usuario of usuarios) {
    await crearNotificacion({ ...datos, id_usuario: usuario.id_usuario });
  }
}

export async function listarNotificaciones(id_usuario: number, soloNoLeidas = false): Promise<Notificacion[]> {
  const filtroLeida = soloNoLeidas ? "AND leida = 0" : "";
  return await conexion.query(
    `SELECT * FROM notificaciones
     WHERE id_usuario = ? ${filtroLeida}
     ORDER BY fecha_creacion DESC
     LIMIT 50`,
    [id_usuario],
  );
}

export async function contarNoLeidas(id_usuario: number): Promise<number> {
  const [fila] = await conexion.query(
    `SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario = ? AND leida = 0`,
    [id_usuario],
  );
  return Number(fila.total);
}

export async function marcarLeida(id_notificacion: number, id_usuario: number): Promise<void> {
  // el WHERE con id_usuario evita que alguien marque como leída una notificación ajena
  await conexion.execute(
    `UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?`,
    [id_notificacion, id_usuario],
  );
}

export async function marcarTodasLeidas(id_usuario: number): Promise<void> {
  await conexion.execute(
    `UPDATE notificaciones SET leida = 1 WHERE id_usuario = ? AND leida = 0`,
    [id_usuario],
  );
}
