import { Context } from "../Dependencies/dependencias.ts";
import { conexion } from "../Model/conexion.ts";
import {
  obtenerConfiguracionWompi,
  generarReferenciaUnica,
  calcularFirmaIntegridad,
  consultarTransaccionWompi,
  validarChecksumEvento,
  verificarComercioWompi,
} from "../Helpers/wompiService.ts";

interface UsuarioJwt {
  sub?: string;
}

function obtenerIdUsuario(ctx: Context): number | null {
  const usuario = ctx.state.user as UsuarioJwt | undefined;
  const idUsuario = Number(usuario?.sub);
  return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

export const GetConfiguracionWompi = (ctx: Context) => {
  const { publicKey, apiUrl } = obtenerConfiguracionWompi();
  ctx.response.status = 200;
  ctx.response.body = {
    success: true,
    data: {
      publicKey,
      apiUrl,
    },
  };
};

export const PostCrearSesionPago = async (ctx: Context) => {
  const { request, response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = { success: false, message: "Usuario no autenticado" };
    return;
  }

  try {
    const [cliente] = await conexion.query(
      `SELECT id_cliente, nombre_completo, correo, telefono 
       FROM clientes 
       WHERE id_usuario = ? AND activo = 1`,
      [idUsuario],
    );

    if (!cliente) {
      response.status = 404;
      response.body = { success: false, message: "Perfil de cliente no encontrado" };
      return;
    }

    const idCliente = Number(cliente.id_cliente);
    const body = await request.body.json();
    const itemsRaw = Array.isArray(body.items) ? body.items : [];
    const observaciones = typeof body.observaciones === "string"
      ? body.observaciones.trim().slice(0, 300)
      : null;

    if (itemsRaw.length === 0) {
      response.status = 400;
      response.body = { success: false, message: "El carrito está vacío" };
      return;
    }

    // Agrupar cantidades por id_repuesto
    const cantidades = new Map<number, number>();
    for (const item of itemsRaw) {
      const idRep = Number(item.id_repuesto);
      const cant = Number(item.cantidad);
      if (Number.isInteger(idRep) && idRep > 0 && Number.isInteger(cant) && cant > 0) {
        cantidades.set(idRep, (cantidades.get(idRep) ?? 0) + cant);
      }
    }

    if (cantidades.size === 0) {
      response.status = 400;
      response.body = { success: false, message: "No hay productos válidos en el pedido" };
      return;
    }

    const referencia = generarReferenciaUnica();

    // Transacción MySQL para validar stock y registrar pedido
    const resultado = await conexion.transaction(async (conn) => {
      const lineas: {
        id_repuesto: number;
        nombre: string;
        cantidad: number;
        precio_unitario: number;
        stock_actual: number;
      }[] = [];

      let total = 0;

      for (const [idRepuesto, cantidad] of cantidades) {
        const filas = await conn.query(
          `SELECT id_repuesto, nombre, precio_unitario, stock_actual, activo
           FROM repuestos
           WHERE id_repuesto = ?
           FOR UPDATE`,
          [idRepuesto],
        );
        const repuesto = Array.isArray(filas) ? filas[0] : undefined;

        if (!repuesto || !repuesto.activo) {
          return {
            error: true,
            message: `El repuesto seleccionado (${repuesto?.nombre ?? idRepuesto}) ya no está disponible`,
          };
        }

        if (Number(repuesto.stock_actual) < cantidad) {
          return {
            error: true,
            message: `Stock insuficiente para "${repuesto.nombre}". Disponibles: ${repuesto.stock_actual}, solicitados: ${cantidad}`,
          };
        }

        const precio = Number(repuesto.precio_unitario);
        total += precio * cantidad;

        lineas.push({
          id_repuesto: idRepuesto,
          nombre: String(repuesto.nombre),
          cantidad,
          precio_unitario: precio,
          stock_actual: Number(repuesto.stock_actual),
        });
      }

      if (total <= 0) {
        return { error: true, message: "El total del pedido no es válido" };
      }

      // 1. Insertar pedido en estado Pendiente
      const resPedido = await conn.execute(
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
        [idCliente, referencia, observaciones, total, total],
      );
      const idPedido = Number(resPedido.lastInsertId);

      // 2. Insertar detalles y reservar stock
      for (const linea of lineas) {
        const subtotalLinea = linea.precio_unitario * linea.cantidad;

        await conn.execute(
          `INSERT INTO pedidodetalle (
             id_pedido,
             id_repuesto,
             cantidad,
             precio_unitario,
             subtotal
           ) VALUES (?, ?, ?, ?, ?)`,
          [idPedido, linea.id_repuesto, linea.cantidad, linea.precio_unitario, subtotalLinea],
        );

        // Descontar inventario preventivamente
        await conn.execute(
          `UPDATE repuestos 
           SET stock_actual = stock_actual - ? 
           WHERE id_repuesto = ?`,
          [linea.cantidad, linea.id_repuesto],
        );

        await conn.execute(
          `INSERT INTO movimientosinventario (
             id_repuesto,
             id_usuario,
             tipo_movimiento,
             cantidad,
             stock_anterior,
             stock_nuevo,
             motivo
           ) VALUES (?, ?, 'Salida', ?, ?, ?, ?)`,
          [
            linea.id_repuesto,
            idUsuario,
            linea.cantidad,
            linea.stock_actual,
            linea.stock_actual - linea.cantidad,
            `Reserva compra Wompi ref ${referencia} (pedido #${idPedido})`,
          ],
        );
      }

      // 3. Monto en centavos para Wompi (1 COP = 100 centavos)
      const montoEnCentavos = Math.round(total * 100);
      const firmaIntegridad = await calcularFirmaIntegridad(referencia, montoEnCentavos, "COP");

      // 4. Registrar en transacciones_wompi
      await conn.execute(
        `INSERT INTO transacciones_wompi (
           id_pedido,
           id_cliente,
           referencia,
           monto_en_centavos,
           moneda,
           estado,
           firma_integridad
         ) VALUES (?, ?, ?, ?, 'COP', 'PENDING', ?)`,
        [idPedido, idCliente, referencia, montoEnCentavos, firmaIntegridad],
      );

      return {
        error: false,
        idPedido,
        total,
        montoEnCentavos,
        firmaIntegridad,
      };
    });

    if (resultado.error) {
      response.status = 400;
      response.body = { success: false, message: resultado.message };
      return;
    }

    const { publicKey } = obtenerConfiguracionWompi();
    const comercioValido = await verificarComercioWompi(publicKey);

    response.status = 201;
    response.body = {
      success: true,
      data: {
        referencia,
        montoEnCentavos: resultado.montoEnCentavos,
        moneda: "COP",
        firmaIntegridad: resultado.firmaIntegridad,
        publicKey,
        comercioValido,
        id_pedido: resultado.idPedido,
        total: resultado.total,
        cliente: {
          nombre: cliente.nombre_completo,
          correo: cliente.correo,
          telefono: cliente.telefono,
        },
      },
    };
  } catch (error) {
    console.error("[WOMPI CREAR SESION] Error:", error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "Error al iniciar sesión de pago con Wompi",
    };
  }
};

export const PostVerificarPago = async (ctx: Context) => {
  const { request, response } = ctx;
  const idUsuario = obtenerIdUsuario(ctx);

  if (!idUsuario) {
    response.status = 401;
    response.body = { success: false, message: "Usuario no autenticado" };
    return;
  }

  try {
    const body = await request.body.json();
    const referencia = String(body.referencia ?? "").trim();
    const idTransaccion = body.idTransaccion ? String(body.idTransaccion).trim() : null;

    if (!referencia) {
      response.status = 400;
      response.body = { success: false, message: "La referencia de pago es requerida" };
      return;
    }

    // Buscar pedido y transacción asociada
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido, p.id_cliente, p.estado, p.estado_transaccion, 
              p.referencia_pago, p.id_transaccion_wompi, p.total, c.id_usuario
       FROM pedidosrepuesto p
       INNER JOIN clientes c ON c.id_cliente = p.id_cliente
       WHERE p.referencia_pago = ?`,
      [referencia],
    );

    if (!pedido) {
      response.status = 404;
      response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }

    // Verificar pertenencia o permiso
    if (pedido.id_usuario !== idUsuario) {
      response.status = 403;
      response.body = { success: false, message: "No tienes permiso para consultar este pedido" };
      return;
    }

    let estadoFinal = pedido.estado_transaccion || "PENDING";
    let metodoPagoTipo: string | null = null;
    let datosWompi: any = null;

    // Soporte para simulación de Sandbox cuando las llaves son de prueba
    const esSimulacion = Boolean(body.simulacion) || (idTransaccion && idTransaccion.startsWith("SIM_"));
    if (esSimulacion && body.estadoSimulado) {
      estadoFinal = String(body.estadoSimulado).toUpperCase() === "APPROVED" ? "APPROVED" : "DECLINED";
      metodoPagoTipo = "SIMULATED_SANDBOX";
      datosWompi = {
        id: idTransaccion || `SIM_${Date.now()}`,
        status: estadoFinal,
        payment_method_type: metodoPagoTipo,
        simulated: true,
      };
      if (estadoFinal === "APPROVED" && pedido.estado !== "Pagado") {
        await conexion.execute(
          `UPDATE pedidosrepuesto
           SET estado = 'Pagado',
               estado_transaccion = 'APPROVED',
               id_transaccion_wompi = ?,
               fecha_actualizacion = NOW()
           WHERE id_pedido = ?`,
          [datosWompi.id, pedido.id_pedido],
        );
        await conexion.execute(
          `UPDATE transacciones_wompi
           SET estado = 'APPROVED',
               id_transaccion_wompi = ?,
               metodo_pago_tipo = ?,
               respuesta_wompi = ?,
               fecha_actualizacion = NOW()
           WHERE referencia = ?`,
          [datosWompi.id, metodoPagoTipo, JSON.stringify(datosWompi), referencia],
        );
      } else if (estadoFinal === "DECLINED" && pedido.estado === "Pendiente") {
        await conexion.transaction(async (conn) => {
          const detalles = await conn.query(
            `SELECT id_repuesto, cantidad FROM pedidodetalle WHERE id_pedido = ?`,
            [pedido.id_pedido],
          );
          if (Array.isArray(detalles)) {
            for (const d of detalles) {
              const [rep] = await conn.query(
                `SELECT stock_actual FROM repuestos WHERE id_repuesto = ? FOR UPDATE`,
                [d.id_repuesto],
              );
              const stockPrev = Number(rep?.stock_actual ?? 0);
              await conn.execute(
                `UPDATE repuestos SET stock_actual = stock_actual + ? WHERE id_repuesto = ?`,
                [d.cantidad, d.id_repuesto],
              );
              await conn.execute(
                `INSERT INTO movimientosinventario (
                   id_repuesto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo
                 ) VALUES (?, ?, 'Entrada', ?, ?, ?, ?)`,
                [
                  d.id_repuesto,
                  idUsuario,
                  d.cantidad,
                  stockPrev,
                  stockPrev + d.cantidad,
                  `Reversión compra simulada Wompi ref ${referencia}`,
                ],
              );
            }
          }
          await conn.execute(
            `UPDATE pedidosrepuesto 
             SET estado = 'Cancelado', estado_transaccion = 'DECLINED', id_transaccion_wompi = ? 
             WHERE id_pedido = ?`,
            [datosWompi.id, pedido.id_pedido],
          );
          await conn.execute(
            `UPDATE transacciones_wompi
             SET estado = 'DECLINED', id_transaccion_wompi = ?, respuesta_wompi = ?
             WHERE referencia = ?`,
            [datosWompi.id, JSON.stringify(datosWompi), referencia],
          );
        });
      }
    } else if (idTransaccion) {
      try {
        datosWompi = await consultarTransaccionWompi(idTransaccion);
        if (datosWompi && datosWompi.status) {
          estadoFinal = datosWompi.status;
          metodoPagoTipo = datosWompi.payment_method_type || null;

          // Si Wompi lo aprobó y el pedido aún no estaba pagado, marcar como pagado
          if (estadoFinal === "APPROVED" && pedido.estado !== "Pagado") {
            await conexion.execute(
              `UPDATE pedidosrepuesto
               SET estado = 'Pagado',
                   estado_transaccion = 'APPROVED',
                   id_transaccion_wompi = ?,
                   fecha_actualizacion = NOW()
               WHERE id_pedido = ?`,
              [idTransaccion, pedido.id_pedido],
            );

            await conexion.execute(
              `UPDATE transacciones_wompi
               SET estado = 'APPROVED',
                   id_transaccion_wompi = ?,
                   metodo_pago_tipo = ?,
                   respuesta_wompi = ?,
                   fecha_actualizacion = NOW()
               WHERE referencia = ?`,
              [idTransaccion, metodoPagoTipo, JSON.stringify(datosWompi), referencia],
            );
          } else if (
            (estadoFinal === "DECLINED" || estadoFinal === "VOIDED" || estadoFinal === "ERROR") &&
            pedido.estado === "Pendiente"
          ) {
            // Revertir inventario si el pago falló definitivamente
            await conexion.transaction(async (conn) => {
              const detalles = await conn.query(
                `SELECT id_repuesto, cantidad FROM pedidodetalle WHERE id_pedido = ?`,
                [pedido.id_pedido],
              );

              if (Array.isArray(detalles)) {
                for (const d of detalles) {
                  const [rep] = await conn.query(
                    `SELECT stock_actual FROM repuestos WHERE id_repuesto = ? FOR UPDATE`,
                    [d.id_repuesto],
                  );
                  const stockPrev = Number(rep?.stock_actual ?? 0);

                  await conn.execute(
                    `UPDATE repuestos SET stock_actual = stock_actual + ? WHERE id_repuesto = ?`,
                    [d.cantidad, d.id_repuesto],
                  );

                  await conn.execute(
                    `INSERT INTO movimientosinventario (
                       id_repuesto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo
                     ) VALUES (?, ?, 'Entrada', ?, ?, ?, ?)`,
                    [
                      d.id_repuesto,
                      idUsuario,
                      d.cantidad,
                      stockPrev,
                      stockPrev + d.cantidad,
                      `Reversión por pago rechazado Wompi ref ${referencia}`,
                    ],
                  );
                }
              }

              await conn.execute(
                `UPDATE pedidosrepuesto 
                 SET estado = 'Cancelado', estado_transaccion = ?, id_transaccion_wompi = ? 
                 WHERE id_pedido = ?`,
                [estadoFinal, idTransaccion, pedido.id_pedido],
              );

              await conn.execute(
                `UPDATE transacciones_wompi
                 SET estado = ?, id_transaccion_wompi = ?, respuesta_wompi = ?
                 WHERE referencia = ?`,
                [estadoFinal, idTransaccion, JSON.stringify(datosWompi), referencia],
              );
            });
          }
        }
      } catch (errWompi) {
        console.warn("[VERIFICAR WOMPI API] Aviso al consultar Wompi:", errWompi);
      }
    }

    // Traer el detalle actualizado
    const [pedidoActualizado] = await conexion.query(
      `SELECT id_pedido, estado, metodo_pago, referencia_pago, 
              id_transaccion_wompi, estado_transaccion, total, fecha_pedido
       FROM pedidosrepuesto
       WHERE id_pedido = ?`,
      [pedido.id_pedido],
    );

    const detalles = await conexion.query(
      `SELECT d.id_repuesto, d.cantidad, d.precio_unitario, d.subtotal,
              r.nombre, r.referencia, r.imagen_url
       FROM pedidodetalle d
       INNER JOIN repuestos r ON r.id_repuesto = d.id_repuesto
       WHERE d.id_pedido = ?`,
      [pedido.id_pedido],
    );

    response.status = 200;
    response.body = {
      success: true,
      data: {
        ...pedidoActualizado,
        items: detalles,
        wompi: {
          estado: estadoFinal,
          idTransaccion: idTransaccion || pedido.id_transaccion_wompi,
        },
      },
    };
  } catch (error) {
    console.error("[WOMPI VERIFICAR] Error:", error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "Error al verificar transacción",
    };
  }
};

export const PostWebhookWompi = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const rawBody = await request.body.json();
    const checksum = request.headers.get("x-event-checksum") ?? rawBody?.signature?.checksum;

    const valido = await validarChecksumEvento(rawBody, checksum);
    if (!valido) {
      console.warn("[WOMPI WEBHOOK] Checksum inválido recibido en evento");
    }

    const eventData = rawBody?.data?.transaction;
    if (eventData && eventData.reference && eventData.status) {
      const referencia = eventData.reference;
      const status = eventData.status;
      const transaccionId = eventData.id;

      if (status === "APPROVED") {
        await conexion.execute(
          `UPDATE pedidosrepuesto
           SET estado = 'Pagado',
               estado_transaccion = 'APPROVED',
               id_transaccion_wompi = ?,
               fecha_actualizacion = NOW()
           WHERE referencia_pago = ? AND estado <> 'Pagado'`,
          [transaccionId, referencia],
        );

        await conexion.execute(
          `UPDATE transacciones_wompi
           SET estado = 'APPROVED',
               id_transaccion_wompi = ?,
               respuesta_wompi = ?,
               fecha_actualizacion = NOW()
           WHERE referencia = ?`,
          [transaccionId, JSON.stringify(rawBody), referencia],
        );
      }
    }

    response.status = 200;
    response.body = { received: true };
  } catch (error) {
    console.error("[WOMPI WEBHOOK] Error procesando evento:", error);
    response.status = 200;
    response.body = { received: false, error: "Internal processing error" };
  }
};
