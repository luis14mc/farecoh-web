import assert from "node:assert/strict";
import test from "node:test";
import { eventSlug, validateEvent } from "../src/services/event-input.ts";

const input = {
  title: "Música & Arte en Vivo", event_date: "2028-02-29", event_time: "7:00 p. m.",
  location: "Tegucigalpa", capacity: 20, ticket_price: 0,
};

test("genera slugs en kebab-case y respeta los slugs explícitos", () => {
  assert.equal(eventSlug("  ¡Niñez y   música! "), "ninez-y-musica");
  assert.equal(validateEvent(input).slug, "musica-arte-en-vivo");
  assert.equal(validateEvent({ ...input, slug: "concierto-2" }).slug, "concierto-2");
  assert.throws(() => validateEvent({ ...input, slug: "slug_Incorrecto" }));
});

test("valida título, fecha, precio, capacidad, estado y publicación", () => {
  assert.equal(validateEvent(input).published, false);
  for (const invalid of [
    { title: " " }, { event_date: "2027-02-29" }, { ticket_price: -1 },
    { capacity: 0 }, { capacity: 1.5 }, { status: "borrador" }, { published: "true" },
  ]) {
    assert.throws(() => validateEvent({ ...input, ...invalid }));
  }
});
