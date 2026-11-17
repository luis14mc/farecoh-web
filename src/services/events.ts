import { getDbPool, queryOne, queryRows } from "@/lib/db";
import { EventError, validateEvent, type EventInput } from "./event-input";

export interface ManagedEvent extends EventInput {
  id: string;
  updated_at: string;
  sold: number;
}

const eventFields = `e.*, e.event_date::text AS event_date, e.ticket_price::float8 AS ticket_price,
  (SELECT count(*)::int FROM public.tickets t WHERE t.event_id = e.id AND t.status IN ('sold', 'validated')) AS sold`;
const selectEvent = `SELECT ${eventFields} FROM public.events e`;

export function listEvents({ includeUnpublished = false } = {}) {
  return queryRows<ManagedEvent>(`${selectEvent}
    WHERE ($1 OR e.published)
    ORDER BY e.event_date >= (now() AT TIME ZONE 'America/Tegucigalpa')::date DESC,
      e.featured DESC,
      CASE WHEN e.event_date >= (now() AT TIME ZONE 'America/Tegucigalpa')::date THEN e.event_date END,
      e.event_date DESC, e.slug`, [includeUnpublished]);
}

export function getEventBySlug(slug: string) {
  return queryOne<ManagedEvent>(`${selectEvent} WHERE e.slug = $1`, [slug]);
}

export function getEventById(id: string) {
  if (!isEventId(id)) return Promise.resolve(null);
  return queryOne<ManagedEvent>(`${selectEvent} WHERE e.id = $1`, [id]);
}

function isEventId(id: string) {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id);
}

async function saveEvent(id: string | null, input: Record<string, unknown>, actor: string) {
  if (id !== null && !isEventId(id)) throw new EventError("Evento no encontrado.", 404);
  const client = await getDbPool().connect();
  try {
    await client.query("BEGIN");
    const current = id === null ? undefined : (await client.query<ManagedEvent>(
      `${selectEvent} WHERE e.id = $1 FOR UPDATE OF e`, [id],
    )).rows[0];
    if (id !== null && !current) throw new EventError("Evento no encontrado.", 404);
    const event = validateEvent({ ...current, ...input });
    if (current && event.capacity < current.capacity) {
      const { rows } = await client.query("SELECT count(*)::int AS total FROM public.tickets WHERE event_id = $1", [id]);
      if (event.capacity < rows[0].total) throw new EventError("La capacidad es menor que los boletos generados.");
    }
    const values = [event.title, event.slug, event.event_date, event.event_time, event.location,
      event.city, event.description, event.ticket_price, event.capacity, event.status,
      event.subtitle, event.image_url, event.published, event.featured, event.sales_open];
    const result = current
      ? await client.query<ManagedEvent>(`UPDATE public.events AS e SET
          (title, slug, event_date, event_time, location, city, description, ticket_price, capacity, status,
           subtitle, image_url, published, featured, sales_open) =
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          WHERE id = $16 RETURNING ${eventFields}`, [...values, id])
      : await client.query<ManagedEvent>(`INSERT INTO public.events AS e
          (title, slug, event_date, event_time, location, city, description, ticket_price, capacity, status,
           subtitle, image_url, published, featured, sales_open)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          RETURNING ${eventFields}`, values);
    const saved = result.rows[0];
    const actions = current ? ["event.updated"] : ["event.created"];
    if ((current?.published ?? false) !== saved.published) {
      actions.push(saved.published ? "event.published" : "event.unpublished");
    }
    for (const action of actions) {
      await client.query(
        "INSERT INTO public.audit_logs (action, entity, entity_id, performed_by) VALUES ($1, 'events', $2, $3)",
        [action, saved.id, actor],
      );
    }
    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505") throw new EventError("El slug ya está en uso.", 409);
    throw error;
  } finally {
    client.release();
  }
}

export const createEvent = (input: Record<string, unknown>, actor: string) => saveEvent(null, input, actor);
export const updateEvent = (id: string, input: Record<string, unknown>, actor: string) => saveEvent(id, input, actor);
export const setEventPublished = (id: string, published: boolean, actor: string) => updateEvent(id, { published }, actor);
