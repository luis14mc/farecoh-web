import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBandTicketCodeInput,
  parseBandTicketCodesInput,
  validateBandTicketCodes,
} from "../src/lib/band-assignments.ts";

test("parseBandTicketCodeInput accepts PF codes and bare numbers", () => {
  assert.equal(parseBandTicketCodeInput("481"), "PF-000481");
  assert.equal(parseBandTicketCodeInput(" pf-000481 "), "PF-000481");
  assert.equal(parseBandTicketCodeInput("PF-481"), "PF-000481");
  assert.equal(parseBandTicketCodeInput("abc"), null);
});

test("parseBandTicketCodesInput normalizes and deduplicates", () => {
  assert.deepEqual(parseBandTicketCodesInput("481, 481\n297"), ["PF-000481", "PF-000297"]);
});

test("validateBandTicketCodes rejects empty and invalid input", () => {
  assert.throws(() => validateBandTicketCodes([]), /Indique al menos un código/);
  assert.throws(() => validateBandTicketCodes(["PF-000001", "bad"]), /Código inválido/);
  assert.deepEqual(validateBandTicketCodes(["PF-000001"]), ["PF-000001"]);
});

test("canAccessRoute restricts band assignments to admins", async () => {
  const { canAccessRoute } = await import("../src/lib/rbac-policy.ts");
  assert.equal(canAccessRoute("super_admin", "/admin/band-assignments"), true);
  assert.equal(canAccessRoute("event_manager", "/admin/band-assignments"), true);
  assert.equal(canAccessRoute("seller", "/admin/band-assignments"), false);
});
