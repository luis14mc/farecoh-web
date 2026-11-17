import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword } from "../src/lib/auth.ts";
import { getDbPool } from "../src/lib/db.ts";

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg, index) => index !== 0 || arg !== "--"),
  options: { email: { type: "string" }, name: { type: "string" }, "reset-password": { type: "boolean" } },
});
const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
  throw new Error("Indica un correo válido con --email y un nombre con --name.");
}
const suppliedPassword = process.env.ADMIN_PASSWORD;
if (suppliedPassword !== undefined && !suppliedPassword.trim()) {
  throw new Error("ADMIN_PASSWORD no puede estar vacía.");
}
const password = suppliedPassword ?? randomBytes(24).toString("base64url");
const pool = getDbPool();
try {
  const existing = await pool.query("SELECT 1 FROM public.users WHERE email = $1", [email]);
  if (existing.rowCount && !values["reset-password"]) {
    throw new Error(`El usuario ${email} ya existe. Usa --reset-password para reemplazar su contraseña.`);
  }
  const result = await pool.query(
    `INSERT INTO public.users (email, password_hash, full_name, role_id)
     SELECT $1, $2, $3, id FROM public.roles WHERE name = 'super_admin'
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name, role_id = EXCLUDED.role_id, active = true, updated_at = now()`,
    [email, await hashPassword(password), name],
  );
  if (!result.rowCount) throw new Error("Ejecuta pnpm db:seed primero.");
  console.log(`Administrador configurado: ${email}`);
  if (suppliedPassword === undefined) console.log(`Contraseña generada: ${password}`);
} finally {
  await pool.end();
}
