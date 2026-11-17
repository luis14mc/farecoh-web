import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { eventSlug } from "@/services/event-input";
import type { ManagedEvent } from "@/services/events";
import { formatSiteCurrency } from "@/lib/locale";

const statuses = { draft: "Borrador", active: "Activo", finished: "Finalizado", cancelled: "Cancelado" };
const fields = [
  ["title", "Título", "text", true], ["slug", "Slug", "text", false],
  ["subtitle", "Subtítulo", "text", false], ["event_date", "Fecha", "date", true],
  ["event_time", "Hora", "text", true], ["location", "Lugar", "text", true],
  ["city", "Ciudad", "text", false], ["image_url", "Imagen (URL)", "text", false],
  ["ticket_price", "Precio (L)", "number", true], ["capacity", "Capacidad", "number", true],
] as const;

export function EventsAdminPanel({ initialEvents }: { initialEvents: ManagedEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<ManagedEvent | null>();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function open(event: ManagedEvent | null) {
    setError("");
    setTitle(event?.title ?? "");
    setSlug(event?.slug ?? "");
    setEditing(event);
  }

  async function save(id: string | undefined, input: Record<string, unknown>, close = false) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(id ? `/api/admin/events/${id}` : "/api/admin/events", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEvents((previous) => id
        ? previous.map((event) => event.id === id ? result : event)
        : [...previous, result]);
      if (close) setEditing(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el evento.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void save(editing?.id, {
      ...Object.fromEntries(data),
      capacity: Number(data.get("capacity")),
      ticket_price: Number(data.get("ticket_price")),
      featured: data.has("featured"),
      sales_open: data.has("sales_open"),
    }, true);
  }

  return <Card>
    <CardContent className="space-y-4">
      <Button onClick={() => open(null)} disabled={busy}>Crear evento</Button>
      {error && editing === undefined && <p role="alert">{error}</p>}
      <Table>
        <TableHeader><TableRow>
          {["Título", "Fecha", "Lugar", "Precio", "Capacidad", "Vendidos / capacidad", "Estado", "Publicado", "Acciones"].map(
            (label) => <TableHead key={label}>{label}</TableHead>,
          )}
        </TableRow></TableHeader>
        <TableBody>
          {events.map((event) => <TableRow key={event.id}>
            <TableCell>{event.title}</TableCell><TableCell>{event.event_date}</TableCell>
            <TableCell>{event.location}</TableCell><TableCell>{formatSiteCurrency(event.ticket_price)}</TableCell>
            <TableCell>{event.capacity}</TableCell><TableCell>{event.sold} / {event.capacity}</TableCell>
            <TableCell>{statuses[event.status]}</TableCell>
            <TableCell><input type="checkbox" role="switch" aria-label={`Publicar ${event.title}`}
              checked={event.published} disabled={busy} onChange={(change) => void save(event.id, { published: change.target.checked })} /></TableCell>
            <TableCell className="space-x-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => open(event)}>Editar</Button>
              <Button variant="outline" size="sm" asChild><a href={`/admin/batches?event=${event.id}`}>Generar boletos</a></Button>
            </TableCell>
          </TableRow>)}
          {!events.length && <TableRow><TableCell colSpan={9}>Todavía no hay eventos.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Dialog open={editing !== undefined} onOpenChange={(next) => { if (!next && !busy) setEditing(undefined); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>{editing ? "Editar evento" : "Crear evento"}</DialogTitle>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            {fields.map(([key, label, type, required]) => <label key={key} className="grid gap-1">
              {label}
              {key === "title" || key === "slug"
                ? <Input name={key} required={required} value={key === "title" ? title : slug}
                    onChange={(event) => (key === "title" ? setTitle : setSlug)(event.target.value)} />
                : <Input name={key} type={type} required={required} defaultValue={editing?.[key] ?? ""}
                    min={key === "capacity" ? 1 : type === "number" ? 0 : undefined}
                    step={key === "ticket_price" ? "0.01" : undefined} />}
            </label>)}
            <p className="sm:col-span-2 break-all text-sm">Vista previa: /eventos/{slug || eventSlug(title)}</p>
            <label className="grid gap-1 sm:col-span-2">Descripción
              <textarea name="description" rows={3} className="rounded border p-2" defaultValue={editing?.description ?? ""} />
            </label>
            <label className="grid gap-1">Estado
              <select name="status" defaultValue={editing?.status ?? "draft"} className="rounded border bg-background p-2">
                {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="grid gap-1">
              <label><input type="checkbox" name="featured" defaultChecked={editing?.featured} /> Destacado</label>
              <label><input type="checkbox" name="sales_open" defaultChecked={editing?.sales_open} /> Boletería abierta</label>
            </div>
            {error && <p className="sm:col-span-2" role="alert">{error}</p>}
            <Button disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar evento"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </CardContent>
  </Card>;
}
