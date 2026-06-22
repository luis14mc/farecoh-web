import type { Event } from "@/lib/ticketing";

export const pinkFloydEvent: Event = {
  id: "pink-floyd",
  name: "Tributo a Pink Floyd",
  date: "29 de agosto de 2026",
  time: "8:00 p. m.",
  venue: "Escuela Nacional de Música",
  city: "Tegucigalpa",
  ticket_price: 500,
  created_at: new Date("2026-01-01").toISOString(),
};
