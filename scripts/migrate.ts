import { readdir, readFile } from "node:fs/promises";
import { getDbPool } from "../src/lib/db.ts";

const directory = new URL("../database/migrations/", import.meta.url);
const pool = getDbPool();
try {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [652026]);
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now()
    )`);
    const { rows } = await client.query("SELECT version FROM public.schema_migrations");
    const applied = new Set(rows.map(({ version }) => version));
    const files = (await readdir(directory)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();

    for (const file of files) {
      const version = file.slice(0, 4);
      if (applied.has(version)) continue;
      const sql = await readFile(new URL(file, directory), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO public.schema_migrations (version) VALUES ($1)", [version]);
        await client.query("COMMIT");
        applied.add(version);
        console.log(`Migración aplicada: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release(true);
  }
} finally {
  await pool.end();
}
