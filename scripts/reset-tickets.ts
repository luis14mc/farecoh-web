#!/usr/bin/env node
/**
 * Reset specific tickets to available (CLI).
 * Usage: pnpm reset:tickets PF-000106 PF-000107 --execute
 */
import { queryRows, getDbPool } from "../src/lib/db.ts";
import { resetTicketsToAvailable } from "../src/lib/ticket-reset.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--execute");
const execute = process.argv.includes("--execute");

if (args.length === 0) {
  console.error("Usage: pnpm reset:tickets PF-000106 PF-000107 ... [--execute]");
  process.exit(1);
}

const before = await queryRows<{
  ticket_code: string;
  status: string;
  buyer_name: string | null;
  seller_name: string | null;
}>(
  "SELECT ticket_code, status, buyer_name, seller_name FROM tickets WHERE ticket_code = ANY($1) ORDER BY ticket_code;",
  [args]
);

console.log("Tickets before reset:");
for (const row of before) {
  console.log(`  ${row.ticket_code}  status=${row.status}  buyer=${row.buyer_name ?? "-"}`);
}

if (!execute) {
  console.log("\nDry run only. Re-run with --execute to apply.");
  try {
    await getDbPool().end();
  } catch {}
  process.exit(0);
}

const result = await resetTicketsToAvailable(args, { performedBy: "cli-reset" });

console.log("\nReset:", result.reset);
if (result.skipped.length) console.log("Skipped (already available):", result.skipped);

const after = await queryRows<{
  ticket_code: string;
  status: string;
  buyer_name: string | null;
}>(
  "SELECT ticket_code, status, buyer_name FROM tickets WHERE ticket_code = ANY($1) ORDER BY ticket_code;",
  [args]
);

console.log("\nTickets after reset:");
for (const row of after) {
  console.log(`  ${row.ticket_code}  status=${row.status}  buyer=${row.buyer_name ?? "-"}`);
}

try {
  await getDbPool().end();
} catch {}
