import Swal from "sweetalert2";

export async function confirmarAccion(
  titulo: string,
  texto: string,
  confirmButtonText: string,
  icon: "question" | "warning" = "question",
): Promise<boolean> {
  const resultado = await Swal.fire({
    title: titulo,
    text: texto,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      popup: "ob-confirm-dialog",
      title: "ob-confirm-title",
      htmlContainer: "ob-confirm-text",
      confirmButton: "ob-confirm-button",
      cancelButton: "ob-cancel-button",
    },
  });

  return resultado.isConfirmed;
}

export async function confirmarCambioEstado(
  nombre: string,
  activar: boolean,
): Promise<boolean> {
  const accion = activar ? "activar" : "desactivar";

  return confirmarAccion(
    activar ? "¿Activar usuario?" : "¿Desactivar usuario?",
    `Deseas ${accion} a "${nombre}"?`,
    activar ? "Sí, activar" : "Sí, desactivar",
    activar ? "question" : "warning",
  );
}