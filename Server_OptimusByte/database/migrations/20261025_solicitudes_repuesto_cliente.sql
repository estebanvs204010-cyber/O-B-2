USE `optimusbyte`;

CREATE TABLE IF NOT EXISTS `solicitudesrepuestoscliente` (
  `id_solicitud_cliente` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `nombre_repuesto` varchar(160) NOT NULL,
  `referencia` varchar(120) DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `descripcion` varchar(1000) DEFAULT NULL,
  `imagen_url` varchar(600) DEFAULT NULL,
  `estado` varchar(30) NOT NULL DEFAULT 'Pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_solicitud_cliente`),
  KEY `IDX_SolicitudRepuestoCliente_Estado_Fecha` (`estado`, `fecha_solicitud`),
  KEY `IDX_SolicitudRepuestoCliente_Cliente_Fecha` (`id_cliente`, `fecha_solicitud`),
  CONSTRAINT `FK_SolicitudRepuestoCliente_Cliente`
    FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`)
    ON DELETE RESTRICT,
  CONSTRAINT `CHK_SolicitudRepuestoCliente_Cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
