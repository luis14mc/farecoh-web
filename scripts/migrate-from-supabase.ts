/**
 * One-shot migration: read all data from Supabase via REST and insert it
 * into the local Postgres database (Railway).
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=sb_publishable_... \
 *   DATABASE_URL=postgres://... \
 *   pnpm tsx scripts/migrate-from-supabase.ts
 *
 * Idempotent: each row uses INSERT ... ON CONFLICT (natural key) DO NOTHING.
 * Re-runnable without duplicating data.
 *
 * Skipped tables:
 *   - users (different schema — Supabase has auth_user_id FK, ours does not)
 *   - bands / musicians (not present in the source Supabase project)
 */
import process from "node:process";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

interface SupabasePage<T> {
  rows: T[];
  nextOffset: number | null;
}

async function fetchAll<T>(table: string, select = "*"): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&offset=${offset}&limit=${PAGE}`;
    const response = await fetch(url, { headers: supabaseHeaders });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 404) {
        console.warn(`  ⚠ ${table}: 404 (table not found, skipping)`);
        return [];
      }
      throw new Error(`${table} → ${response.status}: ${text}`);
    }
    const rows = (await response.json()) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
    if (offset > 50_000) break; // safety cap
  }
  return out;
}

interface SupabaseRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface SupabaseEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string;
  city: string | null;
  ticket_price: number | string;
  capacity: number;
  status: string;
  created_at: string;
}

interface SupabaseSeller {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: string;
  active: boolean;
  created_at: string;
}

interface SupabaseTicketBatch {
  id: string;
  event_id: string;
  name: string;
  start_code: string;
  end_code: string;
  total_tickets: number;
  assigned_seller_id: string | null;
  location: string | null;
  status: string;
  created_at: string;
}

interface SupabaseTicket {
  id: string;
  event_id: string;
  batch_id: string | null;
  ticket_code: string;
  qr_token: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  seller_id: string | null;
  seller_name: string | null;
  sale_location: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  sold_at: string | null;
  validated_at: string | null;
  created_at: string;
}

interface SupabaseSale {
  id: string;
  ticket_id: string;
  amount: number | string;
  payment_method: string;
  seller_id: string | null;
  seller_name: string;
  sales_point: string;
  created_at: string;
}

interface SupabaseCheckin {
  id: string;
  ticket_id: string;
  validated_by: string;
  validated_at: string;
}

interface SupabaseAuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  performed_by: string;
  metadata?: unknown;
  created_at: string;
}

interface SupabaseTicketLayoutConfig {
  id: string;
  event_id: string;
  layout_key: string;
  width_mm: number | string;
  height_mm: number | string;
  config: unknown;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseReservationNotification {
  id: string;
  ticket_id: string | null;
  recipient: string;
  channel: string;
  message: string;
  status: string;
  error: string | null;
  metadata?: unknown;
  created_at: string;
}

interface Counter { count: number }

async function migrate(): Promise<void> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(DATABASE_URL!, { prepare: false, onnotice: () => {} });

  const stats: Array<{ table: string; source: number; inserted: number; skipped: number }> = [];

  try {
    console.log("Reading from Supabase REST…");

    const [roles, events, sellers, batches, tickets, sales, checkins, audit, layouts, notifications] =
      await Promise.all([
        fetchAll<SupabaseRole>("roles"),
        fetchAll<SupabaseEvent>("events"),
        fetchAll<SupabaseSeller>("sellers"),
        fetchAll<SupabaseTicketBatch>("ticket_batches"),
        fetchAll<SupabaseTicket>("tickets"),
        fetchAll<SupabaseSale>("sales"),
        fetchAll<SupabaseCheckin>("checkins"),
        fetchAll<SupabaseAuditLog>("audit_logs"),
        fetchAll<SupabaseTicketLayoutConfig>("ticket_layout_configs"),
        fetchAll<SupabaseReservationNotification>("reservation_notifications"),
      ]);

    console.log("\nLoaded from Supabase:");
    console.log(`  roles:    ${roles.length}`);
    console.log(`  events:   ${events.length}`);
    console.log(`  sellers:  ${sellers.length}`);
    console.log(`  batches:  ${batches.length}`);
    console.log(`  tickets:  ${tickets.length}`);
    console.log(`  sales:    ${sales.length}`);
    console.log(`  checkins: ${checkins.length}`);
    console.log(`  audit:    ${audit.length}`);
    console.log(`  layouts:  ${layouts.length}`);
    console.log(`  notifications: ${notifications.length}\n`);

    console.log("Writing to Postgres…\n");

    // 1. Roles
    {
      let inserted = 0;
      for (const r of roles) {
        const result = await sql`
          INSERT INTO roles (id, name, description, created_at)
          VALUES (${r.id}, ${r.name}, ${r.description}, ${r.created_at})
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "roles", source: roles.length, inserted, skipped: roles.length - inserted });
    }

    // 2. Events (preserve UUIDs — use conflict on slug)
    {
      let inserted = 0;
      for (const e of events) {
        const existing = await sql<{ id: string }[]>`SELECT id FROM events WHERE id = ${e.id}`;
        if (existing.length > 0) {
          stats.push({ table: "events", source: events.length, inserted: 0, skipped: events.length });
          break;
        }
        const result = await sql`
          INSERT INTO events (id, slug, title, description, event_date, event_time, location, city,
                              ticket_price, capacity, status, created_at)
          VALUES (${e.id}, ${e.slug}, ${e.title}, ${e.description},
                  ${e.event_date}::DATE, ${e.event_time}, ${e.location}, ${e.city},
                  ${e.ticket_price}::NUMERIC, ${e.capacity}, ${e.status}, ${e.created_at})
          ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            event_date = EXCLUDED.event_date,
            event_time = EXCLUDED.event_time,
            location = EXCLUDED.location,
            city = EXCLUDED.city,
            ticket_price = EXCLUDED.ticket_price,
            capacity = EXCLUDED.capacity,
            status = EXCLUDED.status
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      const skipped = events.length - inserted;
      const hasExisting = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM events`;
      if (hasExisting[0]?.count > 1) {
        // Already has rows; mark skipped as the count of pre-existing
        stats.push({ table: "events", source: events.length, inserted, skipped: events.length });
      } else {
        stats.push({ table: "events", source: events.length, inserted, skipped });
      }
    }

    // 3. Sellers
    {
      let inserted = 0;
      for (const s of sellers) {
        const result = await sql`
          INSERT INTO sellers (id, name, phone, email, type, active, created_at)
          VALUES (${s.id}, ${s.name}, ${s.phone}, ${s.email}, ${s.type}, ${s.active}, ${s.created_at})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "sellers", source: sellers.length, inserted, skipped: sellers.length - inserted });
    }

    // 4. Ticket batches
    {
      let inserted = 0;
      for (const b of batches) {
        const result = await sql`
          INSERT INTO ticket_batches (id, event_id, name, start_code, end_code, total_tickets,
                                      assigned_seller_id, location, status, created_at)
          VALUES (${b.id}, ${b.event_id}, ${b.name}, ${b.start_code}, ${b.end_code}, ${b.total_tickets},
                  ${b.assigned_seller_id}, ${b.location}, ${b.status}, ${b.created_at})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "ticket_batches", source: batches.length, inserted, skipped: batches.length - inserted });
    }

    // 5. Tickets (largest table — bulk insert in chunks)
    {
      let inserted = 0;
      const CHUNK = 200;
      for (let i = 0; i < tickets.length; i += CHUNK) {
        const slice = tickets.slice(i, i + CHUNK);
        const values: unknown[] = [];
        const placeholders: string[] = [];
        slice.forEach((t, idx) => {
          const base = idx * 16;
          placeholders.push(
            `($${base + 1}::UUID, $${base + 2}::UUID, $${base + 3}::UUID, $${base + 4}, $${base + 5}::UUID, $${base + 6},
              $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}::UUID, $${base + 11}, $${base + 12},
              $${base + 13}, $${base + 14}, $${base + 15}::TIMESTAMPTZ, $${base + 16}::TIMESTAMPTZ, now())`,
          );
          values.push(
            t.id, t.event_id, t.batch_id, t.ticket_code, t.qr_token, t.status,
            t.buyer_name, t.buyer_phone, t.buyer_email, t.seller_id, t.seller_name, t.sale_location,
            t.payment_method, t.payment_reference, t.sold_at, t.validated_at,
          );
        });

        const result = await sql.unsafe(
          `INSERT INTO tickets (id, event_id, batch_id, ticket_code, qr_token, status,
                                buyer_name, buyer_phone, buyer_email, seller_id, seller_name, sale_location,
                                payment_method, payment_reference, sold_at, validated_at, created_at)
           VALUES ${placeholders.join(", ")}
           ON CONFLICT (ticket_code) DO NOTHING
           RETURNING id`,
          values,
        );
        inserted += result.length;
      }
      stats.push({ table: "tickets", source: tickets.length, inserted, skipped: tickets.length - inserted });
    }

    // 6. Sales
    {
      let inserted = 0;
      for (const s of sales) {
        const result = await sql`
          INSERT INTO sales (id, ticket_id, amount, payment_method, seller_id, seller_name, sales_point, created_at)
          VALUES (${s.id}, ${s.ticket_id}, ${s.amount}::NUMERIC, ${s.payment_method},
                  ${s.seller_id}, ${s.seller_name}, ${s.sales_point}, ${s.created_at})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "sales", source: sales.length, inserted, skipped: sales.length - inserted });
    }

    // 7. Checkins
    {
      let inserted = 0;
      for (const c of checkins) {
        const result = await sql`
          INSERT INTO checkins (id, ticket_id, validated_by, validated_at)
          VALUES (${c.id}, ${c.ticket_id}, ${c.validated_by}, ${c.validated_at})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "checkins", source: checkins.length, inserted, skipped: checkins.length - inserted });
    }

    // 8. Audit logs
    {
      let inserted = 0;
      for (const a of audit) {
        const metadata = a.metadata ? JSON.stringify(a.metadata) : null;
        const result = await sql`
          INSERT INTO audit_logs (id, action, entity, entity_id, performed_by, metadata, created_at)
          VALUES (${a.id}, ${a.action}, ${a.entity}, ${a.entity_id}, ${a.performed_by},
                  ${metadata}::JSONB, ${a.created_at})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "audit_logs", source: audit.length, inserted, skipped: audit.length - inserted });
    }

    // 9. Ticket layout configs
    {
      let inserted = 0;
      for (const c of layouts) {
        const result = await sql`
          INSERT INTO ticket_layout_configs (id, event_id, layout_key, width_mm, height_mm,
                                              config, active, created_at, updated_at)
          VALUES (${c.id}, ${c.event_id}, ${c.layout_key},
                  ${c.width_mm}::NUMERIC, ${c.height_mm}::NUMERIC,
                  ${JSON.stringify(c.config)}::JSONB, ${c.active},
                  ${c.created_at}, ${c.updated_at})
          ON CONFLICT (event_id, layout_key) DO UPDATE SET
            width_mm = EXCLUDED.width_mm,
            height_mm = EXCLUDED.height_mm,
            config = EXCLUDED.config,
            active = EXCLUDED.active,
            updated_at = EXCLUDED.updated_at
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "ticket_layout_configs", source: layouts.length, inserted, skipped: layouts.length - inserted });
    }

    // 10. Reservation notifications
    {
      let inserted = 0;
      for (const n of notifications) {
        const metadata = n.metadata ? JSON.stringify(n.metadata) : null;
        const result = await sql`
          INSERT INTO reservation_notifications (id, ticket_id, recipient, channel, message,
                                                 status, error, metadata, created_at)
          VALUES (${n.id}, ${n.ticket_id}, ${n.recipient}, ${n.channel}, ${n.message},
                  ${n.status}, ${n.error}, ${metadata}::JSONB, ${n.created_at})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted += 1;
      }
      stats.push({ table: "reservation_notifications", source: notifications.length, inserted, skipped: notifications.length - inserted });
    }

    console.log("Migration summary:\n");
    console.log("  Table                       Source  Inserted  Skipped");
    console.log("  --------------------------  ------  --------  -------");
    for (const s of stats) {
      const label = s.table.padEnd(26);
      console.log(`  ${label}  ${String(s.source).padStart(6)}  ${String(s.inserted).padStart(8)}  ${String(s.skipped).padStart(7)}`);
    }

    console.log("\nDone.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

migrate().catch((err) => {
  console.error("\nMigration failed:");
  console.error(err);
  process.exit(1);
});
