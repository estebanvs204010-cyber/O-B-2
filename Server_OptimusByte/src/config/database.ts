import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { Client } from "../../Dependencies/dependencias.ts";

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: Deno.env.get("DB_HOST") ?? "localhost",
    port: Number(Deno.env.get("DB_PORT") ?? 3306),
    user: Deno.env.get("DB_USER") ?? "root",
    password: Deno.env.get("DB_PASSWORD") ?? "",
    database: Deno.env.get("DB_NAME") ?? "optimusbyte",
  };
}

const config = getDatabaseConfig();

export const database = await new Client().connect({
  hostname: config.host,
  port: config.port,
  username: config.user,
  password: config.password,
  db: config.database,
});

export const conexion = database;
export default database;
