import { conexion } from "./conexion.ts";

interface DatosVehiculo {
<<<<<<< HEAD
    id_cliente: number;
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    color?: string;
    vin?: string;
    km_actuales?: number;
=======
  id_cliente: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color?: string;
  vin?: string;
  km_actuales?: number;
>>>>>>> origin/Lucho
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
    const placa = datos.placa.trim().toUpperCase();
    const vin = datos.vin?.trim().toUpperCase() ?? "";

<<<<<<< HEAD
        const [placaExistente] = await conexion.query(
            `SELECT id_vehiculo FROM vehiculos WHERE placa = ?`,
            [datos.placa],
        );
        if (placaExistente) {
            return { success: false, message: "Ya existe un vehículo registrado con esa placa" };
        }

    await conexion.execute(
      `INSERT INTO vehiculos
        (id_cliente, placa, marca, modelo, anio, color, vin, km_actuales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.id_cliente,
        placa,
        datos.marca.trim(),
        datos.modelo.trim(),
        datos.anio,
        datos.color?.trim() || null,
        vin,
        datos.km_actuales ?? 0,
      ],
    );

        return { success: true, message: "Vehículo registrado correctamente" };
=======
    if (!placa) {
      return {
        success: false,
        message: "La placa es obligatoria",
      };
>>>>>>> origin/Lucho
    }

    const [clienteExiste] = await conexion.query(
      `SELECT id_cliente
       FROM clientes
       WHERE id_cliente = ? AND activo = 1`,
      [datos.id_cliente],
    );

    if (!clienteExiste) {
      return {
        success: false,
        message: "El cliente no existe o está inactivo",
      };
    }

    const filasPlaca = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM vehiculos
       WHERE UPPER(TRIM(placa)) = ?`,
      [placa],
    );

    const cantidadPlacas = Number(
      filasPlaca[0]?.total ?? 0,
    );

    console.log("[VEHICULO] Placa recibida:", placa);
    console.log(
      "[VEHICULO] Coincidencias encontradas:",
      cantidadPlacas,
    );

    if (cantidadPlacas > 0) {
      return {
        success: false,
        message: "Ya existe un vehículo registrado con esa placa",
      };
    }

    await conexion.execute(
      `INSERT INTO vehiculos
        (id_cliente, placa, marca, modelo, anio, color, vin, km_actuales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.id_cliente,
        placa,
        datos.marca.trim(),
        datos.modelo.trim(),
        datos.anio,
        datos.color?.trim() || null,
        vin,
        datos.km_actuales ?? 0,
      ],
    );

    return {
      success: true,
      message: "Vehículo registrado correctamente",
    };
  }

  // ---------- Listar todos ----------
  public async Listar(incluirInactivos = false) {
    return await conexion.query(
      `SELECT
          v.id_vehiculo,
          v.placa,
          v.marca,
          v.modelo,
          v.anio,
          v.color,
          v.vin,
          v.km_actuales,
          v.activo,
          c.id_cliente,
          c.nombre_completo AS cliente
       FROM vehiculos v
       INNER JOIN clientes c ON c.id_cliente = v.id_cliente
       ${
        incluirInactivos
          ? ""
          : "WHERE v.activo = 1"
      }
       ORDER BY v.fecha_registro DESC`,
    );
  }

  // ---------- Listar vehículos de un cliente ----------
  public async ListarPorCliente(id_cliente: number) {
    return await conexion.query(
      `SELECT
          id_vehiculo,
          placa,
          marca,
          modelo,
          anio,
          color,
          vin,
          km_actuales,
          activo
       FROM vehiculos
       WHERE id_cliente = ?
         AND activo = 1
       ORDER BY fecha_registro DESC`,
      [id_cliente],
    );
  }

  // ---------- Obtener vehículo por id ----------
  public async ObtenerPorId(id_vehiculo: number) {
    const [vehiculo] = await conexion.query(
      `SELECT
          v.id_vehiculo,
          v.id_cliente,
          v.placa,
          v.marca,
          v.modelo,
          v.anio,
          v.color,
          v.vin,
          v.km_actuales,
          v.activo,
          c.nombre_completo AS cliente
       FROM vehiculos v
       INNER JOIN clientes c ON c.id_cliente = v.id_cliente
       WHERE v.id_vehiculo = ?`,
      [id_vehiculo],
    );

    return vehiculo ?? null;
  }

  // ---------- Editar ----------
  public async Editar(
    id_vehiculo: number,
    datos: DatosEdicionVehiculo,
  ) {
    const vehiculoActual = await this.ObtenerPorId(id_vehiculo);

    if (!vehiculoActual) {
      return {
        success: false,
        message: "El vehículo no existe",
      };
    }

    const placa = datos.placa.trim().toUpperCase();

    const filasPlaca = await conexion.query(
      `SELECT COUNT(*) AS total
       FROM vehiculos
       WHERE UPPER(TRIM(placa)) = ?
         AND id_vehiculo != ?`,
      [placa, id_vehiculo],
    );

    const cantidadPlacas = Number(
      filasPlaca[0]?.total ?? 0,
    );

    if (cantidadPlacas > 0) {
      return {
        success: false,
        message: "Ya existe otro vehículo con esa placa",
      };
    }

    if (datos.km_actuales < vehiculoActual.km_actuales) {
      return {
        success: false,
        message:
          `El kilometraje no puede ser menor al actual (${vehiculoActual.km_actuales} km)`,
      };
    }

    const vin = datos.vin?.trim()
      ? datos.vin.trim().toUpperCase()
      : vehiculoActual.vin ?? "";

    await conexion.execute(
      `UPDATE vehiculos
       SET
          placa = ?,
          marca = ?,
          modelo = ?,
          anio = ?,
          color = ?,
          vin = ?,
          km_actuales = ?
       WHERE id_vehiculo = ?`,
      [
        placa,
        datos.marca.trim(),
        datos.modelo.trim(),
        datos.anio,
        datos.color?.trim() || null,
        vin,
        datos.km_actuales,
        id_vehiculo,
      ],
    );

    return {
      success: true,
      message: "Vehículo actualizado correctamente",
    };
  }

  // ---------- Desactivar vehículo ----------
  public async Desactivar(id_vehiculo: number) {
    const vehiculoActual = await this.ObtenerPorId(id_vehiculo);

    if (!vehiculoActual) {
      return {
        success: false,
        message: "El vehículo no existe",
      };
    }

    await conexion.execute(
      `UPDATE vehiculos
       SET activo = 0
       WHERE id_vehiculo = ?`,
      [id_vehiculo],
    );

    return {
      success: true,
      message: "Vehículo desactivado correctamente",
    };
  }

  // ---------- Cambiar estado ----------
  public async CambiarEstado(
    id_vehiculo: number,
    activo: boolean,
  ) {
    const vehiculoActual = await this.ObtenerPorId(id_vehiculo);

    if (!vehiculoActual) {
      return {
        success: false,
        message: "El vehículo no existe",
      };
    }

    await conexion.execute(
      `UPDATE vehiculos
       SET activo = ?
       WHERE id_vehiculo = ?`,
      [activo ? 1 : 0, id_vehiculo],
    );

    return {
      success: true,
      message:
        `Vehículo ${
          activo ? "activado" : "desactivado"
        } correctamente`,
    };
  }
}