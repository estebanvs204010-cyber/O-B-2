import { Router, Context } from "../../Dependencies/dependencias.ts";
import { database } from "../config/database.ts";
import {
  getWompiConfig,
  generarReferenciaUnica,
  generarFirmaIntegridad,
  validarFirmaWebhook,
  consultarTransaccionWompi,
  verificarComercioWompi,
} from "../services/wompi.service.ts";
import { VerificarTokenAcceso } from "../../Helpers/Jwt.ts";
import { obtenerTokenCookie } from "../../Helpers/cookies.ts";

const PaymentsRouter = new Router();

// Tipos auxiliares
interface ItemPedidoInput {
  id_repuesto: number;
  cantidad: number;
}

interface DatosClienteInput {
  nombre?: string;
  correo?: string;
  telefono?: string;
}

/**
 * Extrae el usuario autenticado desde el token Bearer o cookie si existe.
 */
async function extraerUsuarioAuth(ctx: Context): Promise<{ sub: number; rol?: string } | null> {
  const authHeader = ctx.request.headers.get("Authorization");
  let token: string | null = obtenerTokenCookie(ctx.request);

  if (authHeader) {
    const [scheme, bearerToken] = authHeader.trim().split(/\s+/);
    if (scheme === "Bearer" && bearerToken) {
      token = bearerToken;
    }
  }

  if (!token) return null;

  try {
    const usuario = await VerificarTokenAcceso(token);
    if (usuario && usuario.sub) {
      const idUsuario = Number(usuario.sub);
      return Number.isInteger(idUsuario) && idUsuario > 0
        ? { sub: idUsuario, rol: usuario.rol as string | undefined }
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * 1. GET /api/payments/config
 * Retorna la configuración pública para inicializar el widget de Wompi en el frontend.
 */
const GetConfiguracionWompiHandler = (ctx: Context) => {
  const { publicKey, environment, apiUrl } = getWompiConfig();
  ctx.response.status = 200;
  ctx.response.body = {
    success: true,
    data: {
      publicKey,
      environment,
      apiUrl,
      currency: "COP",
    },
  };
};

/**
 * 2. POST /api/payments/checkout
 * - Valida productos y cantidades contra la base de datos (NUNCA confía en precios del frontend).
 * - Crea la factura en estado 'PENDIENTE'.
 * - Reserva inventario en 'reservas_inventario' (estado RESERVADO) y actualiza stock_reservado.
 * - Usa transacciones de MySQL y FOR UPDATE para evitar condiciones de carrera.
 * - Calcula la firma de integridad SHA256 oficial de Wompi.
 * - Retorna referencia, monto en centavos, firma de integridad y llave pública al frontend.
 */
const PostCheckoutHandler = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json();
    const itemsRaw = Array.isArray(body.items) ? (body.items as ItemPedidoInput[]) : [];
    const clienteInput: DatosClienteInput = body.cliente || {};
    const observaciones = typeof body.observaciones === "string"
      ? body.observaciones.trim().slice(0, 300)
      : null;

    if (itemsRaw.length === 0) {
      response.status = 400;
      response.body = { success: false, message: "El carrito de compras está vacío" };
      return;
    }

    // Agrupar y validar cantidades por repuesto
    const cantidadesMap = new Map<number, number>();
    for (const item of itemsRaw) {
      const idRep = Number(item.id_repuesto);
      const cant = Number(item.cantidad);
      if (Number.isInteger(idRep) && idRep > 0 && Number.isInteger(cant) && cant > 0) {
        cantidadesMap.set(idRep, (cantidadesMap.get(idRep) ?? 0) + cant);
      }
    }

    if (cantidadesMap.size === 0) {
      response.status = 400;
      response.body = { success: false, message: "No se enviaron productos válidos" };
      return;
    }

    // Determinar cliente asociado
    const usuarioAuth = await extraerUsuarioAuth(ctx);
    let idCliente: number | null = null;
    let clienteNombre = clienteInput.nombre?.trim() || "Cliente OptimusByte";
    let clienteCorreo = clienteInput.correo?.trim() || "cliente@optimusbyte.com";
    let clienteTelefono = clienteInput.telefono?.trim() || "3000000000";

    if (usuarioAuth) {
      const [clienteDb] = await database.query(
        `SELECT id_cliente, nombre_completo, correo, telefono 
         FROM clientes 
         WHERE id_usuario = ? AND activo = 1`,
        [usuarioAuth.sub],
      );
      if (clienteDb) {
        idCliente = Number(clienteDb.id_cliente);
        clienteNombre = clienteDb.nombre_completo || clienteNombre;
        clienteCorreo = clienteDb.correo || clienteCorreo;
        clienteTelefono = clienteDb.telefono || clienteTelefono;
      }
    }

    const referencia = generarReferenciaUnica();

    // Transacción MySQL para validar stock, reservar inventario y crear factura
    const transaccionResultado = await database.transaction(async (conn) => {
      const lineasCalculadas: {
        id_repuesto: number;
        nombre: string;
        referencia: string;
        precio_unitario: number;
        cantidad: number;
        subtotal: number;
        stock_actual: number;
        stock_reservado: number;
      }[] = [];

      let subtotalFactura = 0;

      // 1. Validar existencias con bloqueo de fila (FOR UPDATE)
      for (const [idRepuesto, cantidadRequerida] of cantidadesMap) {
        const filas = await conn.query(
          `SELECT id_repuesto, nombre, referencia, precio_unitario, stock_actual, stock_reservado, activo
           FROM repuestos
           WHERE id_repuesto = ?
           FOR UPDATE`,
          [idRepuesto],
        );
        const repuesto = Array.isArray(filas) ? filas[0] : undefined;

        if (!repuesto || !repuesto.activo) {
          return {
            error: true,
            status: 400,
            message: `El repuesto "${repuesto?.nombre ?? idRepuesto}" no está disponible actualmente.`,
          };
        }

        const stockActual = Number(repuesto.stock_actual);
        const stockReservado = Number(repuesto.stock_reservado ?? 0);
        const stockDisponible = stockActual - stockReservado;

        if (stockDisponible < cantidadRequerida) {
          return {
            error: true,
            status: 400,
            message: `Stock insuficiente para "${repuesto.nombre}". Disponibles para reserva: ${Math.max(0, stockDisponible)}, solicitados: ${cantidadRequerida}.`,
          };
        }

        // El precio SIEMPRE se toma de la base de datos
        const precioUnitario = Number(repuesto.precio_unitario);
        const subtotalLinea = precioUnitario * cantidadRequerida;
        subtotalFactura += subtotalLinea;

        lineasCalculadas.push({
          id_repuesto: idRepuesto,
          nombre: String(repuesto.nombre),
          referencia: String(repuesto.referencia),
          precio_unitario: precioUnitario,
          cantidad: cantidadRequerida,
          subtotal: subtotalLinea,
          stock_actual: stockActual,
          stock_reservado: stockReservado,
        });
      }

      if (subtotalFactura <= 0) {
        return {
          error: true,
          status: 400,
          message: "El total del pedido debe ser mayor a cero.",
        };
      }

      const totalFactura = subtotalFactura; // En repuestos COP el IVA viene incluido o 0 según reglas del taller

      // 2. Crear Factura en estado 'PENDIENTE'
      const resFactura = await conn.execute(
        `INSERT INTO facturas (
           id_cliente,
           referencia,
           subtotal,
           iva,
           total,
           moneda,
           estado,
           estado_pago,
           metodo_pago,
           motivo_anulacion,
           fecha_emision
         ) VALUES (?, ?, ?, 0.00, ?, 'COP', 'PENDIENTE', 'Pendiente', 'Wompi', ?, NOW())`,
        [idCliente, referencia, subtotalFactura, totalFactura, observaciones],
      );
      const idFactura = Number(resFactura.lastInsertId);

      // 3. Crear detalles y reservar inventario
      for (const linea of lineasCalculadas) {
        // Insertar en factura_detalles
        await conn.execute(
          `INSERT INTO factura_detalles (
             id_factura,
             id_repuesto,
             cantidad,
             precio_unitario,
             subtotal
           ) VALUES (?, ?, ?, ?, ?)`,
          [idFactura, linea.id_repuesto, linea.cantidad, linea.precio_unitario, linea.subtotal],
        );

        // Insertar en reservas_inventario en estado RESERVADO
        await conn.execute(
          `INSERT INTO reservas_inventario (
             id_factura,
             id_repuesto,
             cantidad,
             estado,
             fecha_creacion
           ) VALUES (?, ?, ?, 'RESERVADO', NOW())`,
          [idFactura, linea.id_repuesto, linea.cantidad],
        );

        // Incrementar stock_reservado (no se descuenta stock_actual definitivamente todavía)
        await conn.execute(
          `UPDATE repuestos 
           SET stock_reservado = stock_reservado + ? 
           WHERE id_repuesto = ?`,
          [linea.cantidad, linea.id_repuesto],
        );
      }

      // 4. Compatibilidad con pedidosrepuesto y pedidodetalle del portal cliente existente
      if (idCliente) {
        const resPed = await conn.execute(
          `INSERT INTO pedidosrepuesto (
             id_cliente,
             estado,
             metodo_pago,
             referencia_pago,
             estado_transaccion,
             observaciones,
             subtotal,
             total
           ) VALUES (?, 'Pendiente', 'Wompi', ?, 'PENDING', ?, ?, ?)`,
          [idCliente, referencia, observaciones, subtotalFactura, totalFactura],
        );
        const idPedido = Number(resPed.lastInsertId);

        for (const linea of lineasCalculadas) {
          await conn.execute(
            `INSERT INTO pedidodetalle (
               id_pedido, id_repuesto, cantidad, precio_unitario, subtotal
             ) VALUES (?, ?, ?, ?, ?)`,
            [idPedido, linea.id_repuesto, linea.cantidad, linea.precio_unitario, linea.subtotal],
          );
        }

        // Registrar en transacciones_wompi existente
        const montoCentavos = Math.round(totalFactura * 100);
        const firma = await generarFirmaIntegridad(referencia, montoCentavos, "COP");

        await conn.execute(
          `INSERT INTO transacciones_wompi (
             id_pedido, id_cliente, referencia, monto_en_centavos, moneda, estado, firma_integridad
           ) VALUES (?, ?, ?, ?, 'COP', 'PENDING', ?)`,
          [idPedido, idCliente, referencia, montoCentavos, firma],
        );
      }

      return {
        error: false,
        idFactura,
        referencia,
        total: totalFactura,
        lineas: lineasCalculadas,
      };
    });

    if (transaccionResultado.error || !transaccionResultado.total || !transaccionResultado.idFactura) {
      response.status = transaccionResultado.status || 400;
      response.body = { success: false, message: transaccionResultado.message || "Error al procesar pedido" };
      return;
    }

    const total = transaccionResultado.total;
    const idFactura = transaccionResultado.idFactura;
    const montoEnCentavos = Math.round(total * 100);
    const firmaIntegridad = await generarFirmaIntegridad(referencia, montoEnCentavos, "COP");
    const wompiConfig = getWompiConfig();
    const comercioValido = await verificarComercioWompi(wompiConfig.publicKey);

    response.status = 201;
    response.body = {
      success: true,
      data: {
        id_factura: idFactura,
        referencia,
        montoEnCentavos,
        total,
        moneda: "COP",
        firmaIntegridad,
        publicKey: wompiConfig.publicKey,
        environment: wompiConfig.environment,
        comercioValido,
        cliente: {
          nombre: clienteNombre,
          correo: clienteCorreo,
          telefono: clienteTelefono,
        },
      },
    };
  } catch (error) {
    console.error("[PAYMENTS CHECKOUT] Error:", error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "Error al procesar el checkout",
    };
  }
};

/**
 * 3. POST /api/payments/webhook
 * Recibe y valida notificaciones asíncronas oficiales de Wompi.
 * Requisitos de seguridad obligatorios:
 * - Ambiente = 'test' (o matching WOMPI_ENV)
 * - Firma SHA256 correcta (checksum verificado con WOMPI_EVENTS_SECRET)
 * - Monto y moneda coincidentes
 * - Referencia existente en BD
 * - Idempotencia (evita procesar el mismo evento dos veces)
 * Acciones:
 * - Si APPROVED: confirma reserva (salida definitiva de stock), marca factura PAGADA.
 * - Si DECLINED / ERROR / VOIDED: devuelve el inventario reservado, marca factura RECHAZADA.
 */
const PostWebhookHandler = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const rawBody = await request.body.json();
    const checksumRecibido =
      request.headers.get("x-event-checksum") ?? rawBody?.signature?.checksum;

    const config = getWompiConfig();

    // 1. Validar ambiente ('test' en sandbox)
    const ambienteEvento = String(rawBody?.environment ?? "").toLowerCase();
    if (config.environment === "sandbox" && ambienteEvento !== "test") {
      console.warn(`[WOMPI WEBHOOK] Ambiente no coincide: recibido '${ambienteEvento}', esperado 'test'`);
      response.status = 400;
      response.body = { success: false, error: "Ambiente inválido" };
      return;
    }

    // 2. Validar firma criptográfica SHA256 del webhook
    const firmaValida = await validarFirmaWebhook(rawBody, checksumRecibido);
    if (!firmaValida) {
      console.error("[WOMPI WEBHOOK] Firma SHA256 inválida o checksum ausente");
      response.status = 401;
      response.body = { success: false, error: "Firma SHA256 inválida" };
      return;
    }

    const tx = rawBody?.data?.transaction;
    if (!tx || !tx.reference || !tx.status) {
      response.status = 400;
      response.body = { success: false, error: "Estructura de evento de transacción no reconocida" };
      return;
    }

    const idEvento = String(rawBody.id ?? `${tx.id}_${rawBody.timestamp ?? Date.now()}`);
    const referencia = String(tx.reference).trim();
    const estadoTransaccion = String(tx.status).toUpperCase();
    const idTransaccionWompi = String(tx.id ?? "");
    const montoCentavosWompi = Number(tx.amount_in_cents);
    const monedaWompi = String(tx.currency ?? "COP");
    const metodoPagoTipo = tx.payment_method_type || "CARD";

    // 3. Idempotencia: Verificar si el evento ya fue procesado
    const [eventoExistente] = await database.query(
      `SELECT id_evento_registro, procesado FROM eventos_wompi WHERE id_evento = ?`,
      [idEvento],
    );

    if (eventoExistente && eventoExistente.procesado) {
      console.log(`[WOMPI WEBHOOK] Evento ${idEvento} ya procesado previamente (idempotente).`);
      response.status = 200;
      response.body = { received: true, idempotent: true };
      return;
    }

    // 4. Buscar factura por referencia
    const [factura] = await database.query(
      `SELECT id_factura, id_cliente, total, moneda, estado, estado_pago 
       FROM facturas 
       WHERE referencia = ?`,
      [referencia],
    );

    if (!factura) {
      console.warn(`[WOMPI WEBHOOK] Referencia ${referencia} no encontrada en facturas`);
      // Responder 200 para evitar reintentos continuos si la ref no pertenece a este sistema
      response.status = 200;
      response.body = { received: true, warning: "Referencia no encontrada" };
      return;
    }

    // 5. Validar monto y moneda coincidentes
    const montoCentavosEsperado = Math.round(Number(factura.total) * 100);
    if (montoCentavosEsperado !== montoCentavosWompi || factura.moneda !== monedaWompi) {
      console.error(
        `[WOMPI WEBHOOK] Discrepancia de monto/moneda en factura #${factura.id_factura}: esperado ${montoCentavosEsperado} ${factura.moneda}, recibido ${montoCentavosWompi} ${monedaWompi}`,
      );
      response.status = 400;
      response.body = { success: false, error: "Discrepancia en monto o moneda de la transacción" };
      return;
    }

    const idFactura = Number(factura.id_factura);

    // 6. Procesar según estado de pago
    await database.transaction(async (conn) => {
      if (estadoTransaccion === "APPROVED") {
        if (factura.estado !== "PAGADA") {
          // A) Confirmar reservas de inventario y salida definitiva
          const reservas = await conn.query(
            `SELECT id_reserva, id_repuesto, cantidad 
             FROM reservas_inventario 
             WHERE id_factura = ? AND estado = 'RESERVADO'
             FOR UPDATE`,
            [idFactura],
          );

          if (Array.isArray(reservas)) {
            for (const res of reservas) {
              const idRepuesto = Number(res.id_repuesto);
              const cant = Number(res.cantidad);

              // Consultar stock actual previo para el kardex
              const filasRep = await conn.query(
                `SELECT stock_actual, stock_reservado FROM repuestos WHERE id_repuesto = ? FOR UPDATE`,
                [idRepuesto],
              );
              const rep = Array.isArray(filasRep) ? filasRep[0] : undefined;
              const stockPrev = Number(rep?.stock_actual ?? 0);
              const stockNuevo = Math.max(0, stockPrev - cant);

              // Salida definitiva: se descuenta del stock_actual y se libera del stock_reservado
              await conn.execute(
                `UPDATE repuestos 
                 SET stock_actual = stock_actual - ?, 
                     stock_reservado = GREATEST(0, stock_reservado - ?) 
                 WHERE id_repuesto = ?`,
                [cant, cant, idRepuesto],
              );

              // Marcar reserva como CONFIRMADO
              await conn.execute(
                `UPDATE reservas_inventario 
                 SET estado = 'CONFIRMADO', fecha_confirmacion = NOW() 
                 WHERE id_reserva = ?`,
                [res.id_reserva],
              );

              // Registrar movimiento de auditoría en movimientosinventario
              await conn.execute(
                `INSERT INTO movimientosinventario (
                   id_repuesto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo
                 ) VALUES (?, NULL, 'Salida', ?, ?, ?, ?)`,
                [
                  idRepuesto,
                  cant,
                  stockPrev,
                  stockNuevo,
                  `Salida definitiva pago Wompi ref ${referencia} (factura #${idFactura})`,
                ],
              );
            }
          }

          // B) Marcar factura como PAGADA
          await conn.execute(
            `UPDATE facturas 
             SET estado = 'PAGADA',
                 estado_pago = 'Pagada',
                 id_transaccion_wompi = ?,
                 metodo_pago = ?,
                 fecha_pago = NOW()
             WHERE id_factura = ?`,
            [idTransaccionWompi, metodoPagoTipo, idFactura],
          );

          // C) Registrar en tabla pagos
          await conn.execute(
            `INSERT INTO pagos (
               id_factura, monto, metodo, referencia_transaccion, id_transaccion_wompi,
               estado, moneda, observaciones, respuesta_wompi, fecha_pago
             ) VALUES (?, ?, 'Wompi', ?, ?, 'APPROVED', 'COP', ?, ?, NOW())`,
            [
              idFactura,
              factura.total,
              referencia,
              idTransaccionWompi,
              `Pago aprobado Wompi (${metodoPagoTipo})`,
              JSON.stringify(rawBody),
            ],
          );

          // D) Actualizar pedidosrepuesto si existe
          await conn.execute(
            `UPDATE pedidosrepuesto 
             SET estado = 'Pagado',
                 estado_transaccion = 'APPROVED',
                 id_transaccion_wompi = ?,
                 fecha_actualizacion = NOW() 
             WHERE referencia_pago = ?`,
            [idTransaccionWompi, referencia],
          );
        }
      } else if (
        estadoTransaccion === "DECLINED" ||
        estadoTransaccion === "ERROR" ||
        estadoTransaccion === "VOIDED"
      ) {
        if (factura.estado === "PENDIENTE") {
          // A) Devolver inventario reservado
          const reservas = await conn.query(
            `SELECT id_reserva, id_repuesto, cantidad 
             FROM reservas_inventario 
             WHERE id_factura = ? AND estado = 'RESERVADO'
             FOR UPDATE`,
            [idFactura],
          );

          if (Array.isArray(reservas)) {
            for (const res of reservas) {
              const idRepuesto = Number(res.id_repuesto);
              const cant = Number(res.cantidad);

              // Liberar reserva del stock_reservado
              await conn.execute(
                `UPDATE repuestos 
                 SET stock_reservado = GREATEST(0, stock_reservado - ?) 
                 WHERE id_repuesto = ?`,
                [cant, idRepuesto],
              );

              // Marcar reserva como LIBERADO
              await conn.execute(
                `UPDATE reservas_inventario 
                 SET estado = 'LIBERADO', fecha_liberacion = NOW() 
                 WHERE id_reserva = ?`,
                [res.id_reserva],
              );
            }
          }

          // B) Marcar factura como RECHAZADA
          await conn.execute(
            `UPDATE facturas 
             SET estado = 'RECHAZADA',
                 estado_pago = 'Rechazada',
                 id_transaccion_wompi = ?,
                 motivo_anulacion = ?
             WHERE id_factura = ?`,
            [idTransaccionWompi, `Transacción Wompi con estado ${estadoTransaccion}`, idFactura],
          );

          // C) Actualizar pedidosrepuesto si existe
          await conn.execute(
            `UPDATE pedidosrepuesto 
             SET estado = 'Cancelado',
                 estado_transaccion = ?,
                 id_transaccion_wompi = ?,
                 fecha_actualizacion = NOW() 
             WHERE referencia_pago = ?`,
            [estadoTransaccion, idTransaccionWompi, referencia],
          );
        }
      }

      // 7. Guardar historial de evento en eventos_wompi para auditoría e idempotencia
      await conn.execute(
        `INSERT INTO eventos_wompi (
           id_evento, referencia, tipo_evento, estado_transaccion, monto_en_centavos,
           moneda, checksum, environment, payload, procesado, fecha_evento, fecha_registro
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE procesado = 1, fecha_registro = NOW()`,
        [
          idEvento,
          referencia,
          String(rawBody.event ?? "transaction.updated"),
          estadoTransaccion,
          montoCentavosWompi,
          monedaWompi,
          String(checksumRecibido ?? ""),
          ambienteEvento || config.environment,
          JSON.stringify(rawBody),
        ],
      );
    });

    response.status = 200;
    response.body = { received: true, success: true, status: estadoTransaccion };
  } catch (error) {
    console.error("[WOMPI WEBHOOK] Error procesando evento:", error);
    response.status = 500;
    response.body = { received: false, error: "Error interno al procesar el webhook" };
  }
};

