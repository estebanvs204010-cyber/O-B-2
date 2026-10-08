import Swal from "sweetalert2";

export async function confirmarCambioEstado(
  nombre: string,
  activar: boolean,
): Promise<boolean> {
  const accion = activar ? "activar" : "desactivar";

  const resultado = await Swal.fire({
    title: activar ? "¿Activar usuario?" : "¿Desactivar usuario?",
    text: `Deseas ${accion} a "${nombre}"?`,
    icon: activar ? "question" : "warning",
    showCancelButton: true,
    confirmButtonText: activar ? "Sí, activar" : "Sí, desactivar",
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