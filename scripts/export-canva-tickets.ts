import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCanvaTicketsCsv,
  CANVA_TICKETS_FILENAME,
  loadPinkFloydCanvaTicketRows,
} from "../src/lib/canva-export.ts";

const EXPORT_DIR = path.join(process.cwd(), "exports");
const EXPORT_PATH = path.join(EXPORT_DIR, CANVA_TICKETS_FILENAME);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

const SUPABASE_URL = requireEnv("PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rows = await loadPinkFloydCanvaTicketRows(supabase);

await mkdir(EXPORT_DIR, { recursive: true });
await writeFile(EXPORT_PATH, buildCanvaTicketsCsv(rows), "utf8");

console.log(`Exported ${rows.length} Canva rows to ${EXPORT_PATH}`);
