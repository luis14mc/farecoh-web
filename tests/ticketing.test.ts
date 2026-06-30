import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { checkRateLimit, clearRateLimitBuckets } from "../src/lib/rate-limit.ts";
import { sanitizeText } from "../src/lib/security.ts";
import { calculateAdminReportMetrics } from "../src/services/admin-stats.ts";
import { calculateSellerReports } from "../src/services/seller-stats.ts";
import { formatTicketCode, isTicketCode, normalizeTicketCode, parseTicketSequence } from "../src/services/ticket-code.ts";
import { parseCheckinInput } from "../src/lib/qr-input.ts";
import {
  buildCanvaQrImageUrl,
  buildCanvaTicketUrl,
  getCanvaSiteUrl,
} from "../src/lib/canva-export.ts";
import { getValidationDenialReason, transitionTicketToValidated } from "../src/services/ticket-state.ts";

import { getPublicTicketStatusMessage } from "../src/lib/public-ticket-status.ts";

test("ticket template PNG exists and maps to public URL /templates/ticket-pink-floyd.png", async () => {
  const relativePath = "public/templates/ticket-pink-floyd.png";
  const publicPath = "/templates/ticket-pink-floyd.png";

  const diskPath = path.join(process.cwd(), relativePath);
  await access(diskPath);
  const bytes = await readFile(diskPath);
  assert.ok(bytes.byteLength > 10_000, "template PNG should be non-trivial");
  assert.equal(bytes[0], 0x89);
  assert.equal(publicPath, `/templates/${path.basename(diskPath)}`);
});

test("canva export URL helpers use public site base", () => {
  const token = "7b3f4a2e-1c9d-4b8a-9f0e-123456789abc";
  assert.equal(getCanvaSiteUrl(), "https://www.farecoh.org");
  assert.equal(buildCanvaTicketUrl(token), `https://www.farecoh.org/t/${token}`);
  assert.equal(buildCanvaQrImageUrl(token), `https://www.farecoh.org/api/qr/${token}`);
});

test("public ticket status messages are generic and non-PII", () => {
  assert.equal(getPublicTicketStatusMessage("sold"), "Boleto válido para ingreso.");
  assert.equal(getPublicTicketStatusMessage("reserved"), "Boleto reservado, pendiente de confirmación de pago.");
  assert.equal(getPublicTicketStatusMessage("validated"), "Este boleto ya fue utilizado.");
});

test("formatTicketCode creates PF codes with six digits", () => {
  assert.equal(formatTicketCode(1), "PF-000001");
  assert.equal(formatTicketCode(27), "PF-000027");
});

test("parseCheckinInput accepts QR URL, UUID, and ticket code", () => {
  const token = "7b3f4a2e-1c9d-4b8a-9f0e-123456789abc";
  assert.deepEqual(parseCheckinInput(`https://www.farecoh.org/t/${token}`), {
    kind: "qr_token",
    value: token,
  });
  assert.deepEqual(parseCheckinInput(`https://farecoh.org/t/${token}/`), {
    kind: "qr_token",
    value: token,
  });
  assert.deepEqual(parseCheckinInput(token), { kind: "qr_token", value: token });
  assert.deepEqual(parseCheckinInput(" pf-000123 "), { kind: "ticket_code", value: "PF-000123" });
  assert.equal(parseCheckinInput("not-a-code"), null);
});

test("ticket code helpers validate, normalize, and parse codes", () => {
  assert.equal(normalizeTicketCode(" pf-000123 "), "PF-000123");
  assert.equal(isTicketCode("PF-000123"), true);
  assert.equal(isTicketCode("PF-123"), false);
  assert.equal(parseTicketSequence("PF-000123"), 123);
});

test("ticket generation rejects invalid sequences", () => {
  assert.throws(() => formatTicketCode(0));
  assert.throws(() => formatTicketCode(1.5));
});

test("admin report metrics reflect sales, reserved tickets, validations, and capacity", () => {
  const metrics = calculateAdminReportMetrics({
    capacity: 10,
    ticketPrice: 500,
    tickets: [
      { status: "sold" },
      { status: "validated", validated_at: "2026-08-29T20:15:00Z" },
      { status: "reserved" },
      { status: "cancelled" },
    ],
  });

  assert.deepEqual(metrics, {
    ticketsSold: 2,
    ticketsPending: 1,
    ticketsValidated: 1,
    grossRevenue: 1000,
    remainingCapacity: 7,
    checkinRate: 50,
  });
});

test("ticket state transitions only allow sold tickets to validate", () => {
  assert.equal(transitionTicketToValidated("sold"), "validated");
  assert.equal(getValidationDenialReason("reserved"), "Boleto reservado, pago no confirmado");
  assert.throws(() => transitionTicketToValidated("reserved"));
  assert.throws(() => transitionTicketToValidated("validated"));
});

test("sanitizeText removes control characters and limits length", () => {
  assert.equal(sanitizeText("  Luis\n\u0000   Martinez  ", 20), "Luis Martinez");
  assert.equal(sanitizeText("abcdef", 3), "abc");
});

test("seller report metrics aggregate sales, tickets, and revenue by seller", () => {
  const reports = calculateSellerReports({
    ticketPrice: 500,
    sellers: [
      {
        id: "seller-1",
        name: "María López",
        phone: "+504 9999-0001",
        email: "maria@farecoh.org",
        type: "vendor",
        active: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "seller-2",
        name: "Escuela Nacional de Música",
        phone: "+504 2234-5678",
        email: "ventas@enm.hn",
        type: "physical_point",
        active: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    tickets: [
      { seller_id: "seller-1", seller_name: "María López", status: "sold" },
      { seller_id: "seller-1", seller_name: "María López", status: "validated" },
      { seller_id: "seller-2", seller_name: "Escuela Nacional de Música", status: "sold" },
      { seller_id: null, seller_name: null, status: "available" },
    ],
  });

  const maria = reports.find((row) => row.sellerId === "seller-1");
  const school = reports.find((row) => row.sellerId === "seller-2");

  assert.equal(maria?.salesCount, 2);
  assert.equal(maria?.ticketsSold, 2);
  assert.equal(maria?.revenue, 1000);
  assert.equal(school?.salesCount, 1);
  assert.equal(school?.revenue, 500);
});

test("rate limiter blocks repeated requests inside the same window", () => {
  clearRateLimitBuckets();
  assert.equal(checkRateLimit({ key: "ip:test", limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(checkRateLimit({ key: "ip:test", limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(checkRateLimit({ key: "ip:test", limit: 2, windowMs: 60_000 }).allowed, false);
});
