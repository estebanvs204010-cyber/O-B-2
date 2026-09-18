import { hash } from "./Dependencies/dependencias.ts";

// Uso: deno run --allow-net generar_hash.ts "MiContraseñaDePrueba"
const password = Deno.args[0];

if (!password) {
  console.log("Uso: deno run --allow-net generar_hash.ts \"tu_contraseña\"");
  Deno.exit(1);
}

const hasheada = await hash(password);
console.log(hasheada);