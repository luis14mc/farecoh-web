import { supabase } from "@/lib/supabase";
import { PINK_FLOYD_EVENT_SLUG } from "@/types/events";
import {
  buildEventStartIso,
  formatEventDateDisplay,
  formatEventCompactDate,
} from "@/lib/event-schedule";

export { formatEventCompactDate, formatEventDateDisplay, buildEventStartIso };

export interface EventData {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** ISO date or YYYY-MM-DD — safe for `new Date()`. */
  date: string;
  /** Spanish display string for UI copy. */
  dateDisplay: string;
  /** Display time from DB (`events.event_time`). */
  time: string;
  /** ISO 8601 start datetime for structured data. */
  startsAtIso: string;
  venue: string;
  city: string;
  ticket_price: number;
  total_tickets: number;
  created_at: string;
}

export const PINK_FLOYD_EVENT_ISO = "2026-08-29T20:00:00";
export const PINK_FLOYD_EVENT_ISO_JSON_LD = "2026-08-29T20:00:00-06:00";

const PINK_FLOYD_FALLBACK: EventData = {
  id: PINK_FLOYD_EVENT_SLUG,
  slug: PINK_FLOYD_EVENT_SLUG,
  name: "Tributo a Pink Floyd",
  description: "Concierto tributo sinfónico a Pink Floyd por FARECOH.",
  date: PINK_FLOYD_EVENT_ISO,
  dateDisplay: "29 de agosto de 2026",
  time: "8:00 p. m.",
  startsAtIso: PINK_FLOYD_EVENT_ISO_JSON_LD,
  venue: "Escuela Nacional de Música, Tegucigalpa",
  city: "Tegucigalpa",
  ticket_price: 500,
  total_tickets: 500,
  created_at: "2026-01-01T00:00:00.000Z",
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string;
  city: string | null;
  ticket_price: number;
  capacity: number;
  created_at: string;
};

function mapEventRow(row: EventRow): EventData {
  const city = row.city ?? PINK_FLOYD_FALLBACK.city;
  const venue = row.location.includes(city) ? row.location : `${row.location}, ${city}`;

  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    description: row.description ?? PINK_FLOYD_FALLBACK.description,
    date: row.event_date,
    dateDisplay: formatEventDateDisplay(row.event_date),
    time: row.event_time,
    startsAtIso: buildEventStartIso(row.event_date, row.event_time),
    venue,
    city,
    ticket_price: Number(row.ticket_price),
    total_tickets: row.capacity,
    created_at: row.created_at,
  };
}

export function getPinkFloydEventFallback(): EventData {
  return { ...PINK_FLOYD_FALLBACK };
}

/** @deprecated Use getPinkFloydEventFallback(). Kept for legacy imports. */
export const SEED_EVENT = PINK_FLOYD_FALLBACK;

export async function getPinkFloydEvent(): Promise<EventData> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", PINK_FLOYD_EVENT_SLUG)
    .single();

  if (error || !data) {
    if (import.meta.env.DEV) {
      console.warn(
        "[events] Pink Floyd event not found in Supabase, using fallback:",
        error?.message ?? "no row",
      );
    }
    return getPinkFloydEventFallback();
  }

  return mapEventRow(data as EventRow);
}

/** @deprecated Use getPinkFloydEvent(). Kept for legacy imports. */
export const getEvent = getPinkFloydEvent;
