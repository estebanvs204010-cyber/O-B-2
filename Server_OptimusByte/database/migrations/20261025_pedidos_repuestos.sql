USE `optimusbyte`;

CREATE TABLE IF NOT EXISTS `pedidosrepuesto` (
  `id_pedido` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `estado` varchar(30) NOT NULL DEFAULT 'Pendiente',
  `metodo_pago` varchar(40) NOT NULL,
  `observaciones` varchar(300) DEFAULT NULL,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `fecha_pedido` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pedido`),
  KEY `IDX_PedidosRepuesto_Cliente_Fecha` (`id_cliente`, `fecha_pedido`),
  CONSTRAINT `FK_PedidosRepuesto_Cliente`
    FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pedidodetalle` (
  `id_detalle` int(11) NOT NULL AUTO_INCREMENT,
  `id_pedido` int(11) NOT NULL,
  `id_repuesto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_detalle`),
  UNIQUE KEY `UQ_PedidoDetalle_Pedido_Repuesto` (`id_pedido`, `id_repuesto`),
  KEY `IDX_PedidoDetalle_Repuesto` (`id_repuesto`),
  CONSTRAINT `FK_PedidoDetalle_Pedido`
    FOREIGN KEY (`id_pedido`) REFERENCES `pedidosrepuesto` (`id_pedido`)
    ON DELETE RESTRICT,
  CONSTRAINT `FK_PedidoDetalle_Repuesto`
    FOREIGN KEY (`id_repuesto`) REFERENCES `repuestos` (`id_repuesto`)
    ON DELETE RESTRICT,
  CONSTRAINT `CHK_PedidoDetalle_Cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
