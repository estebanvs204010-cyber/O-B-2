import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

type TipoToast = "success" | "error" | "warning" | "info";

export function notificar(mensaje: string, tipo: TipoToast = "info") {
  Toastify({
    text: mensaje,
    duration: 4000,
    close: true,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    className: `ob-toast ob-toast--${tipo}`,
  }).showToast();
}

export function notificarExito(mensaje: string) {
  notificar(mensaje, "success");
}

export function notificarError(mensaje: string) {
  notificar(mensaje, "error");
}

export function notificarAdvertencia(mensaje: string) {
  notificar(mensaje, "warning");
}