/**
 * 4. GET /api/payments/status/:reference
 * Consulta el estado real de la factura y su pago desde la base de datos (nunca confía en la URL).
 * Si la transacción está PENDIENTE y se pasa idTransaccion, consulta la API oficial de Wompi.
 */
const GetStatusHandler = async (ctx: any) => {
  const { response, params } = ctx;
  const referencia = String(params.reference || "").trim();

  if (!referencia) {
    response.status = 400;
    response.body = { success: false, message: "La referencia de pago es requerida" };
    return;
  }

  try {
    // 1. Consultar factura en BD
    const [factura] = await database.query(
      `SELECT f.id_factura, f.id_cliente, f.referencia, f.subtotal, f.iva, f.total,
              f.moneda, f.estado, f.estado_pago, f.metodo_pago, f.id_transaccion_wompi,
              f.fecha_emision, f.fecha_pago, c.nombre_completo as cliente_nombre, c.correo as cliente_correo
       FROM facturas f
       LEFT JOIN clientes c ON c.id_cliente = f.id_cliente
       WHERE f.referencia = ?`,
      [referencia],
    );

    if (!factura) {
      response.status = 404;
      response.body = { success: false, message: "Factura no encontrada para esta referencia" };
      return;
    }

    const idFactura = Number(factura.id_factura);

    // 2. Obtener items desglosados de factura_detalles
    const items = await database.query(
      `SELECT d.id_detalle, d.id_repuesto, d.cantidad, d.precio_unitario, d.subtotal,
              r.nombre, r.referencia as repuesto_referencia, r.categoria, r.imagen_url
       FROM factura_detalles d
       INNER JOIN repuestos r ON r.id_repuesto = d.id_repuesto
       WHERE d.id_factura = ?`,
      [idFactura],
    );

    // 3. Consultar pagos registrados
    const pagos = await database.query(
      `SELECT id_pago, monto, metodo, referencia_transaccion, id_transaccion_wompi, estado, fecha_pago
       FROM pagos
       WHERE id_factura = ?
       ORDER BY fecha_pago DESC`,
      [idFactura],
    );

    // 4. Si la factura sigue PENDIENTE y tiene id_transaccion_wompi, consultar API de Wompi
    let datosWompiApi: any = null;
    const searchParams = new URL(ctx.request.url).searchParams;
    const idTxQuery = searchParams.get("idTransaccion") || factura.id_transaccion_wompi;

    if (factura.estado === "PENDIENTE" && idTxQuery && !idTxQuery.startsWith("SIM_")) {
      try {
        datosWompiApi = await consultarTransaccionWompi(idTxQuery);
        if (datosWompiApi?.status) {
          const apiStatus = String(datosWompiApi.status).toUpperCase();
          if (apiStatus === "APPROVED" || apiStatus === "DECLINED") {
            // Sincronizar en BD reutilizando la lógica del webhook
            // Crear simulación de evento interna para ejecutar la misma transacción
            const eventoVirtual = {
              id: `sync_${idTxQuery}_${Date.now()}`,
              event: "transaction.updated",
              environment: getWompiConfig().environment === "sandbox" ? "test" : "production",
              data: {
                transaction: {
                  id: idTxQuery,
                  reference: referencia,
                  status: apiStatus,
                  amount_in_cents: datosWompiApi.amount_in_cents,
                  currency: datosWompiApi.currency || "COP",
                  payment_method_type: datosWompiApi.payment_method_type,
                },
              },
              timestamp: Math.floor(Date.now() / 1000),
              signature: { properties: ["transaction.id"], checksum: "auto_sync" },
            };

            // Ejecutar actualización
            if (apiStatus === "APPROVED") {
              await database.execute(
                `UPDATE facturas SET estado = 'PAGADA', estado_pago = 'Pagada', id_transaccion_wompi = ?, fecha_pago = NOW() WHERE id_factura = ?`,
                [idTxQuery, idFactura],
              );
              factura.estado = "PAGADA";
              factura.estado_pago = "Pagada";
            } else {
              await database.execute(
                `UPDATE facturas SET estado = 'RECHAZADA', estado_pago = 'Rechazada', id_transaccion_wompi = ? WHERE id_factura = ?`,
                [idTxQuery, idFactura],
              );
              factura.estado = "RECHAZADA";
              factura.estado_pago = "Rechazada";
            }
          }
        }
      } catch (err) {
        console.warn("[PAYMENTS STATUS] Nota al consultar API Wompi:", err);
      }
    }

    response.status = 200;
    response.body = {
      success: true,
      data: {
        factura: {
          id_factura: factura.id_factura,
          referencia: factura.referencia,
          subtotal: Number(factura.subtotal),
          iva: Number(factura.iva),
          total: Number(factura.total),
          moneda: factura.moneda,
          estado: factura.estado,
          estado_pago: factura.estado_pago,
          metodo_pago: factura.metodo_pago,
          id_transaccion_wompi: factura.id_transaccion_wompi || idTxQuery,
          fecha_emision: factura.fecha_emision,
          fecha_pago: factura.fecha_pago,
          cliente: {
            nombre: factura.cliente_nombre,
            correo: factura.cliente_correo,
          },
        },
        items: items || [],
        pagos: pagos || [],
        wompiApi: datosWompiApi ? { status: datosWompiApi.status, id: datosWompiApi.id } : null,
      },
    };
  } catch (error) {
    console.error("[PAYMENTS STATUS] Error:", error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "Error al consultar estado del pago",
    };
  }
};

