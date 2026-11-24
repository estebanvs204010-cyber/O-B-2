-- Migración para soporte de Pedidos de Repuestos, Compras en Línea y Transacciones Wompi
USE `optimusbyte`;

-- 1. Tabla de pedidos de repuestos (compras en línea o en taller)
CREATE TABLE IF NOT EXISTS `pedidosrepuesto` (
  `id_pedido` int(11) NOT NULL AUTO_INCREMENT,
  `id_cliente` int(11) NOT NULL,
  `estado` varchar(30) NOT NULL DEFAULT 'Pendiente',
  `metodo_pago` varchar(40) NOT NULL DEFAULT 'Wompi',
  `referencia_pago` varchar(100) DEFAULT NULL,
  `id_transaccion_wompi` varchar(100) DEFAULT NULL,
  `estado_transaccion` varchar(30) DEFAULT 'PENDING',
  `observaciones` varchar(300) DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `fecha_pedido` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pedido`),
  UNIQUE KEY `UQ_PedidosRepuesto_Referencia` (`referencia_pago`),
  KEY `IDX_PedidosRepuesto_Cliente_Fecha` (`id_cliente`, `fecha_pedido`),
  CONSTRAINT `FK_PedidosRepuesto_Cliente`
    FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE `pedidosrepuesto` 
  ADD COLUMN IF NOT EXISTS `referencia_pago` varchar(100) DEFAULT NULL AFTER `metodo_pago`,
  ADD COLUMN IF NOT EXISTS `id_transaccion_wompi` varchar(100) DEFAULT NULL AFTER `referencia_pago`,
  ADD COLUMN IF NOT EXISTS `estado_transaccion` varchar(30) DEFAULT 'PENDING' AFTER `id_transaccion_wompi`,
  ADD COLUMN IF NOT EXISTS `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `observaciones`;

-- 2. Tabla detalle de cada pedido (repuestos comprados)
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
    ON DELETE CASCADE,
  CONSTRAINT `FK_PedidoDetalle_Repuesto`
    FOREIGN KEY (`id_repuesto`) REFERENCES `repuestos` (`id_repuesto`)
    ON DELETE RESTRICT,
  CONSTRAINT `CHK_PedidoDetalle_Cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabla de transacciones Wompi para auditoría y verificación
CREATE TABLE IF NOT EXISTS `transacciones_wompi` (
  `id_transaccion_registro` int(11) NOT NULL AUTO_INCREMENT,
  `id_pedido` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `referencia` varchar(100) NOT NULL,
  `id_transaccion_wompi` varchar(100) DEFAULT NULL,
  `monto_en_centavos` bigint(20) NOT NULL,
  `moneda` varchar(5) NOT NULL DEFAULT 'COP',
  `estado` varchar(30) NOT NULL DEFAULT 'PENDING',
  `metodo_pago_tipo` varchar(50) DEFAULT NULL,
  `firma_integridad` varchar(128) NOT NULL,
  `respuesta_wompi` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_transaccion_registro`),
  UNIQUE KEY `UQ_Transacciones_Referencia` (`referencia`),
  KEY `IDX_Transacciones_Pedido` (`id_pedido`),
  KEY `IDX_Transacciones_Cliente` (`id_cliente`),
  CONSTRAINT `FK_Transacciones_Pedido`
    FOREIGN KEY (`id_pedido`) REFERENCES `pedidosrepuesto` (`id_pedido`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_Transacciones_Cliente`
    FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabla de solicitudes especiales de repuestos de clientes
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
