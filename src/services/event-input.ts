export const EVENT_STATUSES = ["draft", "active", "finished", "cancelled"] as const;
export type EventStatus = typeof EVENT_STATUSES[number];

export class EventError extends Error {
  constructor(message: string, readonlyStatus: number = 400) {
    super(message);
    this.status = readonlyStatus;
  }
  readonly status: number;
}

export function eventSlug(title: string): string {
  return title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function validateEvent(input: Record<string, unknown>) {
  function text(key: string) {
    const value = input[key];
    if (value == null) return "";
    if (typeof value !== "string") throw new EventError(`Campo inválido: ${key}.`);
    return value.trim();
  }

  function flag(key: string) {
    const value = input[key] ?? false;
    if (typeof value !== "boolean") throw new EventError(`Campo inválido: ${key}.`);
    return value;
  }

  const title = text("title");
  if (!title) throw new EventError("El título es obligatorio.");
  const slug = text("slug") || eventSlug(title);
  if (slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new EventError("El slug debe contener minúsculas, números y guiones.");
  }
  const event_date = text("event_date");
  const date = new Date(event_date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date) || !Number.isFinite(+date)
      || date.toISOString().slice(0, 10) !== event_date || event_date.startsWith("0000")) {
    throw new EventError("Ingresa una fecha válida.");
  }
  const ticket_price = input.ticket_price;
  const capacity = input.capacity;
  if (typeof ticket_price !== "number" || !Number.isFinite(ticket_price) || ticket_price < 0 || ticket_price > 99999999.99) {
    throw new EventError("Ingresa un precio válido mayor o igual a cero.");
  }
  if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 1 || capacity > 2147483647) {
    throw new EventError("La capacidad debe ser un entero mayor que cero.");
  }
  const status = (text("status") || "draft") as EventStatus;
  if (!EVENT_STATUSES.includes(status)) throw new EventError("Estado inválido.");
  const image_url = text("image_url");
  if (image_url && !/^https?:\/\/[^\s]+$|^\/(?![\/\\])[^\s]*$/i.test(image_url)) {
    throw new EventError("Ingresa una URL de imagen HTTP, HTTPS o una ruta local.");
  }
  const event_time = text("event_time");
  const location = text("location");
  if (!event_time || !location) throw new EventError("La hora y el lugar son obligatorios.");

  return {
    title, slug, event_date, ticket_price, capacity, status, event_time, location,
    subtitle: text("subtitle") || null,
    description: text("description") || null,
    city: text("city") || null,
    image_url: image_url || null,
    published: flag("published"),
    featured: flag("featured"),
    sales_open: flag("sales_open"),
  };
}

export type EventInput = ReturnType<typeof validateEvent>;
