import { SITE_LOCALE, SITE_TIMEZONE, formatSiteDate } from "./locale.ts";

function parseEventDateValue(value: string): Date {
  const dateOnly = value.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return new Date(`${dateOnly}T12:00:00-06:00`);
  }
  return new Date(value);
}

/** Compact uppercase label from `events.event_date` (e.g. "29 AGO 2026"). */
export function formatEventCompactDate(value: string): string {
  return formatSiteDate(parseEventDateValue(value), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .replace(/\./g, "")
    .toUpperCase();
}

export function formatEventDateDisplay(value: string): string {
  return parseEventDateValue(value).toLocaleDateString(SITE_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SITE_TIMEZONE,
  });
}

function parseEventTimeTo24Hour(eventTime: string): { hour: number; minute: number } | null {
  const normalized = eventTime.trim().toLowerCase().replace(/\s+/g, " ");
  const match12 = normalized.match(/^(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)$/);
  if (match12) {
    let hour = Number.parseInt(match12[1], 10);
    const minute = Number.parseInt(match12[2], 10);
    const isPm = match12[3].startsWith("p");
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return { hour, minute };
  }

  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return {
      hour: Number.parseInt(match24[1], 10),
      minute: Number.parseInt(match24[2], 10),
    };
  }

  return null;
}

/** Build schema.org startDate from DB `event_date` + `event_time`. */
export function buildEventStartIso(eventDate: string, eventTime: string): string {
  const dateOnly = eventDate.split("T")[0];
  const parts = parseEventTimeTo24Hour(eventTime);
  const hour = parts?.hour ?? 20;
  const minute = parts?.minute ?? 0;
  return `${dateOnly}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-06:00`;
}
