import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";
import {
  GetDisponibilidad,
  GetListarCitas,
  GetMisCitas,
  PatchCancelarCita,
  PatchCompletarCita,
  PatchConfirmarCita,
  PatchElegirHorario,
  PatchRechazarCita,
  PostCrearCita,
} from "../Controller/citaController.ts";

const CitaRouter = new Router();

// --- Cliente ---
CitaRouter.get("/api/citas/disponibilidad", authMiddleware, GetDisponibilidad);
CitaRouter.get("/api/citas/mias", authMiddleware, GetMisCitas);
CitaRouter.post("/api/citas", authMiddleware, PostCrearCita);
CitaRouter.patch("/api/citas/:id/elegir-horario", authMiddleware, PatchElegirHorario);
CitaRouter.patch("/api/citas/:id/cancelar", authMiddleware, PatchCancelarCita);

// --- Admin / Mecanico ---
CitaRouter.get("/api/citas", authMiddleware, permitirRoles("Admin", "Mecanico"), GetListarCitas);
CitaRouter.patch("/api/citas/:id/confirmar", authMiddleware, permitirRoles("Admin"), PatchConfirmarCita);
CitaRouter.patch("/api/citas/:id/rechazar", authMiddleware, permitirRoles("Admin"), PatchRechazarCita);
CitaRouter.patch("/api/citas/:id/completar", authMiddleware, permitirRoles("Admin", "Mecanico"), PatchCompletarCita);

export { CitaRouter };
