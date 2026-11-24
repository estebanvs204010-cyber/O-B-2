import { apiFetch } from "./api";
import { vaciarCarrito, type ItemCarrito, formatoMonedaCOP } from "./cart";

declare global {
  interface Window {
    WidgetCheckout?: any;
  }
}

let scriptPromesa: Promise<void> | null = null;

export function cargarScriptWompi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.WidgetCheckout) return Promise.resolve();
  if (scriptPromesa) return scriptPromesa;

  scriptPromesa = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      scriptPromesa = null;
      reject(new Error("Tiempo de espera agotado cargando la pasarela Wompi"));
    }, 8000);

    const script = document.createElement("script");
    script.src = "https://checkout.wompi.co/widget.js";
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      scriptPromesa = null;
      reject(new Error("No se pudo cargar el script de la pasarela de pagos Wompi"));
    };
    document.head.appendChild(script);
  });

  return scriptPromesa;
}

export interface SesionPagoWompi {
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  firmaIntegridad: string;
  publicKey: string;
  comercioValido?: boolean;
  id_pedido: number;
  total: number;
  cliente: {
    nombre: string;
    correo: string;
    telefono: string;
  };
}

export interface ResultadoCheckoutWompi {
  success: boolean;
  status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING" | "CLOSED" | "UNAUTHENTICATED";
  referencia?: string;
  idTransaccion?: string;
  mensaje?: string;
  pedido?: any;
}

/**
 * Modal interactivo de simulación de Sandbox cuando las llaves configuradas
 * son placeholders o Wompi Sandbox no las reconoce. Permite probar todo el
 * flujo de compras, reserva y descuento de stock, registro en MySQL y panel.
 */
function abrirModalSimulacionSandbox(sesion: SesionPagoWompi): Promise<ResultadoCheckoutWompi> {
  return new Promise((resolve) => {
    const modalId = "wompi-sandbox-sim-modal";
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = modalId;
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(13, 21, 38, 0.75);
      backdrop-filter: blur(4px);
      padding: 16px;
      font-family: 'Poppins', sans-serif;
      animation: obFadeIn 0.2s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: #ffffff;
        border-radius: 16px;
        max-width: 480px;
        width: 100%;
        padding: 28px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        border: 2px solid #2f6fed;
      ">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="background:#2f6fed; color:#fff; width:36px; height:36px; border-radius:8px; display:grid; place-items:center; font-weight:700;">W</div>
            <div>
              <h3 style="margin:0; font-size:17px; color:#0d1526; font-weight:700;">Wompi Sandbox · Pruebas</h3>
              <p style="margin:2px 0 0; font-size:12px; color:#64748b;">Simulador de Pasarela Bancolombia</p>
            </div>
          </div>
          <span style="background:#e0f2fe; color:#0284c7; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;">SANDBOX</span>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px; color:#475569;">
            <span>Referencia:</span>
            <strong style="font-family:monospace; color:#0d1526;">${sesion.referencia}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px; color:#475569;">
            <span>Cliente:</span>
            <strong style="color:#0d1526;">${sesion.cliente.nombre}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:15px; color:#0d1526; border-top:1px dashed #cbd5e1; padding-top:8px; margin-top:8px;">
            <span>Total a pagar:</span>
            <strong style="color:#2f6fed; font-size:18px;">${formatoMonedaCOP.format(sesion.total)}</strong>
          </div>
        </div>

        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px; font-size:12px; color:#92400e; margin-bottom:20px; line-height:1.4;">
          <strong>ℹ️ Modo Sandbox Activo:</strong> Las llaves configuradas en <code>.env</code> son de prueba local. Para abrir el widget oficial de Wompi debes vincular tus credenciales de <a href="https://comercios.wompi.co" target="_blank" style="color:#d97706; text-decoration:underline;">comercios.wompi.co</a>. Mientras tanto, puedes simular la respuesta del banco para validar la compra, el inventario y el panel:
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="simBtnApprove" type="button" style="
            background: #10b981;
            color: #fff;
            border: none;
            padding: 13px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: inherit;
          ">
            ✅ Simular Pago APROBADO (Descontar stock y registrar)
          </button>

          <button id="simBtnDecline" type="button" style="
            background: #ef4444;
            color: #fff;
            border: none;
            padding: 11px 18px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: inherit;
          ">
            ❌ Simular Pago RECHAZADO (Revertir inventario)
          </button>

          <button id="simBtnCancel" type="button" style="
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            padding: 9px 18px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            margin-top: 4px;
          ">
            Cerrar / Cancelar transacción
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const approveBtn = document.getElementById("simBtnApprove") as HTMLButtonElement;
    const declineBtn = document.getElementById("simBtnDecline") as HTMLButtonElement;
    const cancelBtn = document.getElementById("simBtnCancel") as HTMLButtonElement;

    approveBtn?.addEventListener("click", async () => {
      approveBtn.disabled = true;
      approveBtn.textContent = "Procesando pago aprobado...";
      try {
        const resp = await apiFetch<any>("/api/pagos/wompi/verificar", {
          method: "POST",
          body: JSON.stringify({
            referencia: sesion.referencia,
            idTransaccion: `SIM_${Date.now()}`,
            simulacion: true,
            estadoSimulado: "APPROVED",
          }),
        });
        vaciarCarrito();
        overlay.remove();
        resolve({
          success: true,
          status: "APPROVED",
          referencia: sesion.referencia,
          idTransaccion: `SIM_${Date.now()}`,
          pedido: resp.data,
          mensaje: "¡Pago aprobado con éxito en Sandbox! El stock fue descontado y la compra quedó registrada.",
        });
      } catch (err: any) {
        overlay.remove();
        resolve({
          success: false,
          status: "ERROR",
          referencia: sesion.referencia,
          mensaje: err?.message || "Error al confirmar simulación.",
        });
      }
    });

    declineBtn?.addEventListener("click", async () => {
      declineBtn.disabled = true;
      declineBtn.textContent = "Procesando rechazo...";
      try {
        const resp = await apiFetch<any>("/api/pagos/wompi/verificar", {
          method: "POST",
          body: JSON.stringify({
            referencia: sesion.referencia,
            idTransaccion: `SIM_${Date.now()}`,
            simulacion: true,
            estadoSimulado: "DECLINED",
          }),
        });
        overlay.remove();
        resolve({
          success: false,
          status: "DECLINED",
          referencia: sesion.referencia,
          pedido: resp.data,
          mensaje: "El pago fue rechazado. El stock reservado fue restaurado correctamente.",
        });
      } catch (err: any) {
        overlay.remove();
        resolve({
          success: false,
          status: "ERROR",
          referencia: sesion.referencia,
          mensaje: err?.message || "Error al procesar rechazo.",
        });
      }
    });

    cancelBtn?.addEventListener("click", () => {
      overlay.remove();
      resolve({
        success: false,
        status: "CLOSED",
        referencia: sesion.referencia,
        mensaje: "Pago cancelado por el usuario.",
      });
    });
  });
}

