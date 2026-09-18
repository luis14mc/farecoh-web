import { query, queryRows, getDbPool } from "../src/lib/db.ts";

const KEEP_CODES = ["PF-000003", "PF-000004", "PF-000005"] as const;

interface TicketRow {
  id: string;
  ticket_code: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  reserved_at: string | null;
}

const execute = process.argv.includes("--execute");

const keepTickets = await queryRows<TicketRow>(
  "SELECT id, ticket_code, status, buyer_name, buyer_phone, buyer_email, reserved_at FROM tickets WHERE ticket_code = ANY($1);",
  [[...KEEP_CODES]]
);

if (keepTickets.length !== KEEP_CODES.length) {
  throw new Error(`Expected ${KEEP_CODES.length} keep tickets, found ${keepTickets.length}.`);
}

const badStatus = keepTickets.filter((row) => row.status !== "reserved");
if (badStatus.length) {
  throw new Error(`Keep-list tickets must be reserved: ${badStatus.map((r) => r.ticket_code).join(", ")}`);
}

const resetTickets = await queryRows<TicketRow>(
  "SELECT id, ticket_code, status FROM tickets WHERE NOT (ticket_code = ANY($1));",
  [[...KEEP_CODES]]
);

const resetIds = resetTickets.map((row) => row.id);
const statusBefore = resetTickets.reduce<Record<string, number>>((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

console.log("Keep (unchanged):");
for (const row of keepTickets) {
  console.log(`  ${row.ticket_code}  ${row.buyer_name}  ${row.buyer_phone}`);
}

console.log(`\nReset ${resetIds.length} other tickets to available.`);
console.log("Status breakdown before reset:", statusBefore);

if (!execute) {
  console.log("\nDry run only. Re-run with --execute to apply.");
  try {
    await getDbPool().end();
  } catch {}
  process.exit(0);
}

if (resetIds.length > 0) {
  await query("DELETE FROM checkins WHERE ticket_id = ANY($1);", [resetIds]);
  await query("DELETE FROM sales WHERE ticket_id = ANY($1);", [resetIds]);
  await query(
    `UPDATE tickets SET
      status = 'available',
      buyer_name = null,
      buyer_phone = null,
      buyer_email = null,
      seller_id = null,
      seller_name = null,
      sale_location = null,
      payment_method = null,
      payment_reference = null,
      sold_at = null,
      validated_at = null,
      reserved_at = null,
      batch_id = null
    WHERE id = ANY($1);`,
    [resetIds]
  );
}

try {
  await query("DELETE FROM reservation_notifications WHERE NOT (ticket_code = ANY($1));", [[...KEEP_CODES]]);
} catch (e: any) {
  if (!e.message?.includes("does not exist")) console.warn(e.message);
}

await query("DELETE FROM audit_logs;");

const afterKeep = await queryRows<TicketRow>(
  "SELECT ticket_code, status, buyer_name FROM tickets WHERE ticket_code = ANY($1) ORDER BY ticket_code;",
  [[...KEEP_CODES]]
);

const statusCounts = await queryRows<{ status: string }>("SELECT status FROM tickets;");
const totals = statusCounts.reduce<Record<string, number>>((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

console.log("\nDone. Kept reservations:");
for (const row of afterKeep) {
  console.log(`  ${row.ticket_code}  ${row.status}  ${row.buyer_name}`);
}

console.log("\nTicket totals:", totals);

try {
  await getDbPool().end();
} catch {}
