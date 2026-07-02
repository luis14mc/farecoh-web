import { createClient } from "@supabase/supabase-js";

const KEEP_CODES = ["PF-000003", "PF-000004", "PF-000005"] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const execute = process.argv.includes("--execute");
const supabase = createClient(requireEnv("PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: keepTickets, error: keepError } = await supabase
  .from("tickets")
  .select("id, ticket_code, status, buyer_name, buyer_phone, buyer_email, reserved_at")
  .in("ticket_code", [...KEEP_CODES]);

if (keepError) throw keepError;
if ((keepTickets ?? []).length !== KEEP_CODES.length) {
  throw new Error(`Expected ${KEEP_CODES.length} keep tickets, found ${keepTickets?.length ?? 0}.`);
}

const badStatus = (keepTickets ?? []).filter((row) => row.status !== "reserved");
if (badStatus.length) {
  throw new Error(`Keep-list tickets must be reserved: ${badStatus.map((r) => r.ticket_code).join(", ")}`);
}

const { data: resetTickets, error: resetError } = await supabase
  .from("tickets")
  .select("id, ticket_code, status")
  .not("ticket_code", "in", `(${KEEP_CODES.join(",")})`);

if (resetError) throw resetError;

const resetIds = (resetTickets ?? []).map((row) => row.id);
const statusBefore = (resetTickets ?? []).reduce<Record<string, number>>((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

console.log("Keep (unchanged):");
for (const row of keepTickets ?? []) {
  console.log(`  ${row.ticket_code}  ${row.buyer_name}  ${row.buyer_phone}`);
}

console.log(`\nReset ${resetIds.length} other tickets to available.`);
console.log("Status breakdown before reset:", statusBefore);

if (!execute) {
  console.log("\nDry run only. Re-run with --execute to apply.");
  process.exit(0);
}

for (const ids of chunk(resetIds, 200)) {
  const { error } = await supabase.from("checkins").delete().in("ticket_id", ids);
  if (error) throw error;
}

for (const ids of chunk(resetIds, 200)) {
  const { error } = await supabase.from("sales").delete().in("ticket_id", ids);
  if (error) throw error;
}

for (const ids of chunk(resetIds, 200)) {
  const { error } = await supabase.from("tickets").update({
    status: "available",
    buyer_name: null,
    buyer_phone: null,
    buyer_email: null,
    seller_id: null,
    seller_name: null,
    sale_location: null,
    payment_method: null,
    payment_reference: null,
    sold_at: null,
    validated_at: null,
    reserved_at: null,
    batch_id: null,
  }).in("id", ids);
  if (error) throw error;
}

const { data: notifications, error: notifListError } = await supabase
  .from("reservation_notifications")
  .select("id, ticket_codes");

if (notifListError && !notifListError.message.includes("does not exist")) {
  throw notifListError;
}

if (!notifListError && notifications?.length) {
  const keepSet = new Set(KEEP_CODES);
  const deleteIds = notifications
    .filter((row) => {
      const codes = row.ticket_codes ?? [];
      return !codes.some((code: string) => keepSet.has(code as (typeof KEEP_CODES)[number]));
    })
    .map((row) => row.id);

  for (const ids of chunk(deleteIds, 200)) {
    if (!ids.length) continue;
    const { error } = await supabase.from("reservation_notifications").delete().in("id", ids);
    if (error) throw error;
  }
}

const { error: auditError } = await supabase
  .from("audit_logs")
  .delete()
  .gte("created_at", "1970-01-01T00:00:00Z");
if (auditError) throw auditError;

const { data: afterKeep, error: afterKeepError } = await supabase
  .from("tickets")
  .select("ticket_code, status, buyer_name")
  .in("ticket_code", [...KEEP_CODES])
  .order("ticket_code");

if (afterKeepError) throw afterKeepError;

const { data: statusCounts, error: countError } = await supabase.from("tickets").select("status");
if (countError) throw countError;

const totals = (statusCounts ?? []).reduce<Record<string, number>>((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

console.log("\nDone. Kept reservations:");
for (const row of afterKeep ?? []) {
  console.log(`  ${row.ticket_code}  ${row.status}  ${row.buyer_name}`);
}

console.log("\nTicket totals:", totals);
