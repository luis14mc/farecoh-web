import { getPinkFloydEventFallback, type EventData } from "@/lib/events";

export type { EventData };

/** Static display snapshot — values mirror getPinkFloydEventFallback(). */
export const pinkFloydEvent: EventData = getPinkFloydEventFallback();
