import { conexion } from "./Model/conexion.ts";

const tablas = await conexion.query(
  `SELECT TABLE_NAME
   FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
   ORDER BY TABLE_NAME`,
);
const columnas = await conexion.query(
  `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME IN (
       'clientes', 'repuestos', 'movimientosinventario', 'notificaciones',
       'pedidosrepuesto', 'pedidodetalle', 'solicitudesrepuestoscliente',
       'ordenestrabajo', 'usuarios'
     )
   ORDER BY TABLE_NAME, ORDINAL_POSITION`,
);

console.log(JSON.stringify({
  tablas: tablas.map((fila: { TABLE_NAME: string }) => fila.TABLE_NAME),
  columnas,
}, null, 2));
