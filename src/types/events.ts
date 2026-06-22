import type { EventStatus } from "./database";

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  location: string;
  city: string;
  eventDate: string;
  eventTime: string;
  ticketPrice: number;
  capacity: number;
  status: EventStatus;
}

export const PINK_FLOYD_EVENT_SLUG = "pink-floyd";