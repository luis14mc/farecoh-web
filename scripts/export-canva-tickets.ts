import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCanvaTicketsCsv,
  CANVA_TICKETS_FILENAME,
  loadPinkFloydCanvaTicketRows,
} from "../src/lib/canva-export.ts";
import { getDbPool } from "../src/lib/db.ts";

const EXPORT_DIR = path.join(process.cwd(), "exports");
const EXPORT_PATH = path.join(EXPORT_DIR, CANVA_TICKETS_FILENAME);

const rows = await loadPinkFloydCanvaTicketRows();

await mkdir(EXPORT_DIR, { recursive: true });
await writeFile(EXPORT_PATH, buildCanvaTicketsCsv(rows), "utf8");

try {
  await getDbPool().end();
} catch {}

console.log(`Exported ${rows.length} Canva rows to ${EXPORT_PATH}`);
