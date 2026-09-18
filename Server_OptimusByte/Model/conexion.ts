import { Client } from "../Dependencies/dependencias.ts";

export const conexion = await new Client().connect({
    hostname: "localhost",
    username: "root",
    password: "",
    db: "optimusbyte",
    port: Number(Deno.env.get("DB_PORT")) || 3306,
});