import assert from "node:assert/strict";
import test from "node:test";
import { buildReservationNotificationMessage } from "../src/services/notifications/reservation-notification-message.ts";

test("reservation notification message includes buyer and ticket codes", () => {
  const message = buildReservationNotificationMessage({
    ticketCodes: ["PF-000001", "PF-000002"],
    buyerName: "Juan Pérez",
    buyerPhone: "+504 9999-9999",
    buyerEmail: "juan@correo.com",
  });

  assert.match(message, /Nueva reserva FARECOH/);
  assert.match(message, /Evento: Tributo a Pink Floyd/);
  assert.match(message, /Boletos: PF-000001, PF-000002/);
  assert.match(message, /Cliente: Juan Pérez/);
  assert.match(message, /Teléfono: \+504 9999-9999/);
  assert.match(message, /Correo: juan@correo.com/);
  assert.match(message, /Estado: Pendiente de confirmación de pago/);
  assert.match(message, /Panel: https:\/\/www\.farecoh\.org\/admin\/reservations/);
});

test("reservation notification message uses placeholders for missing contact fields", () => {
  const message = buildReservationNotificationMessage({
    ticketCodes: ["PF-000010"],
    buyerName: "Ana López",
    buyerPhone: "",
    buyerEmail: "",
  });

  assert.match(message, /Teléfono: —/);
  assert.match(message, /Correo: —/);
});
