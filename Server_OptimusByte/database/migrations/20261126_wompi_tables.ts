import { conexion } from "../../Model/conexion.ts";

async function runMigration() {
  console.log("Iniciando migración de tablas para Wompi...");

  try {
    // 1. Agregar stock_reservado a repuestos si no existe
    const [colStockReservado] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repuestos' AND COLUMN_NAME = 'stock_reservado'`
    );
    if (!colStockReservado) {
      console.log("-> Agregando columna stock_reservado a repuestos...");
      await conexion.execute(
        `ALTER TABLE repuestos ADD COLUMN stock_reservado INT NOT NULL DEFAULT 0 AFTER stock_actual`
      );
    } else {
      console.log("-> Columna stock_reservado ya existe en repuestos.");
    }

    // 2. Modificar facturas para permitir compras directas / Wompi
    // Permitir id_orden NULL y id_administrador NULL
    console.log("-> Adaptando tabla facturas...");
    try {
      await conexion.execute(`ALTER TABLE facturas DROP FOREIGN KEY FK_Facturas_Orden`);
    } catch (_) {
      // Ignorar si no existe
    }
    try {
      await conexion.execute(`ALTER TABLE facturas DROP INDEX id_orden`);
    } catch (_) {
      // Ignorar si no existe
    }

    await conexion.execute(
      `ALTER TABLE facturas 
       MODIFY COLUMN id_orden INT(11) NULL,
       MODIFY COLUMN id_administrador INT(11) NULL`
    );

    // Agregar FK_Facturas_Orden de nuevo como nullable
    try {
      await conexion.execute(
        `ALTER TABLE facturas 
         ADD CONSTRAINT FK_Facturas_Orden FOREIGN KEY (id_orden) REFERENCES ordenestrabajo (id_orden) ON DELETE SET NULL`
      );
    } catch (e) {
      console.log("FK_Facturas_Orden:", e instanceof Error ? e.message : e);
    }

    // Agregar id_cliente a facturas si no existe
    const [colIdCliente] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas' AND COLUMN_NAME = 'id_cliente'`
    );
    if (!colIdCliente) {
      await conexion.execute(
        `ALTER TABLE facturas ADD COLUMN id_cliente INT(11) NULL AFTER id_orden`
      );
      try {
        await conexion.execute(
          `ALTER TABLE facturas ADD CONSTRAINT fk_facturas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL`
        );
      } catch (_) {}
    }

    // Agregar referencia a facturas si no existe
    const [colReferencia] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas' AND COLUMN_NAME = 'referencia'`
    );
    if (!colReferencia) {
      await conexion.execute(
        `ALTER TABLE facturas ADD COLUMN referencia VARCHAR(100) NULL UNIQUE AFTER id_cliente`
      );
    }

    // Agregar moneda y estado a facturas si no existen
    const [colMoneda] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas' AND COLUMN_NAME = 'moneda'`
    );
    if (!colMoneda) {
      await conexion.execute(
        `ALTER TABLE facturas ADD COLUMN moneda VARCHAR(5) NOT NULL DEFAULT 'COP' AFTER total`
      );
    }

    const [colEstado] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas' AND COLUMN_NAME = 'estado'`
    );
    if (!colEstado) {
      await conexion.execute(
        `ALTER TABLE facturas ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' AFTER moneda`
      );
    }

    const [colIdTxWompi] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas' AND COLUMN_NAME = 'id_transaccion_wompi'`
    );
    if (!colIdTxWompi) {
      await conexion.execute(
        `ALTER TABLE facturas ADD COLUMN id_transaccion_wompi VARCHAR(100) NULL AFTER metodo_pago`
      );
    }

    const [colFechaAct] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas' AND COLUMN_NAME = 'fecha_actualizacion'`
    );
    if (!colFechaAct) {
      await conexion.execute(
        `ALTER TABLE facturas ADD COLUMN fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
      );
    }

    // 3. Crear factura_detalles si no existe
    console.log("-> Creando tabla factura_detalles...");
    await conexion.execute(`
      CREATE TABLE IF NOT EXISTS factura_detalles (
        id_detalle INT NOT NULL AUTO_INCREMENT,
        id_factura INT NOT NULL,
        id_repuesto INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(14,2) NOT NULL,
        subtotal DECIMAL(14,2) NOT NULL,
        PRIMARY KEY (id_detalle),
        KEY fk_factura_detalles_factura (id_factura),
        KEY fk_factura_detalles_repuesto (id_repuesto),
        CONSTRAINT fk_factura_detalles_factura FOREIGN KEY (id_factura) REFERENCES facturas (id_factura) ON DELETE CASCADE,
        CONSTRAINT fk_factura_detalles_repuesto FOREIGN KEY (id_repuesto) REFERENCES repuestos (id_repuesto) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 4. Crear reservas_inventario si no existe
    console.log("-> Creando tabla reservas_inventario...");
    await conexion.execute(`
      CREATE TABLE IF NOT EXISTS reservas_inventario (
        id_reserva INT NOT NULL AUTO_INCREMENT,
        id_factura INT NOT NULL,
        id_repuesto INT NOT NULL,
        cantidad INT NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'RESERVADO',
        fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion DATETIME NULL,
        fecha_confirmacion DATETIME NULL,
        fecha_liberacion DATETIME NULL,
        PRIMARY KEY (id_reserva),
        KEY ix_reservas_factura (id_factura),
        KEY ix_reservas_repuesto (id_repuesto),
        KEY ix_reservas_estado (estado),
        CONSTRAINT fk_reservas_factura FOREIGN KEY (id_factura) REFERENCES facturas (id_factura) ON DELETE CASCADE,
        CONSTRAINT fk_reservas_repuesto FOREIGN KEY (id_repuesto) REFERENCES repuestos (id_repuesto) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 5. Adaptar pagos con columnas adicionales
    console.log("-> Adaptando tabla pagos...");
    const [colPagosIdTx] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos' AND COLUMN_NAME = 'id_transaccion_wompi'`
    );
    if (!colPagosIdTx) {
      await conexion.execute(
        `ALTER TABLE pagos ADD COLUMN id_transaccion_wompi VARCHAR(100) NULL AFTER referencia_transaccion`
      );
    }

    const [colPagosEstado] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos' AND COLUMN_NAME = 'estado'`
    );
    if (!colPagosEstado) {
      await conexion.execute(
        `ALTER TABLE pagos ADD COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'PENDING' AFTER id_transaccion_wompi`
      );
    }

    const [colPagosMoneda] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos' AND COLUMN_NAME = 'moneda'`
    );
    if (!colPagosMoneda) {
      await conexion.execute(
        `ALTER TABLE pagos ADD COLUMN moneda VARCHAR(5) NOT NULL DEFAULT 'COP' AFTER estado`
      );
    }

    const [colPagosRespuesta] = await conexion.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos' AND COLUMN_NAME = 'respuesta_wompi'`
    );
    if (!colPagosRespuesta) {
      await conexion.execute(
        `ALTER TABLE pagos ADD COLUMN respuesta_wompi TEXT NULL AFTER observaciones`
      );
    }

    // 6. Crear eventos_wompi si no existe
    console.log("-> Creando tabla eventos_wompi...");
    await conexion.execute(`
      CREATE TABLE IF NOT EXISTS eventos_wompi (
        id_evento_registro INT NOT NULL AUTO_INCREMENT,
        id_evento VARCHAR(100) NOT NULL,
        referencia VARCHAR(100) NOT NULL,
        tipo_evento VARCHAR(50) NOT NULL,
        estado_transaccion VARCHAR(30) NOT NULL,
        monto_en_centavos BIGINT NOT NULL,
        moneda VARCHAR(5) NOT NULL DEFAULT 'COP',
        checksum VARCHAR(128) NOT NULL,
        environment VARCHAR(20) NOT NULL DEFAULT 'test',
        payload LONGTEXT NOT NULL,
        procesado TINYINT(1) NOT NULL DEFAULT 1,
        fecha_evento DATETIME NULL,
        fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_evento_registro),
        UNIQUE KEY uq_evento_wompi_id (id_evento),
        KEY ix_evento_wompi_ref (referencia),
        KEY ix_evento_wompi_estado (estado_transaccion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log("¡Migración completada exitosamente!");
  } catch (error) {
    console.error("Error durante la migración:", error);
  } finally {
    await conexion.close();
  }
}

await runMigration();
