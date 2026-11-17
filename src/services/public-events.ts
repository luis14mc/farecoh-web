import { getEventBySlug, listEvents, type ManagedEvent } from "./events";

export function listPublicEvents() {
  return listEvents().catch(() => []);
}

export async function getPublicEvent(slug: string) {
  const event = await getEventBySlug(slug).catch(() => null);
  return event?.published ? event : null;
}

export function eventDateLabel(date: string) {
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(date));
}

export function salesAreOpen(event: ManagedEvent) {
  return event.published && event.sales_open && event.status === "active";
}
