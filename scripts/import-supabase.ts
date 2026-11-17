/**
 * Importa los datos reales desde la base PostgreSQL de Supabase a la base nueva (Railway).
 *
 * Copia directamente de Postgres a Postgres (no usa la API REST, que con la llave pública
 * no puede leer tablas protegidas por RLS). Conserva los UUID, así que todas las relaciones
 * se mantienen. Es idempotente: se puede correr varias veces sin duplicar datos.
 *
 * Uso:
 *   SOURCE_DATABASE_URL="postgresql://postgres.<ref>:<clave>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
 *   DATABASE_URL="<URL pública de Railway>" \
 *   pnpm db:import-supabase              # simulación: muestra lo que haría y deshace todo
 *   pnpm db:import-supabase -- --execute # aplica los cambios
 *
 * Reglas:
 * - Se importan solo las columnas que existen en ambos lados.
 * - Eventos: si el slug ya existe en destino (p. ej. "pink-floyd" del seed), se reutiliza el
 *   evento destino y se reasignan sus boletos y lotes a ese id.
 * - Músicos de banda: se emparejan por nombre.
 * - Plantillas de impresión: la versión de Supabase reemplaza la del seed (tiene la calibración real).
 * - Usuarios: NO se importan (Supabase guardaba las contraseñas en auth.users). Créalos con
 *   ADMIN_EMAIL/ADMIN_PASSWORD o desde Admin › Usuarios.
 */
import { parseArgs } from "node:util";
import pg from "pg";

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg, index) => index !== 0 || arg !== "--"),
  options: { execute: { type: "boolean" } },
});
const execute = Boolean(values.execute);

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl) {
  throw new Error("Define SOURCE_DATABASE_URL (Supabase) y DATABASE_URL (Railway).");
}
if (sourceUrl === targetUrl) throw new Error("Origen y destino son la misma base.");

const ssl = (url: string) =>
  /[?&]sslmode=disable\b/.test(url) || /@(localhost|127\.0\.0\.1)[:/]/.test(url) ? false : { rejectUnauthorized: false };
const source = new pg.Client({ connectionString: sourceUrl, ssl: ssl(sourceUrl) });
const target = new pg.Client({ connectionString: targetUrl, ssl: ssl(targetUrl) });

type Row = Record<string, unknown>;

/** Orden respetando llaves foráneas. */
const TABLES: Array<{ name: string; conflict: string }> = [
  { name: "events", conflict: "ON CONFLICT DO NOTHING" },
  { name: "sellers", conflict: "ON CONFLICT DO NOTHING" },
  { name: "ticket_batches", conflict: "ON CONFLICT DO NOTHING" },
  { name: "tickets", conflict: "ON CONFLICT DO NOTHING" },
  { name: "sales", conflict: "ON CONFLICT DO NOTHING" },
  { name: "checkins", conflict: "ON CONFLICT DO NOTHING" },
  { name: "reservation_notifications", conflict: "ON CONFLICT DO NOTHING" },
  { name: "audit_logs", conflict: "ON CONFLICT DO NOTHING" },
  { name: "band_musicians", conflict: "ON CONFLICT DO NOTHING" },
  { name: "band_musician_tickets", conflict: "ON CONFLICT DO NOTHING" },
  { name: "ticket_layout_configs", conflict: "" /* se maneja aparte */ },
];

async function columns(client: pg.Client, table: string): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

/** Columnas con otro nombre en el esquema de Supabase: origen -> destino. */
const RENAMES: Record<string, Record<string, string>> = {
  ticket_batches: {
    start_code: "from_code",
    end_code: "to_code",
    total_tickets: "count",
    assigned_seller_id: "seller_id",
    created_at: "assigned_at",
  },
};

/** Ajustes de valores para cumplir restricciones NOT NULL del destino. */
function normalize(table: string, row: Row): Row {
  if (table === "reservation_notifications") {
    const codes = Array.isArray(row.ticket_codes) ? row.ticket_codes : [];
    return { ...row, buyer_phone: row.buyer_phone ?? "", ticket_code: row.ticket_code ?? codes[0] ?? null };
  }
  return row;
}

const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

