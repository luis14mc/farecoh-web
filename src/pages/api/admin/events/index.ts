import type { APIRoute } from "astro";
import { createEvent, listEvents } from "@/services/events";
import { eventResponse, readEventInput } from "@/services/events-api";

export const GET: APIRoute = (context) => eventResponse(context, () => listEvents({ includeUnpublished: true }));
export const POST: APIRoute = (context) => eventResponse(context,
  async (actor) => createEvent(await readEventInput(context.request), actor), 201);
