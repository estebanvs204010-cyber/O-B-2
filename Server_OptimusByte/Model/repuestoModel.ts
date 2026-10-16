import { conexion } from "./conexion.ts";

export interface DatosRepuesto {
    referencia: string;
    nombre: string;
    descripcion?: string | null;
    categoria?: string;
    precio_unitario: number;
    stock_actual: number;
    stock_minimo: number;
    marca?: string;
    modelo?: string | null;
    imagen_url?: string | null;
}

export class Repuesto {
    public async Listar(incluirInactivos = false) {
        return await conexion.query(
            `SELECT id_repuesto, referencia, nombre, descripcion, categoria,
                    precio_unitario, stock_actual, stock_minimo, marca, modelo,
                    imagen_url, activo, fecha_registro
             FROM repuestos
             ${incluirInactivos ? "" : "WHERE activo = 1"}
             ORDER BY nombre`,
        );
    }

    public async ObtenerPorId(id: number) {
        const [repuesto] = await conexion.query(
            `SELECT id_repuesto, referencia, nombre, descripcion, categoria,
                    precio_unitario, stock_actual, stock_minimo, marca, modelo,
                    imagen_url, activo, fecha_registro
             FROM repuestos
             WHERE id_repuesto = ?`,
            [id],
        );
        return repuesto ?? null;
    }

    public async Crear(datos: DatosRepuesto) {
        const [existente] = await conexion.query(
            "SELECT id_repuesto FROM repuestos WHERE referencia = ?",
            [datos.referencia],
        );
        if (existente) {
            return { success: false, message: "Ya existe un repuesto con esa referencia" };
        }

        await conexion.execute(
            `INSERT INTO repuestos (
                referencia, nombre, descripcion, categoria, precio_unitario,
                stock_actual, stock_minimo, marca, modelo, imagen_url
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                datos.referencia,
                datos.nombre,
                datos.descripcion || null,
                datos.categoria || "General",
                datos.precio_unitario,
                datos.stock_actual,
                datos.stock_minimo,
                datos.marca || "General",
                datos.modelo || null,
                datos.imagen_url || null,
            ],
        );
        return { success: true, message: "Repuesto creado correctamente" };
    }

    public async Editar(id: number, datos: DatosRepuesto) {
        const actual = await this.ObtenerPorId(id);
        if (!actual) {
            return { success: false, message: "El repuesto no existe" };
        }

        const [existente] = await conexion.query(
            "SELECT id_repuesto FROM repuestos WHERE referencia = ? AND id_repuesto <> ?",
            [datos.referencia, id],
        );
        if (existente) {
            return { success: false, message: "Ya existe un repuesto con esa referencia" };
        }

        await conexion.execute(
            `UPDATE repuestos
             SET referencia = ?, nombre = ?, descripcion = ?, categoria = ?,
                 precio_unitario = ?, stock_actual = ?, stock_minimo = ?,
                 marca = ?, modelo = ?, imagen_url = ?
             WHERE id_repuesto = ?`,
            [
                datos.referencia,
                datos.nombre,
                datos.descripcion || null,
                datos.categoria || "General",
                datos.precio_unitario,
                datos.stock_actual,
                datos.stock_minimo,
                datos.marca || "General",
                datos.modelo || null,
                datos.imagen_url === undefined ? actual.imagen_url : datos.imagen_url,
                id,
            ],
        );
        return { success: true, message: "Repuesto actualizado correctamente" };
    }

    public async CambiarEstado(id: number, activo: boolean) {
        const actual = await this.ObtenerPorId(id);
        if (!actual) {
            return { success: false, message: "El repuesto no existe" };
        }

        await conexion.execute(
            "UPDATE repuestos SET activo = ? WHERE id_repuesto = ?",
            [activo ? 1 : 0, id],
        );
        return {
            success: true,
            message: `Repuesto ${activo ? "activado" : "desactivado"} correctamente`,
        };
    }

    public async CambiarImagenCategoria(categoria: string, imagenUrl: string) {
        const resultado = await conexion.execute(
            `UPDATE repuestos
             SET imagen_url = ?
             WHERE LOWER(TRIM(categoria)) = LOWER(?)`,
            [imagenUrl, categoria],
        );
        return resultado;
    }

    public async ExisteCategoria(categoria: string) {
        const [resultado] = await conexion.query(
            `SELECT categoria
             FROM repuestos
             WHERE LOWER(TRIM(categoria)) = LOWER(?)
             LIMIT 1`,
            [categoria],
        );
        return Boolean(resultado);
    }
}
