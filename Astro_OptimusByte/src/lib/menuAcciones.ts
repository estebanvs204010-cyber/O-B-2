import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";

interface AccionMenu {
  etiqueta: string;
  variante?: "normal" | "danger" | "success";
  alSeleccionar: () => void;
}

let limpiarMenuAbierto: (() => void) | null = null;
let botonActivo: HTMLButtonElement | null = null;

function cerrarMenuAcciones() {
  limpiarMenuAbierto?.();
  limpiarMenuAbierto = null;
  botonActivo = null;
}

export function abrirMenuAcciones(
  boton: HTMLButtonElement,
  acciones: AccionMenu[],
) {
  if (botonActivo === boton) {
    cerrarMenuAcciones();
    return;
  }

  cerrarMenuAcciones();
  botonActivo = boton;

  const menu = document.createElement("div");
  menu.className = "ob-actions-menu";
  menu.setAttribute("role", "menu");

  acciones.forEach((accion) => {
    const item = document.createElement("button");

    item.type = "button";
    item.textContent = accion.etiqueta;
    item.className = `ob-actions-menu-item ${accion.variante ?? "normal"}`;
    item.setAttribute("role", "menuitem");

    item.addEventListener("click", () => {
      cerrarMenuAcciones();
      accion.alSeleccionar();
    });

    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  const actualizarPosicion = () => {
    computePosition(boton, menu, {
      placement: "bottom-end",
      strategy: "fixed",
      middleware: [
        offset(8),
        flip(),
        shift({ padding: 8 }),
      ],
    }).then(({ x, y }) => {
      Object.assign(menu.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  };

  const detenerActualizacion = autoUpdate(
    boton,
    menu,
    actualizarPosicion,
  );

  const cerrarAlHacerClicFuera = (evento: MouseEvent) => {
    const objetivo = evento.target as Node;

    if (!menu.contains(objetivo) && objetivo !== boton) {
      cerrarMenuAcciones();
    }
  };

  const cerrarConEscape = (evento: KeyboardEvent) => {
    if (evento.key === "Escape") {
      cerrarMenuAcciones();
    }
  };

  setTimeout(() => {
    document.addEventListener("click", cerrarAlHacerClicFuera);
  }, 0);

  document.addEventListener("keydown", cerrarConEscape);

  limpiarMenuAbierto = () => {
    detenerActualizacion();
    document.removeEventListener("click", cerrarAlHacerClicFuera);
    document.removeEventListener("keydown", cerrarConEscape);
    menu.remove();
  };
}