import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTicketCodesInput,
  validateTicketResetCodes,
} from "../src/lib/ticket-reset.ts";

test("parseTicketCodesInput normalizes and deduplicates", () => {
  assert.deepEqual(parseTicketCodesInput("PF-000106, PF-000107\nPF-000106"), [
    "PF-000106",
    "PF-000107",
  ]);
});

test("validateTicketResetCodes rejects invalid and empty input", () => {
  assert.throws(() => validateTicketResetCodes([]), /Indique al menos un código/);
  assert.throws(() => validateTicketResetCodes(["BAD-CODE"]), /Código inválido/);
  assert.deepEqual(validateTicketResetCodes(["PF-000106", "PF-000107"]), ["PF-000106", "PF-000107"]);
});
