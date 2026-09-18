#!/usr/bin/env node
/**
 * Initialize or migrate the PostgreSQL database using database/schema.sql.
 * Usage: pnpm db:init
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { query, getDbPool } from "../src/lib/db.ts";

async function main() {
  const schemaPath = path.join(process.cwd(), "database", "schema.sql");
  console.log(`[db:init] Reading schema from: ${schemaPath}`);
  const sql = await readFile(schemaPath, "utf8");

  console.log("[db:init] Applying schema to PostgreSQL database...");
  await query(sql);
  console.log("[db:init] Schema successfully applied!");

  await getDbPool().end();
}

main().catch((err) => {
  console.error("[db:init] Error applying schema:", err);
  process.exit(1);
});
