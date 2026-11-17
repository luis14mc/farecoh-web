import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { getDbPool } from "../src/lib/db.ts";

const { values } = parseArgs({ options: { operational: { type: "boolean" } } });
const files = ["roles.sql", "events_pink_floyd.sql", "ticket_layouts.sql"];
if (values.operational) files.push("optional_pink_floyd_operational.sql");

const pool = getDbPool();
try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [652026]);
    for (const file of files) {
      await client.query(await readFile(new URL(`../database/seeds/${file}`, import.meta.url), "utf8"));
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