async function insertRows(table: string, cols: string[], rows: Row[], conflict: string): Promise<number> {
  let inserted = 0;
  const list = cols.map(quote).join(", ");
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((row) => Object.fromEntries(cols.map((c) => [c, row[c] ?? null])));
    const result = await target.query(
      `INSERT INTO public.${quote(table)} (${list})
       SELECT ${list} FROM json_populate_recordset(NULL::public.${quote(table)}, $1::json)
       ${conflict}`,
      [JSON.stringify(chunk)],
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

await source.connect();
await target.connect();
const report: Array<{ tabla: string; origen: number; insertados: number; omitidos: number; nota?: string }> = [];

try {
  const { rows: migrated } = await target.query(
    "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS ok",
  );
  if (!migrated[0].ok) throw new Error("La base destino no tiene migraciones. Ejecuta pnpm db:migrate primero.");

  await target.query("BEGIN");

  const eventIdMap = new Map<string, string>(); // id origen -> id destino
  const musicianIdMap = new Map<string, string>();

  for (const { name, conflict } of TABLES) {
    const renames = RENAMES[name] ?? {};
    const sourceCols = (await columns(source, name)).map((c) => renames[c] ?? c);
    if (!sourceCols.length) {
      report.push({ tabla: name, origen: 0, insertados: 0, omitidos: 0, nota: "no existe en origen" });
      continue;
    }
    const targetCols = await columns(target, name);
    const cols = sourceCols.filter((c) => targetCols.includes(c));
    const missing = targetCols.filter((c) => !sourceCols.includes(c));

    let rows = (await source.query<Row>(`SELECT * FROM public.${quote(name)}`)).rows.map((raw) =>
      normalize(name, Object.fromEntries(Object.entries(raw).map(([k, v]) => [renames[k] ?? k, v]))),
    );
    const total = rows.length;
    let nota = missing.length ? `columnas nuevas con valor por defecto: ${missing.join(", ")}` : undefined;

    if (name === "events") {
      const existing = (await target.query<{ id: string; slug: string }>("SELECT id, slug FROM public.events")).rows;
      const bySlug = new Map(existing.map((e) => [e.slug, e.id]));
      rows = rows.filter((row) => {
        const targetId = bySlug.get(String(row.slug));
        if (targetId && targetId !== row.id) {
          eventIdMap.set(String(row.id), targetId);
          return false;
        }
        return true;
      });
      // Los eventos importados quedan publicados, con el estado válido más cercano.
      rows = rows.map((row) => ({
        ...row,
        status: ["draft", "active", "finished", "cancelled"].includes(String(row.status)) ? row.status : "active",
      }));
      if (eventIdMap.size) nota = `${eventIdMap.size} evento(s) emparejado(s) por slug con el destino`;
    }

    if (name === "band_musicians") {
      const existing = (await target.query<{ id: string; name: string }>("SELECT id, name FROM public.band_musicians")).rows;
      const byName = new Map(existing.map((m) => [m.name, m.id]));
      rows = rows.filter((row) => {
        const targetId = byName.get(String(row.name));
        if (targetId && targetId !== row.id) {
          musicianIdMap.set(String(row.id), targetId);
          return false;
        }
        return true;
      });
    }

    if (eventIdMap.size && cols.includes("event_id")) {
      rows = rows.map((row) => ({ ...row, event_id: eventIdMap.get(String(row.event_id)) ?? row.event_id }));
    }
    if (musicianIdMap.size && cols.includes("musician_id")) {
      rows = rows.map((row) => ({ ...row, musician_id: musicianIdMap.get(String(row.musician_id)) ?? row.musician_id }));
    }

    if (name === "ticket_layout_configs") {
      const updatable = cols.filter((c) => !["id", "layout_type"].includes(c));
      const sets = updatable.map((c) => `${quote(c)} = EXCLUDED.${quote(c)}`).join(", ");
      const inserted = await insertRows(name, cols, rows, `ON CONFLICT (layout_type) DO UPDATE SET ${sets}`);
      report.push({ tabla: name, origen: total, insertados: inserted, omitidos: total - inserted, nota: "reemplaza la plantilla del seed" });
      continue;
    }

    const inserted = await insertRows(name, cols, rows, conflict);
    report.push({ tabla: name, origen: total, insertados: inserted, omitidos: total - inserted, nota });
  }

  // Verificación: todos los boletos del origen deben existir en destino.
  const sourceTickets = Number((await source.query("SELECT count(*) FROM public.tickets")).rows[0].count);
  const sourceCodes = (await source.query<{ ticket_code: string }>("SELECT ticket_code FROM public.tickets")).rows.map((r) => r.ticket_code);
  const found = Number(
    (await target.query("SELECT count(*) FROM public.tickets WHERE ticket_code = ANY($1::text[])", [sourceCodes])).rows[0].count,
  );
  if (found !== sourceTickets) {
    throw new Error(`Verificación fallida: ${found} de ${sourceTickets} boletos del origen están en destino.`);
  }

  if (execute) {
    await target.query("COMMIT");
  } else {
    await target.query("ROLLBACK");
  }

  console.table(report);
  console.log(`Boletos verificados: ${found}/${sourceTickets}.`);
  console.log(execute ? "Importación aplicada." : "Simulación: no se guardó nada. Usa --execute para aplicar.");
} catch (error) {
  await target.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await source.end();
  await target.end();
}
