-- Quita solo la relación cita-orden agregada para esta función.
-- No elimina ni citas ni órdenes. Ejecutar una sola vez.
ALTER TABLE `ordenestrabajo`
  DROP FOREIGN KEY `FK_Ordenes_Cita`,
  DROP INDEX `UQ_Ordenes_Cita`,
  DROP COLUMN `id_cita`;
