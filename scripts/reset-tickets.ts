#!/usr/bin/env node
/**
 * Reset specific tickets to available (CLI).
 * Usage: pnpm reset:tickets PF-000106 PF-000107 --execute
 */
import { createClient } from "@supabase/supabase-js";
import { resetTicketsToAvailable } from "../src/lib/ticket-reset.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const args = process.argv.slice(2).filter((arg) => arg !== "--execute");
const execute = process.argv.includes("--execute");

if (args.length === 0) {
  console.error("Usage: pnpm reset:tickets PF-000106 PF-000107 ... [--execute]");
  process.exit(1);
}

const supabase = createClient(
  requireEnv("PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: before, error: beforeError } = await supabase
  .from("tickets")
  .select("ticket_code, status, buyer_name, seller_name")
  .in("ticket_code", args)
  .order("ticket_code");

if (beforeError) throw beforeError;

console.log("Tickets before reset:");
for (const row of before ?? []) {
  console.log(`  ${row.ticket_code}  status=${row.status}  buyer=${row.buyer_name ?? "-"}`);
}

if (!execute) {
  console.log("\nDry run only. Re-run with --execute to apply.");
  process.exit(0);
}

const result = await resetTicketsToAvailable(supabase, args, { performedBy: "cli-reset" });

console.log("\nReset:", result.reset);
if (result.skipped.length) console.log("Skipped (already available):", result.skipped);

const { data: after, error: afterError } = await supabase
  .from("tickets")
  .select("ticket_code, status, buyer_name")
  .in("ticket_code", args)
  .order("ticket_code");

if (afterError) throw afterError;

console.log("\nTickets after reset:");
for (const row of after ?? []) {
  console.log(`  ${row.ticket_code}  status=${row.status}  buyer=${row.buyer_name ?? "-"}`);
}