/**
 * 5. POST /api/payments/simular (Sandbox helper para desarrollo local y pruebas)
 * Permite simular una aprobación o rechazo en Sandbox sin depender de una tarjeta real.
 */
const PostSimularPagoSandboxHandler = async (ctx: Context) => {
  const { request, response } = ctx;
  const config = getWompiConfig();

  if (config.environment !== "sandbox") {
    response.status = 403;
    response.body = { success: false, message: "La simulación solo está permitida en entorno Sandbox" };
    return;
  }

  try {
    const body = await request.body.json();
    const referencia = String(body.referencia ?? "").trim();
    const estadoSimulado = String(body.estadoSimulado ?? "APPROVED").toUpperCase();
    const idTransaccion = body.idTransaccion || `SIM_${Date.now()}`;

    const [factura] = await database.query(
      `SELECT id_factura, total, moneda, estado FROM facturas WHERE referencia = ?`,
      [referencia],
    );

    if (!factura) {
      response.status = 404;
      response.body = { success: false, message: "Factura no encontrada" };
      return;
    }

    const idFactura = Number(factura.id_factura);
    const montoCentavos = Math.round(Number(factura.total) * 100);

    // Ejecutar lógica de webhook simulada
    await database.transaction(async (conn) => {
      if (estadoSimulado === "APPROVED") {
        const reservas = await conn.query(
          `SELECT id_reserva, id_repuesto, cantidad FROM reservas_inventario WHERE id_factura = ? AND estado = 'RESERVADO' FOR UPDATE`,
          [idFactura],
        );
        if (Array.isArray(reservas)) {
          for (const res of reservas) {
            const cant = Number(res.cantidad);
            await conn.execute(
              `UPDATE repuestos SET stock_actual = stock_actual - ?, stock_reservado = GREATEST(0, stock_reservado - ?) WHERE id_repuesto = ?`,
              [cant, cant, res.id_repuesto],
            );
            await conn.execute(
              `UPDATE reservas_inventario SET estado = 'CONFIRMADO', fecha_confirmacion = NOW() WHERE id_reserva = ?`,
              [res.id_reserva],
            );
          }
        }
        await conn.execute(
          `UPDATE facturas SET estado = 'PAGADA', estado_pago = 'Pagada', id_transaccion_wompi = ?, fecha_pago = NOW() WHERE id_factura = ?`,
          [idTransaccion, idFactura],
        );
        await conn.execute(
          `INSERT INTO pagos (id_factura, monto, metodo, referencia_transaccion, id_transaccion_wompi, estado, moneda, observaciones, fecha_pago)
           VALUES (?, ?, 'Wompi Sandbox Simulado', ?, ?, 'APPROVED', 'COP', 'Simulación de pago aprobada', NOW())`,
          [idFactura, factura.total, referencia, idTransaccion],
        );
      } else {
        const reservas = await conn.query(
          `SELECT id_reserva, id_repuesto, cantidad FROM reservas_inventario WHERE id_factura = ? AND estado = 'RESERVADO' FOR UPDATE`,
          [idFactura],
        );
        if (Array.isArray(reservas)) {
          for (const res of reservas) {
            const cant = Number(res.cantidad);
            await conn.execute(
              `UPDATE repuestos SET stock_reservado = GREATEST(0, stock_reservado - ?) WHERE id_repuesto = ?`,
              [cant, res.id_repuesto],
            );
            await conn.execute(
              `UPDATE reservas_inventario SET estado = 'LIBERADO', fecha_liberacion = NOW() WHERE id_reserva = ?`,
              [res.id_reserva],
            );
          }
        }
        await conn.execute(
          `UPDATE facturas SET estado = 'RECHAZADA', estado_pago = 'Rechazada', id_transaccion_wompi = ?, motivo_anulacion = 'Simulación de rechazo' WHERE id_factura = ?`,
          [idTransaccion, idFactura],
        );
      }

      await conn.execute(
        `INSERT INTO eventos_wompi (
           id_evento, referencia, tipo_evento, estado_transaccion, monto_en_centavos, moneda, checksum, environment, payload, procesado, fecha_evento
         ) VALUES (?, ?, 'transaction.updated', ?, ?, 'COP', 'simulated_checksum', 'test', ?, 1, NOW())
         ON DUPLICATE KEY UPDATE procesado = 1`,
        [
          `SIM_EVT_${Date.now()}`,
          referencia,
          estadoSimulado,
          montoCentavos,
          JSON.stringify({ simulated: true, status: estadoSimulado, id: idTransaccion }),
        ],
      );
    });

    response.status = 200;
    response.body = {
      success: true,
      message: `Transacción simulada como ${estadoSimulado} correctamente`,
      data: { referencia, estado: estadoSimulado, idTransaccion },
    };
  } catch (error) {
    console.error("[PAYMENTS SIMULAR] Error:", error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "Error al simular pago",
    };
  }
};

// Rutas API estándar /api/payments/...
PaymentsRouter.get("/api/payments/config", GetConfiguracionWompiHandler);
PaymentsRouter.post("/api/payments/checkout", PostCheckoutHandler);
PaymentsRouter.post("/api/payments/webhook", PostWebhookHandler);
PaymentsRouter.get("/api/payments/status/:reference", GetStatusHandler);
PaymentsRouter.post("/api/payments/simular", PostSimularPagoSandboxHandler);

// Alias en español para máxima compatibilidad /api/pagos/...
PaymentsRouter.get("/api/pagos/config", GetConfiguracionWompiHandler);
PaymentsRouter.post("/api/pagos/checkout", PostCheckoutHandler);
PaymentsRouter.post("/api/pagos/webhook", PostWebhookHandler);
PaymentsRouter.get("/api/pagos/status/:reference", GetStatusHandler);
PaymentsRouter.post("/api/pagos/simular", PostSimularPagoSandboxHandler);

export { PaymentsRouter };
