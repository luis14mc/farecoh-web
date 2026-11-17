import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { hashPassword } from "../src/lib/auth.ts";
import { getDbPool } from "../src/lib/db.ts";

const { values } = parseArgs({ options: { operational: { type: "boolean" } } });
const files = ["roles.sql", "events_pink_floyd.sql", "ticket_layouts.sql"];
if (values.operational) files.push("optional_pink_floyd_operational.sql");

// Admin inicial opcional: se crea solo si ADMIN_EMAIL y ADMIN_PASSWORD están definidas
// y el usuario todavía no existe. Nunca cambia la contraseña de un usuario existente.
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME?.trim() || "Administrador FARECOH";
if (adminEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
  throw new Error("ADMIN_EMAIL no es un correo válido.");
}
if (adminEmail && (!adminPassword || adminPassword.length < 10)) {
  throw new Error("ADMIN_PASSWORD debe tener al menos 10 caracteres cuando se define ADMIN_EMAIL.");
}

const pool = getDbPool();
try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [652026]);
    for (const file of files) {
      await client.query(await readFile(new URL(`../database/seeds/${file}`, import.meta.url), "utf8"));
    }
    if (adminEmail && adminPassword) {
      const result = await client.query(
        `INSERT INTO public.users (email, password_hash, full_name, role_id)
         SELECT $1, $2, $3, id FROM public.roles WHERE name = 'super_admin'
         ON CONFLICT (email) DO NOTHING`,
        [adminEmail, await hashPassword(adminPassword), adminName],
      );
      console.log(result.rowCount ? `Administrador inicial creado: ${adminEmail}` : `Administrador ${adminEmail} ya existía; sin cambios.`);
    }
    const { rows: staff } = await client.query<{ total: number }>("SELECT count(*)::int AS total FROM public.users");
    if (!staff[0].total) {
      console.warn(
        "AVISO: no hay ningún usuario en la base. Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 10 caracteres) " +
          "en las variables del servicio y vuelve a desplegar, o ejecuta pnpm db:create-admin.",
      );
    }
    await client.query("COMMIT");
    console.log("Datos iniciales aplicados.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
