/**
 * Carrito de compras unificado para OptimusByte.
 * Se sincroniza en localStorage y emite eventos globales para actualizar la UI en tiempo real.
 */

export interface ItemCarrito {
  id_repuesto: number;
  nombre: string;
  referencia: string;
  categoria: string;
  precio_unitario: number;
  cantidad: number;
  stock_actual: number;
  imagen_url?: string | null;
}

const STORAGE_KEY = "optimusbyte_carrito_v2";

export function obtenerCarrito(): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function guardarCarrito(items: ItemCarrito[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("optimusbyte:cart_updated", { detail: { items } }));
  } catch (error) {
    console.error("Error al guardar carrito:", error);
  }
}

export function agregarAlCarrito(producto: {
  id_repuesto: number;
  nombre: string;
  referencia: string;
  categoria?: string;
  precio_unitario: number;
  stock_actual: number;
  imagen_url?: string | null;
}, cantidad: number = 1): { success: boolean; mensaje?: string } {
  const carrito = obtenerCarrito();
  const existente = carrito.find((i) => i.id_repuesto === producto.id_repuesto);

  const stockMax = Math.max(0, Number(producto.stock_actual) || 0);
  if (stockMax <= 0) {
    return { success: false, mensaje: "Producto agotado" };
  }

  const cantidadActual = existente ? existente.cantidad : 0;
  const nuevaCantidad = cantidadActual + cantidad;

  if (nuevaCantidad > stockMax) {
    return {
      success: false,
      mensaje: `Solo hay ${stockMax} unidad(es) disponible(s) de "${producto.nombre}"`,
    };
  }

  if (existente) {
    existente.cantidad = nuevaCantidad;
    existente.stock_actual = stockMax;
    existente.precio_unitario = Number(producto.precio_unitario);
  } else {
    carrito.push({
      id_repuesto: producto.id_repuesto,
      nombre: producto.nombre,
      referencia: producto.referencia,
      categoria: producto.categoria || "Repuesto",
      precio_unitario: Number(producto.precio_unitario),
      cantidad: Math.max(1, cantidad),
      stock_actual: stockMax,
      imagen_url: producto.imagen_url || null,
    });
  }

  guardarCarrito(carrito);
  return { success: true };
}

export function modificarCantidad(id_repuesto: number, delta: number): void {
  const carrito = obtenerCarrito();
  const index = carrito.findIndex((i) => i.id_repuesto === id_repuesto);
  if (index === -1) return;

  const item = carrito[index];
  const nuevaCantidad = item.cantidad + delta;

  if (nuevaCantidad <= 0) {
    carrito.splice(index, 1);
  } else {
    item.cantidad = Math.min(nuevaCantidad, item.stock_actual);
  }

  guardarCarrito(carrito);
}

export function eliminarDelCarrito(id_repuesto: number): void {
  const carrito = obtenerCarrito().filter((i) => i.id_repuesto !== id_repuesto);
  guardarCarrito(carrito);
}

export function vaciarCarrito(): void {
  guardarCarrito([]);
}

export function calcularTotalCarrito(): number {
  return obtenerCarrito().reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0);
}

export function contarItemsCarrito(): number {
  return obtenerCarrito().reduce((acc, item) => acc + item.cantidad, 0);
}

export const formatoMonedaCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
