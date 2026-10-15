-- Extensión aditiva para el panel del mecánico.
-- Conserva íntegros los datos existentes; ejecutar una vez sobre optimusbyte.
ALTER TABLE ordenestrabajo
    ADD COLUMN IF NOT EXISTS trabajo_realizado TEXT NULL AFTER diagnostico;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS especialidad VARCHAR(100) NULL AFTER telefono;

CREATE TABLE IF NOT EXISTS evidenciasorden (
    id_evidencia INT NOT NULL AUTO_INCREMENT,
    id_orden INT NOT NULL,
    id_usuario INT NOT NULL,
    imagen_url VARCHAR(1000) NOT NULL,
    descripcion VARCHAR(300) NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_evidencia),
    KEY IX_Evidencias_Orden_Fecha (id_orden, fecha_registro),
    CONSTRAINT FK_Evidencias_Orden FOREIGN KEY (id_orden)
        REFERENCES ordenestrabajo (id_orden) ON DELETE CASCADE,
    CONSTRAINT FK_Evidencias_Usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
