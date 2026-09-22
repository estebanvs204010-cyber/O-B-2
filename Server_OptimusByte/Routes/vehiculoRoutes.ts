import { Router } from "../Dependencies/dependencias.ts";
import {
    PostCrearVehiculo,
    GetVehiculos,
    GetVehiculoPorId,
    PutEditarVehiculo,
    DeleteVehiculo,
} from "../Controller/vehiculoController.ts";
import { authMiddleware, permitirRoles } from "../Middlewares/validarJWT.ts";

const VehiculoRouter = new Router();

VehiculoRouter.post("/api/vehiculos", authMiddleware, permitirRoles("Admin", "Mecanico"), PostCrearVehiculo);
VehiculoRouter.get("/api/vehiculos", authMiddleware, permitirRoles("Admin", "Mecanico"), GetVehiculos);
VehiculoRouter.get("/api/vehiculos/:id", authMiddleware, permitirRoles("Admin", "Mecanico"), GetVehiculoPorId);
VehiculoRouter.put("/api/vehiculos/:id", authMiddleware, permitirRoles("Admin", "Mecanico"), PutEditarVehiculo);
VehiculoRouter.delete("/api/vehiculos/:id", authMiddleware, permitirRoles("Admin"), DeleteVehiculo);

export { VehiculoRouter };