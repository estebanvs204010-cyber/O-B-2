import { create, getNumericDate, verify } from "../Dependencies/dependencias.ts";
import { generarKey } from "./CriptoKey.ts";

const key = Deno.env.get("MY_SECRET_KEY") || "default_key";
const server = Deno.env.get("SERVER");

export const crearToken = async (userId: number, rol: string) => {
  const payload = {
    iss: server,
    sub: String(userId),
    rol: rol,
    jti: crypto.randomUUID(),
    exp: getNumericDate(60 * 60), // expira en 1 hora
  };

  const secretKey = await generarKey(key);

  return await create({ alg: "HS256", typ: "JWT" }, payload, secretKey);
};

export const VerificarTokenAcceso = async (token: string) => {
  const secretKey = await generarKey(key);

  try {
    return await verify(token, secretKey);
  } catch (error) {
    console.error("Token invalido: ", error);
    return null;
  }
};