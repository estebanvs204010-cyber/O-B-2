import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { Vehiculo } from "../Model/vehiculoModel.ts";




// POST /api/vehiculos  (Admin o Mecanico)
export const PostCrearVehiculo = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const body = await request.body.json();

        const camposObligatorios = ["id_cliente", "placa", "marca", "modelo", "anio"];
        for (const campo of camposObligatorios) {
            if (!body[campo]) {
                response.status = 400;
                response.body = { success: false, message: `El campo ${campo} es obligatorio` };
                return;
            }
        }

        const objVehiculo = new Vehiculo();
        const resultado = await objVehiculo.Crear(body);

        response.status = resultado.success ? 201 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// GET /api/vehiculos            -> todos
// GET /api/vehiculos?id_cliente=5 -> solo los de ese cliente
export const GetVehiculos = async (ctx: Context) => {
    const { request, response } = ctx;

    try {
        const idClienteParam = request.url.searchParams.get("id_cliente");
        const objVehiculo = new Vehiculo();

        const vehiculos = idClienteParam
            ? await objVehiculo.ListarPorCliente(Number(idClienteParam))
            : await objVehiculo.Listar();

        response.status = 200;
        response.body = { success: true, data: vehiculos };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};


// GET /api/vehiculos/:id  (Admin o Mecanico)
export const GetVehiculoPorId = async (ctx: RouterContext<"/api/vehiculos/:id">) => {
    const { params, response } = ctx;

    try {
        const id = Number(params.id);
        const objVehiculo = new Vehiculo();
        const vehiculo = await objVehiculo.ObtenerPorId(id);

        if (!vehiculo) {
            response.status = 404;
            response.body = { success: false, message: "Vehículo no encontrado" };
            return;
        }

        response.status = 200;
        response.body = { success: true, data: vehiculo };
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// PUT /api/vehiculos/:id  (Admin o Mecanico)
export const PutEditarVehiculo = async (ctx: RouterContext<"/api/vehiculos/:id">) => {
    const { params, request, response } = ctx;

    try {
        const id = Number(params.id);
        const body = await request.body.json();

        const camposObligatorios = ["placa", "marca", "modelo", "anio", "km_actuales"];
        for (const campo of camposObligatorios) {
            if (body[campo] === undefined || body[campo] === null || body[campo] === "") {
                response.status = 400;
                response.body = { success: false, message: `El campo ${campo} es obligatorio` };
                return;
            }
        }

        const objVehiculo = new Vehiculo();
        const resultado = await objVehiculo.Editar(id, body);

        response.status = resultado.success ? 200 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};

// DELETE /api/vehiculos/:id  (Admin o Mecanico) -> por dentro DESACTIVA
export const DeleteVehiculo = async (ctx: RouterContext<"/api/vehiculos/:id">) => {
    const { params, response } = ctx;

    try {
        const id = Number(params.id);
        const objVehiculo = new Vehiculo();
        const resultado = await objVehiculo.Desactivar(id);

        response.status = resultado.success ? 200 : 400;
        response.body = resultado;
    } catch (error) {
        console.error(error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
};