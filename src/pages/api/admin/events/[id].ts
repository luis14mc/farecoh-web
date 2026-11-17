import type { APIRoute } from "astro";
import { getEventById, setEventPublished, updateEvent } from "@/services/events";
import { EventError } from "@/services/event-input";
import { eventResponse, readEventInput } from "@/services/events-api";

export const GET: APIRoute = (context) => eventResponse(context, async () => {
  const event = await getEventById(context.params.id ?? "");
  if (!event) throw new EventError("Evento no encontrado.", 404);
  return event;
});
export const PATCH: APIRoute = (context) => eventResponse(context, async (actor) => {
  const input = await readEventInput(context.request);
  const id = context.params.id ?? "";
  if (Object.keys(input).length === 1 && typeof input.published === "boolean") {
    return setEventPublished(id, input.published, actor);
  }
  return updateEvent(id, input, actor);
});
