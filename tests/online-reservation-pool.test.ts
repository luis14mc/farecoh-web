import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const migrationPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations/20260826_exclude_batch_tickets_from_online_reservation.sql",
);

test("create_ticket_order migration excludes batch and band-control tickets", () => {
  const sql = readFileSync(migrationPath, "utf8");
  assert.match(sql, /AND t\.batch_id IS NULL/);
  assert.match(sql, /band_musician_tickets/);
  assert.match(sql, /AND t\.status = 'available'/);
});

test("staff reserve migration supports batch tickets and restore on cancel", () => {
  const sql = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../supabase/migrations/20260827_staff_reserve_ticket.sql"),
    "utf8",
  );
  assert.match(sql, /staff_reserve_ticket/);
  assert.match(sql, /'available', 'assigned'/);
  assert.match(sql, /WHEN v_ticket\.batch_id IS NOT NULL THEN 'assigned'/);
});
