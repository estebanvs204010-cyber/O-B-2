import { database } from "./src/config/database.ts";
import {
  generarFirmaIntegridad,
  getWompiConfig,
  generarReferenciaUnica,
} from "./src/services/wompi.service.ts";

async function runEndToEndTests() {
  console.log("=== INICIANDO PRUEBAS DE INTEGRACIÓN DE WOMPI EN OPTIMUSBYTE ===");
  const baseUrl = "http://localhost:8002";
  const config = getWompiConfig();

  try {
    // 1. Obtener un repuesto con stock para pruebas
    const [repuesto] = await database.query(
      `SELECT id_repuesto, nombre, referencia, precio_unitario, stock_actual, stock_reservado
       FROM repuestos
       WHERE stock_actual > 2 AND activo = 1
       LIMIT 1`
    );

    if (!repuesto) {
      throw new Error("No hay repuestos activos con stock suficiente para la prueba.");
    }

    console.log(
      `✓ Repuesto para prueba: ${repuesto.nombre} (ID: ${repuesto.id_repuesto}, Stock actual: ${repuesto.stock_actual}, Reservado: ${repuesto.stock_reservado})`
    );

    // 2. Probar GET /api/payments/config
    console.log("\n[TEST 1] GET /api/payments/config");
    const resConfig = await fetch(`${baseUrl}/api/payments/config`);
    const jsonConfig = await resConfig.json();
    console.log("Status:", resConfig.status);
    console.log("Data:", jsonConfig);
    if (!jsonConfig.success || !jsonConfig.data?.publicKey) {
      throw new Error("Fallo en GET /api/payments/config");
    }
    console.log("✓ Test 1 superado.");

    // 3. Probar POST /api/payments/checkout
    console.log("\n[TEST 2] POST /api/payments/checkout (Crear factura y reservar inventario)");
    const cantidadCompra = 1;
    const resCheckout = await fetch(`${baseUrl}/api/payments/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id_repuesto: repuesto.id_repuesto, cantidad: cantidadCompra }],
        cliente: {
          nombre: "Test Integración Wompi",
          correo: "test@optimusbyte.com",
          telefono: "3101234567",
        },
        observaciones: "Prueba automatizada de flujo de pago",
      }),
    });

    const jsonCheckout = await resCheckout.json();
    console.log("Status:", resCheckout.status);
    console.log("Data:", jsonCheckout);

    if (!jsonCheckout.success || !jsonCheckout.data?.referencia) {
      throw new Error("Fallo en POST /api/payments/checkout");
    }

    const referencia = jsonCheckout.data.referencia;
    const idFactura = jsonCheckout.data.id_factura;
    const montoEnCentavos = jsonCheckout.data.montoEnCentavos;
    const firmaIntegridad = jsonCheckout.data.firmaIntegridad;

    console.log(`✓ Factura creada #${idFactura} con referencia: ${referencia}`);
    console.log(`✓ Firma de integridad calculada: ${firmaIntegridad}`);

    // Verificar en BD que la factura esté en estado PENDIENTE y que haya reserva
    const [facturaDb] = await database.query(
      `SELECT id_factura, referencia, total, estado, estado_pago FROM facturas WHERE id_factura = ?`,
      [idFactura]
    );
    console.log("Factura en BD:", facturaDb);
    if (facturaDb.estado !== "PENDIENTE") {
      throw new Error("La factura en BD no se encuentra en estado PENDIENTE");
    }

    const [reservaDb] = await database.query(
      `SELECT id_reserva, id_factura, id_repuesto, cantidad, estado FROM reservas_inventario WHERE id_factura = ?`,
      [idFactura]
    );
    console.log("Reserva en BD:", reservaDb);
    if (!reservaDb || reservaDb.estado !== "RESERVADO") {
      throw new Error("La reserva de inventario no está en estado RESERVADO");
    }

    // Verificar que repuesto.stock_reservado aumentó
    const [repuestoPostReserva] = await database.query(
      `SELECT stock_actual, stock_reservado FROM repuestos WHERE id_repuesto = ?`,
      [repuesto.id_repuesto]
    );
    console.log("Repuesto tras reserva:", repuestoPostReserva);
    if (repuestoPostReserva.stock_reservado < repuesto.stock_reservado + cantidadCompra) {
      throw new Error("El stock_reservado no aumentó correctamente");
    }
    console.log("✓ Test 2 superado: Factura PENDIENTE y Stock RESERVADO correctamente.");

    // 4. Probar GET /api/payments/status/:reference
    console.log("\n[TEST 3] GET /api/payments/status/:reference");
    const resStatus = await fetch(`${baseUrl}/api/payments/status/${referencia}`);
    const jsonStatus = await resStatus.json();
    console.log("Status:", resStatus.status);
    console.log("Data:", jsonStatus.data?.factura);
    if (!jsonStatus.success || jsonStatus.data?.factura?.estado !== "PENDIENTE") {
      throw new Error("Fallo en GET /api/payments/status/:reference");
    }
    console.log("✓ Test 3 superado.");

    // 5. Probar Webhook con firma SHA-256 válida (Pago APPROVED)
    console.log("\n[TEST 4] POST /api/payments/webhook (Simulación de evento APPROVED de Wompi con firma SHA256)");
    const idTxWompi = `test_tx_${Date.now()}`;
    const timestampEvento = Math.floor(Date.now() / 1000);

    // Calcular checksum según Wompi:
    // properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"]
    // concatenar valores + timestamp + WOMPI_EVENTS_SECRET
    const cadenaParaChecksum = `${idTxWompi}APPROVED${montoEnCentavos}${timestampEvento}${config.eventsSecret}`;
    const enc = new TextEncoder();
    const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(cadenaParaChecksum));
    const checksumEsperado = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const payloadWebhook = {
      event: "transaction.updated",
      data: {
        transaction: {
          id: idTxWompi,
          reference: referencia,
          status: "APPROVED",
          amount_in_cents: montoEnCentavos,
          currency: "COP",
          payment_method_type: "CARD",
        },
      },
      environment: "test",
      timestamp: timestampEvento,
      signature: {
        properties: [
          "transaction.id",
          "transaction.status",
          "transaction.amount_in_cents",
        ],
        checksum: checksumEsperado,
      },
    };

    const resWebhook = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-event-checksum": checksumEsperado,
      },
      body: JSON.stringify(payloadWebhook),
    });

    const jsonWebhook = await resWebhook.json();
    console.log("Status Webhook:", resWebhook.status);
    console.log("Data Webhook:", jsonWebhook);

    if (!jsonWebhook.success || jsonWebhook.status !== "APPROVED") {
      throw new Error("Fallo en POST /api/payments/webhook");
    }

    // Verificar en BD:
    // - Factura marcada como PAGADA
    // - Reserva marcada como CONFIRMADO
    // - Stock actual descontado y stock_reservado liberado
    // - Pago registrado en tabla pagos
    // - Evento registrado en eventos_wompi
    const [facturaAprobada] = await database.query(
      `SELECT estado, estado_pago, id_transaccion_wompi, fecha_pago FROM facturas WHERE id_factura = ?`,
      [idFactura]
    );
    console.log("Factura tras webhook APPROVED:", facturaAprobada);
    if (facturaAprobada.estado !== "PAGADA") {
      throw new Error("La factura no fue marcada como PAGADA");
    }

    const [reservaConfirmada] = await database.query(
      `SELECT estado, fecha_confirmacion FROM reservas_inventario WHERE id_factura = ?`,
      [idFactura]
    );
    console.log("Reserva tras webhook:", reservaConfirmada);
    if (reservaConfirmada.estado !== "CONFIRMADO") {
      throw new Error("La reserva de inventario no fue marcada como CONFIRMADO");
    }

    const [pagoDb] = await database.query(
      `SELECT id_pago, monto, estado, id_transaccion_wompi FROM pagos WHERE id_factura = ?`,
      [idFactura]
    );
    console.log("Pago registrado en BD:", pagoDb);
    if (!pagoDb || pagoDb.estado !== "APPROVED") {
      throw new Error("El registro en tabla pagos no fue creado como APPROVED");
    }

    const [repuestoFinal] = await database.query(
      `SELECT stock_actual, stock_reservado FROM repuestos WHERE id_repuesto = ?`,
      [repuesto.id_repuesto]
    );
    console.log("Repuesto tras pago aprobado (salida definitiva):", repuestoFinal);
    if (repuestoFinal.stock_actual !== repuesto.stock_actual - cantidadCompra) {
      throw new Error("El stock_actual no se redujo de forma definitiva");
    }

    console.log("✓ Test 4 superado: Factura PAGADA, reserva CONFIRMADA y stock descontado definitivamente.");

    // 6. Probar Idempotencia del Webhook
    console.log("\n[TEST 5] Idempotencia del Webhook (Reenvío del mismo evento)");
    const resWebhook2 = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-event-checksum": checksumEsperado,
      },
      body: JSON.stringify(payloadWebhook),
    });
    const jsonWebhook2 = await resWebhook2.json();
    console.log("Data reintento webhook:", jsonWebhook2);
    if (!jsonWebhook2.idempotent) {
      throw new Error("El webhook no reconoció la idempotencia del evento");
    }
    console.log("✓ Test 5 superado: Idempotencia validada exitosamente.");

    // 7. Probar flujo de Rechazo / Cancelación (liberación de inventario)
    console.log("\n[TEST 6] Prueba de Pago DECLINED (Devolución de inventario reservado)");
    const resCheckout2 = await fetch(`${baseUrl}/api/payments/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id_repuesto: repuesto.id_repuesto, cantidad: 1 }],
        cliente: { nombre: "Test Rechazo", correo: "rechazo@test.com", telefono: "3000000000" },
      }),
    });
    const jsonCheckout2 = await resCheckout2.json();
    const refRechazo = jsonCheckout2.data.referencia;
    const idFactura2 = jsonCheckout2.data.id_factura;
    const montoCentavos2 = jsonCheckout2.data.montoEnCentavos;

    const idTxDeclined = `tx_declined_${Date.now()}`;
    const ts2 = Math.floor(Date.now() / 1000);
    const cadenaDeclined = `${idTxDeclined}DECLINED${montoCentavos2}${ts2}${config.eventsSecret}`;
    const hashDeclinedBuf = await crypto.subtle.digest("SHA-256", enc.encode(cadenaDeclined));
    const checksumDeclined = Array.from(new Uint8Array(hashDeclinedBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const resWebhookDeclined = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-event-checksum": checksumDeclined,
      },
      body: JSON.stringify({
        event: "transaction.updated",
        data: {
          transaction: {
            id: idTxDeclined,
            reference: refRechazo,
            status: "DECLINED",
            amount_in_cents: montoCentavos2,
            currency: "COP",
            payment_method_type: "CARD",
          },
        },
        environment: "test",
        timestamp: ts2,
        signature: {
          properties: [
            "transaction.id",
            "transaction.status",
            "transaction.amount_in_cents",
          ],
          checksum: checksumDeclined,
        },
      }),
    });

    const jsonDeclined = await resWebhookDeclined.json();
    console.log("Respuesta webhook DECLINED:", jsonDeclined);

    const [facturaRechazada] = await database.query(
      `SELECT estado, estado_pago FROM facturas WHERE id_factura = ?`,
      [idFactura2]
    );
    console.log("Factura tras DECLINED:", facturaRechazada);
    if (facturaRechazada.estado !== "RECHAZADA") {
      throw new Error("La factura no fue marcada como RECHAZADA");
    }

    const [reservaLiberada] = await database.query(
      `SELECT estado, fecha_liberacion FROM reservas_inventario WHERE id_factura = ?`,
      [idFactura2]
    );
    console.log("Reserva tras DECLINED:", reservaLiberada);
    if (reservaLiberada.estado !== "LIBERADO") {
      throw new Error("La reserva de inventario no fue marcada como LIBERADO");
    }

    console.log("✓ Test 6 superado: Factura RECHAZADA y reserva devuelta a inventario disponible.");

    console.log("\n==========================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE INTEGRACIÓN DE WOMPI PASARON AL 100%");
    console.log("==========================================================");
  } catch (error) {
    console.error("❌ ERROR EN PRUEBAS:", error);
  } finally {
    await database.close();
  }
}

await runEndToEndTests();
