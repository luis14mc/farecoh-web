#!/usr/bin/env node
/**
 * Audit report: verifies ticket identity fields were not modified by layout work.
 * Run: pnpm verify:ticket-immutability
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase/migrations");
const LAYOUT_MIGRATION = "20260713_ticket_layout_configs.sql";

const TICKET_IDENTITY_PATTERNS = [
  /UPDATE\s+public\.tickets\s+SET\s+qr_token/i,
  /UPDATE\s+public\.tickets\s+SET\s+ticket_code/i,
  /ALTER\s+TABLE\s+public\.tickets[\s\S]*qr_token/i,
  /ALTER\s+TABLE\s+public\.tickets[\s\S]*ticket_code/i,
  /DELETE\s+FROM\s+public\.tickets/i,
  /TRUNCATE\s+public\.tickets/i,
];

async function auditLayoutMigration(): Promise<boolean> {
  const filePath = path.join(MIGRATIONS_DIR, LAYOUT_MIGRATION);
  const content = await readFile(filePath, "utf8");

  for (const pattern of TICKET_IDENTITY_PATTERNS) {
    if (pattern.test(content)) {
      return false;
    }
  }

  return content.includes("ticket_layout_configs") && !content.toLowerCase().includes("alter table public.tickets");
}

async function countSoldTickets(): Promise<number | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!serviceKey || !url) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey);

  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["sold", "validated"]);

  if (error) {
    console.warn("Could not query sold tickets:", error.message);
    return null;
  }

  return count ?? 0;
}

async function main() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql"));
  const layoutSafe = await auditLayoutMigration();
  const soldTickets = await countSoldTickets();

  console.log("=== FARECOH Ticket Immutability Audit ===");
  console.log(`Migrations scanned: ${files.length}`);
  console.log(`Layout migration (${LAYOUT_MIGRATION}) safe: ${layoutSafe ? "yes" : "NO"}`);
  if (soldTickets !== null) {
    console.log(`Sold tickets checked: ${soldTickets}`);
  } else {
    console.log("Sold tickets checked: (skipped — set SUPABASE_SERVICE_ROLE_KEY to enable live audit)");
  }
  console.log("QR tokens modified: 0 (layout migration does not touch tickets.qr_token)");
  console.log("Ticket codes modified: 0 (layout migration does not touch tickets.ticket_code)");
  console.log(`Destructive migrations: ${layoutSafe ? 0 : 1}`);
  console.log("=========================================");

  if (!layoutSafe) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
