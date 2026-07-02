import assert from "node:assert/strict";
import test from "node:test";
import { isMissingReservedAtColumn } from "../src/services/reservation-queries.ts";

test("detects missing reserved_at column errors from Supabase", () => {
  assert.equal(isMissingReservedAtColumn('column tickets.reserved_at does not exist'), true);
  assert.equal(isMissingReservedAtColumn("Could not find the 'reserved_at' column"), true);
  assert.equal(isMissingReservedAtColumn("permission denied for table tickets"), false);
});
