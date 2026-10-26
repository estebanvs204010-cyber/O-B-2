import { Router } from "../Dependencies/dependencias.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";
import { GetFirmaSubida } from "../Controller/uploadController.ts";

const UploadRouter = new Router();

UploadRouter.get(
  "/api/uploads/firma",
  authMiddleware,
  permitirRoles("Admin", "Mecanico", "Cliente"),
  GetFirmaSubida,
);

export { UploadRouter };