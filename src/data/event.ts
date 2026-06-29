export interface EventData {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  ticket_price: number;
  created_at: string;
}

export const pinkFloydEvent: EventData = {
  id: "pink-floyd",
  name: "Tributo a Pink Floyd",
  date: "29 de agosto de 2026",
  time: "7:00 p. m.",
  venue: "Anfiteatro del Salvador, Tegucigalpa",
  city: "Tegucigalpa",
  ticket_price: 500,
  created_at: new Date("2026-01-01").toISOString(),
};