export async function procesarPagoConWompi(
  items: ItemCarrito[],
  observaciones: string = "",
): Promise<ResultadoCheckoutWompi> {
  if (items.length === 0) {
    return { success: false, status: "ERROR", mensaje: "El carrito está vacío" };
  }

  // 1. Iniciar sesión en backend Deno
  let sesion: SesionPagoWompi;
  try {
    const respuesta = await apiFetch<SesionPagoWompi>("/api/pagos/wompi/crear-sesion", {
      method: "POST",
      body: JSON.stringify({
        items: items.map((i) => ({
          id_repuesto: i.id_repuesto,
          cantidad: i.cantidad,
        })),
        observaciones: observaciones || null,
      }),
    });

    if (!respuesta.data) {
      throw new Error(respuesta.message || "No se pudo crear la sesión de pago");
    }
    sesion = respuesta.data;
  } catch (error: any) {
    if (error?.message === "Sesión expirada" || error?.status === 401) {
      return {
        success: false,
        status: "UNAUTHENTICATED",
        mensaje: "Debes iniciar sesión con tu cuenta de cliente para realizar compras.",
      };
    }
    return {
      success: false,
      status: "ERROR",
      mensaje: error instanceof Error ? error.message : "Error al comunicarse con el servidor",
    };
  }

  // 2. Si la llave de comercio de Wompi aún no está registrada en comercios.wompi.co,
  // abrimos el simulador Sandbox para que el usuario nunca se quede en bucle de carga.
  if (sesion.comercioValido === false) {
    return abrirModalSimulacionSandbox(sesion);
  }

  // 3. Cargar script de Wompi Widget oficial
  try {
    await cargarScriptWompi();
  } catch (err: any) {
    console.warn("[WOMPI] Falla al cargar script oficial, abriendo simulador:", err);
    return abrirModalSimulacionSandbox(sesion);
  }

  if (!window.WidgetCheckout) {
    return abrirModalSimulacionSandbox(sesion);
  }

  // 4. Abrir Widget Wompi Oficial
  return new Promise<ResultadoCheckoutWompi>((resolve) => {
    try {
      const checkout = new window.WidgetCheckout({
        currency: sesion.moneda || "COP",
        amountInCents: sesion.montoEnCentavos,
        reference: sesion.referencia,
        publicKey: sesion.publicKey,
        signature: {
          integrity: sesion.firmaIntegridad,
        },
        redirectUrl: `${window.location.origin}/cliente/pagos?referencia=${encodeURIComponent(sesion.referencia)}`,
        customerData: {
          email: sesion.cliente.correo,
          fullName: sesion.cliente.nombre,
          phoneNumber: (sesion.cliente.telefono || "").replace(/\D/g, "").slice(-10),
          phoneNumberPrefix: "+57",
        },
      });

      checkout.open(async (result: any) => {
        const transaccion = result?.transaction;
        if (!transaccion) {
          resolve({
            success: false,
            status: "CLOSED",
            referencia: sesion.referencia,
            mensaje: "Pago cancelado o cerrado por el usuario.",
          });
          return;
        }

        const transaccionId = transaccion.id;
        const statusTransaccion = (transaccion.status || "PENDING").toUpperCase();

        try {
          const respVerif = await apiFetch<any>("/api/pagos/wompi/verificar", {
            method: "POST",
            body: JSON.stringify({
              referencia: sesion.referencia,
              idTransaccion: transaccionId,
            }),
          });

          if (statusTransaccion === "APPROVED") {
            vaciarCarrito();
          }

          resolve({
            success: statusTransaccion === "APPROVED",
            status: statusTransaccion as any,
            referencia: sesion.referencia,
            idTransaccion: transaccionId,
            pedido: respVerif.data,
            mensaje:
              statusTransaccion === "APPROVED"
                ? "¡Pago aprobado con éxito!"
                : statusTransaccion === "PENDING"
                ? "Tu pago se encuentra pendiente de confirmación."
                : "El pago fue rechazado por la entidad financiera.",
          });
        } catch {
          if (statusTransaccion === "APPROVED") {
            vaciarCarrito();
          }
          resolve({
            success: statusTransaccion === "APPROVED",
            status: statusTransaccion as any,
            referencia: sesion.referencia,
            idTransaccion: transaccionId,
            mensaje: "Transacción procesada en Wompi.",
          });
        }
      });
    } catch {
      // Si el widget arroja excepción al instanciar, fallback al simulador
      resolve(abrirModalSimulacionSandbox(sesion));
    }
  });
}
