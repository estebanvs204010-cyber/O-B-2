import { conexion } from "./conexion.ts";

export interface ItemPedido {
    id_repuesto: number;
    cantidad: number;
}

export interface DatosPedido {
    items: ItemPedido[];
    metodo_pago: string;
    observaciones?: string | null;
}

export class PedidoRepuesto {
    // ---------- Catálogo que ve el cliente (solo repuestos activos) ----------
    public async ListarCatalogo() {
        return await conexion.query(
            `SELECT id_repuesto, referencia, nombre, descripcion, categoria,
                    precio_unitario, stock_actual, marca, modelo, imagen_url
             FROM repuestos
             WHERE activo = 1
             ORDER BY categoria, nombre`,
        );
    }

    // ---------- De usuario (token) a cliente ----------
    public async ObtenerIdCliente(idUsuario: number): Promise<number | null> {
        const [cliente] = await conexion.query(
            `SELECT id_cliente FROM clientes WHERE id_usuario = ? AND activo = 1`,
            [idUsuario],
        );
        return cliente ? Number(cliente.id_cliente) : null;
    }

    // ---------- Crear pedido: valida stock, descuenta y deja historial ----------
    public async Crear(idCliente: number, idUsuario: number, datos: DatosPedido) {
        // Unir líneas repetidas del mismo repuesto
        const cantidades = new Map<number, number>();
        for (const item of datos.items) {
            cantidades.set(
                item.id_repuesto,
                (cantidades.get(item.id_repuesto) ?? 0) + item.cantidad,
            );
        }

        return await conexion.transaction(async (conn) => {
            // 1) Bloquear filas y validar TODO antes de escribir nada
            const lineas: {
                id_repuesto: number;
                nombre: string;
                cantidad: number;
                precio: number;
                stock: number;
            }[] = [];

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
                    return { success: false, message: "Uno de los repuestos ya no está disponible" };
                }
                if (repuesto.stock_actual < cantidad) {
                    return {
                        success: false,
                        message: `Stock insuficiente de "${repuesto.nombre}" (disponibles: ${repuesto.stock_actual})`,
                    };
                }

                lineas.push({
                    id_repuesto: idRepuesto,
                    nombre: repuesto.nombre,
                    cantidad,
                    // El precio SIEMPRE sale de la base de datos, nunca del navegador
                    precio: Number(repuesto.precio_unitario),
                    stock: Number(repuesto.stock_actual),
                });
            }

            // 2) Cabecera del pedido
            const cabecera = await conn.execute(
                `INSERT INTO pedidosrepuesto (id_cliente, metodo_pago, observaciones)
                 VALUES (?, ?, ?)`,
                [idCliente, datos.metodo_pago, datos.observaciones || null],
            );
            const idPedido = Number(cabecera.lastInsertId);

            // 3) Detalle + descuento de stock + movimiento de inventario
            let total = 0;
            for (const l of lineas) {
                const subtotal = l.precio * l.cantidad;
                total += subtotal;

                await conn.execute(
                    `INSERT INTO pedidodetalle (id_pedido, id_repuesto, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [idPedido, l.id_repuesto, l.cantidad, l.precio, subtotal],
                );

                await conn.execute(
                    `UPDATE repuestos SET stock_actual = stock_actual - ? WHERE id_repuesto = ?`,
                    [l.cantidad, l.id_repuesto],
                );

                await conn.execute(
                    `INSERT INTO movimientosinventario
                        (id_repuesto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo)
                     VALUES (?, ?, 'Salida', ?, ?, ?, ?)`,
                    [
                        l.id_repuesto,
                        idUsuario,
                        l.cantidad,
                        l.stock,
                        l.stock - l.cantidad,
                        `Venta pedido #${idPedido}`,
                    ],
                );
            }

            await conn.execute(
                `UPDATE pedidosrepuesto SET total = ? WHERE id_pedido = ?`,
                [total, idPedido],
            );

            return {
                success: true,
                message: "Pedido registrado correctamente",
                data: { id_pedido: idPedido, total },
            };
        });
    }

    // ---------- Historial del cliente (con sus líneas) ----------
    public async ListarPorCliente(idCliente: number) {
        const pedidos = await conexion.query(
            `SELECT id_pedido, estado, metodo_pago, observaciones, total, fecha_pedido
             FROM pedidosrepuesto
             WHERE id_cliente = ?
             ORDER BY fecha_pedido DESC`,
            [idCliente],
        );

        if (!pedidos.length) return [];

        const ids = pedidos.map((p: { id_pedido: number }) => p.id_pedido);
        const detalles = await conexion.query(
            `SELECT d.id_pedido, d.id_repuesto, d.cantidad, d.precio_unitario, d.subtotal,
                    r.nombre, r.referencia, r.imagen_url
             FROM pedidodetalle d
             INNER JOIN repuestos r ON r.id_repuesto = d.id_repuesto
             WHERE d.id_pedido IN (${ids.map(() => "?").join(",")})`,
            ids,
        );

        return pedidos.map((p: { id_pedido: number }) => ({
            ...p,
            items: detalles.filter((d: { id_pedido: number }) => d.id_pedido === p.id_pedido),
        }));
    }

    // ---------- Cancelar (solo dueño y solo si sigue Pendiente): devuelve el stock ----------
    public async Cancelar(idCliente: number, idUsuario: number, idPedido: number) {
        return await conexion.transaction(async (conn) => {
            const filas = await conn.query(
                `SELECT id_pedido, estado
                 FROM pedidosrepuesto
                 WHERE id_pedido = ? AND id_cliente = ?
                 FOR UPDATE`,
                [idPedido, idCliente],
            );
            const pedido = Array.isArray(filas) ? filas[0] : undefined;

            if (!pedido) {
                return { success: false, message: "El pedido no existe" };
            }
            if (pedido.estado !== "Pendiente") {
                return { success: false, message: "Solo se pueden cancelar pedidos pendientes" };
            }

            const detalles = await conn.query(
                `SELECT id_repuesto, cantidad FROM pedidodetalle WHERE id_pedido = ?`,
                [idPedido],
            );

            if (!Array.isArray(detalles)) {
                throw new Error("No se pudieron consultar los detalles del pedido");
            }

            for (const d of detalles) {
                const filasRep = await conn.query(
                    `SELECT stock_actual FROM repuestos WHERE id_repuesto = ? FOR UPDATE`,
                    [d.id_repuesto],
                );
                const rep = Array.isArray(filasRep) ? filasRep[0] : undefined;
                const stockAnterior = Number(rep?.stock_actual ?? 0);

                await conn.execute(
                    `UPDATE repuestos SET stock_actual = stock_actual + ? WHERE id_repuesto = ?`,
                    [d.cantidad, d.id_repuesto],
                );

                await conn.execute(
                    `INSERT INTO movimientosinventario
                        (id_repuesto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo)
                     VALUES (?, ?, 'Entrada', ?, ?, ?, ?)`,
                    [
                        d.id_repuesto,
                        idUsuario,
                        d.cantidad,
                        stockAnterior,
                        stockAnterior + d.cantidad,
                        `Cancelación pedido #${idPedido}`,
                    ],
                );
            }

            await conn.execute(
                `UPDATE pedidosrepuesto
                 SET estado = 'Cancelado', fecha_actualizacion = NOW()
                 WHERE id_pedido = ?`,
                [idPedido],
            );

            return { success: true, message: "Pedido cancelado y stock restituido" };
        });
    }
}
