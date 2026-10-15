-- Relaciona cada orden de trabajo con la cita que la originó.
-- Ejecutar una sola vez en la base de datos optimusbyte.
USE `optimusbyte`;

ALTER TABLE `ordenestrabajo`
  ADD COLUMN `id_cita` int(11) DEFAULT NULL,
  ADD UNIQUE KEY `UQ_Ordenes_Cita` (`id_cita`),
  ADD CONSTRAINT `FK_Ordenes_Cita`
    FOREIGN KEY (`id_cita`) REFERENCES `citas` (`id_cita`)
    ON DELETE SET NULL;
