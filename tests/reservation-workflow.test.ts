import assert from "node:assert/strict";
import test from "node:test";
import { getTicketActionHref } from "../src/lib/ticket-status.ts";
import {
  buildBuyerWhatsAppUrl,
  computeReservationCounters,
  formatReservationAge,
  isOlderThan24h,
  isReservedToday,
  matchesReservationSearch,
} from "../src/services/reservation-stats.ts";

test("reserved ticket actions link to reservations workspace", () => {
  assert.equal(getTicketActionHref("reserved", "PF-000001"), "/admin/reservations?code=PF-000001");
  assert.equal(getTicketActionHref("available", "PF-000002"), "/admin/sales?code=PF-000002");
  assert.equal(getTicketActionHref("sold", "PF-000003"), null);
});

test("buyer WhatsApp URL uses Honduras prefix and prefilled message", () => {
  const url = buildBuyerWhatsAppUrl("9999-9999", "Juan Pérez");
  assert.ok(url?.startsWith("https://wa.me/50499999999?text="));
  assert.match(decodeURIComponent(url ?? ""), /Hola Juan Pérez, le saludamos de FARECOH/);
});

test("reservation search matches code, name, and phone digits", () => {
  const row = {
    ticket_code: "PF-000010",
    qr_token: "token",
    buyer_name: "Ana López",
    buyer_phone: "+504 9999-0001",
    buyer_email: "ana@correo.com",
    created_at: "2026-01-01T00:00:00.000Z",
    reserved_at: "2026-06-30T12:00:00.000Z",
    payment_method: null,
    payment_reference: null,
  };

  assert.equal(matchesReservationSearch(row, "pf-10"), true);
  assert.equal(matchesReservationSearch(row, "ana"), true);
  assert.equal(matchesReservationSearch(row, "50499990001"), true);
  assert.equal(matchesReservationSearch(row, "maria"), false);
});

test("reservation counters aggregate age buckets", () => {
  const now = new Date("2026-06-30T18:00:00.000Z");
  const reservations = [
    {
      ticket_code: "PF-000001",
      qr_token: "a",
      buyer_name: "A",
      buyer_phone: null,
      buyer_email: null,
      created_at: "2026-01-01T00:00:00.000Z",
      reserved_at: "2026-06-30T10:00:00.000Z",
      payment_method: null,
      payment_reference: null,
    },
    {
      ticket_code: "PF-000002",
      qr_token: "b",
      buyer_name: "B",
      buyer_phone: null,
      buyer_email: null,
      created_at: "2026-01-01T00:00:00.000Z",
      reserved_at: "2026-06-28T10:00:00.000Z",
      payment_method: null,
      payment_reference: null,
    },
  ];

  assert.equal(isReservedToday(reservations[0].reserved_at, reservations[0].created_at, now), true);
  assert.equal(isOlderThan24h(reservations[1].reserved_at, reservations[1].created_at, now), true);

  const counters = computeReservationCounters(reservations, 3, now);
  assert.deepEqual(counters, {
    totalReserved: 2,
    reservedToday: 1,
    olderThan24h: 1,
    convertedToSoldToday: 3,
  });
});

test("formatReservationAge returns human-readable elapsed time", () => {
  const now = new Date("2026-06-30T13:00:00.000Z");
  assert.equal(formatReservationAge("2026-06-30T12:30:00.000Z", null, now), "hace 30 min");
});
