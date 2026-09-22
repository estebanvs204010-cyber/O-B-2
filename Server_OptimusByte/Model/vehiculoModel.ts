import { conexion } from "./conexion.ts";

interface DatosVehiculo {
    id_cliente: number;
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    color?: string;
    vin?: string;
    km_actuales?: number;
}
interface DatosEdicionVehiculo {
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    color?: string;
    vin?: string;
    km_actuales: number;
}

export class Vehiculo {
    // ---------- Crear ----------
    public async Crear(datos: DatosVehiculo) {
        const [clienteExiste] = await conexion.query(
            `SELECT id_cliente FROM clientes WHERE id_cliente = ? AND activo = 1`,
            [datos.id_cliente],
        );
        if (!clienteExiste) {
            return { success: false, message: "El cliente no existe o está inactivo" };
        }

        const [placaExistente] = await conexion.query(
            `SELECT id_vehiculo FROM vehiculos WHERE placa = ?`,
            [datos.placa],
        );
        if (placaExistente) {
            return { success: false, message: "Ya existe un vehículo registrado con esa placa" };
        }

        await conexion.execute(
            `INSERT INTO vehiculos (id_cliente, placa, marca, modelo, anio, color, vin, km_actuales)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                datos.id_cliente,
                datos.placa.toUpperCase(),
                datos.marca,
                datos.modelo,
                datos.anio,
                datos.color ?? null,
                datos.vin ?? null,
                datos.km_actuales ?? 0,
            ],
        );

        return { success: true, message: "Vehículo registrado correctamente" };
    }

    // ---------- Listar todos (con el nombre del cliente dueño) ----------
        public async Listar() {
        return await conexion.query(
            `SELECT v.id_vehiculo, v.placa, v.marca, v.modelo, v.anio, v.color, v.km_actuales, v.activo,
                    c.id_cliente, c.nombre_completo AS cliente
             FROM vehiculos v
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             WHERE v.activo = 1
             ORDER BY v.fecha_registro DESC`,
        );
    }

    // ---------- Listar los vehículos de UN cliente en particular ----------
        public async ListarPorCliente(id_cliente: number) {
        return await conexion.query(
            `SELECT id_vehiculo, placa, marca, modelo, anio, color, vin, km_actuales, activo
             FROM vehiculos
             WHERE id_cliente = ? AND activo = 1
             ORDER BY fecha_registro DESC`,
            [id_cliente],
        );
    }


        // ---------- Obtener uno solo, por id ----------
    public async ObtenerPorId(id_vehiculo: number) {
        const [vehiculo] = await conexion.query(
            `SELECT v.id_vehiculo, v.id_cliente, v.placa, v.marca, v.modelo, v.anio, v.color, v.vin, v.km_actuales, v.activo,
                    c.nombre_completo AS cliente
             FROM vehiculos v
             INNER JOIN clientes c ON c.id_cliente = v.id_cliente
             WHERE v.id_vehiculo = ?`,
            [id_vehiculo],
        );
        return vehiculo ?? null;
    }

    // ---------- Editar ----------
    public async Editar(id_vehiculo: number, datos: DatosEdicionVehiculo) {
        const vehiculoActual = await this.ObtenerPorId(id_vehiculo);
        if (!vehiculoActual) {
            return { success: false, message: "El vehículo no existe" };
        }

        const [placaDuplicada] = await conexion.query(
            `SELECT id_vehiculo FROM vehiculos WHERE placa = ? AND id_vehiculo != ?`,
            [datos.placa.toUpperCase(), id_vehiculo],
        );
        if (placaDuplicada) {
            return { success: false, message: "Ya existe otro vehículo con esa placa" };
        }

        // El kilometraje de un carro no puede "bajar" — si el número nuevo es menor
        // al que ya teníamos guardado, es casi seguro un error de digitación.
        if (datos.km_actuales < vehiculoActual.km_actuales) {
            return {
                success: false,
                message: `El kilometraje no puede ser menor al actual (${vehiculoActual.km_actuales} km)`,
            };
        }

        await conexion.execute(
            `UPDATE vehiculos
             SET placa = ?, marca = ?, modelo = ?, anio = ?, color = ?, vin = ?, km_actuales = ?
             WHERE id_vehiculo = ?`,
            [
                datos.placa.toUpperCase(),
                datos.marca,
                datos.modelo,
                datos.anio,
                datos.color ?? null,
                datos.vin ?? null,
                datos.km_actuales,
                id_vehiculo,
            ],
        );

        return { success: true, message: "Vehículo actualizado correctamente" };
    }

    // ---------- "Eliminar" = desactivar ----------
    public async Desactivar(id_vehiculo: number) {
        const vehiculoActual = await this.ObtenerPorId(id_vehiculo);
        if (!vehiculoActual) {
            return { success: false, message: "El vehículo no existe" };
        }

        await conexion.execute(
            `UPDATE vehiculos SET activo = 0 WHERE id_vehiculo = ?`,
            [id_vehiculo],
        );

        return { success: true, message: "Vehículo desactivado correctamente" };
    }
}