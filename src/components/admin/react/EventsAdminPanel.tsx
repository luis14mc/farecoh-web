import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, ExternalLink, MapPin, Pencil, Plus, Search, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventSlug } from "@/services/event-input";
import type { ManagedEvent } from "@/services/events";
import { formatSiteCurrency } from "@/lib/locale";
import { cn } from "@/lib/utils";

type Status = ManagedEvent["status"];

const STATUS: Record<Status, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  active: { label: "Activo", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  finished: { label: "Finalizado", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700 ring-red-200" },
};

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
        checked ? "bg-[#005082]" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const textareaClass =
  "min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EventsAdminPanel({ initialEvents }: { initialEvents: ManagedEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<ManagedEvent | null>();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...events].sort((a, b) => b.event_date.localeCompare(a.event_date));
    return q ? sorted.filter((e) => `${e.title} ${e.location} ${e.city ?? ""}`.toLowerCase().includes(q)) : sorted;
  }, [events, query]);

  const totals = useMemo(
    () => ({
      published: events.filter((e) => e.published).length,
      open: events.filter((e) => e.sales_open && e.status === "active").length,
    }),
    [events],
  );

  function open(event: ManagedEvent | null) {
    setFormError("");
    setTitle(event?.title ?? "");
    setSlug(event?.slug ?? "");
    setEditing(event);
  }

  async function request(id: string | undefined, input: Record<string, unknown>) {
    const response = await fetch(id ? `/api/admin/events/${id}` : "/api/admin/events", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el evento.");
    return result as ManagedEvent;
  }

  function upsert(saved: ManagedEvent, id?: string) {
    setEvents((prev) => (id ? prev.map((e) => (e.id === id ? saved : e)) : [...prev, saved]));
  }

  async function togglePublished(event: ManagedEvent, published: boolean) {
    setBusyId(event.id);
    setListError("");
    try {
      upsert(await request(event.id, { published }), event.id);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "No se pudo actualizar el evento.");
    } finally {
      setBusyId(null);
    }
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    setSaving(true);
    setFormError("");
    try {
      const saved = await request(editing?.id, {
        ...Object.fromEntries(data),
        capacity: Number(data.get("capacity")),
        ticket_price: Number(data.get("ticket_price")),
        published: data.has("published"),
        featured: data.has("featured"),
        sales_open: data.has("sales_open"),
      });
      upsert(saved, editing?.id);
      setEditing(undefined);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el evento.");
    } finally {
      setSaving(false);
    }
  }

  const previewSlug = slug || eventSlug(title);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título o lugar"
            className="pl-9"
            aria-label="Buscar eventos"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-muted-foreground md:block">
            {events.length} eventos · {totals.published} publicados · {totals.open} con boletería abierta
          </p>
          <Button onClick={() => open(null)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Crear evento
          </Button>
        </div>
      </div>

      {listError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {listError}
          <button onClick={() => setListError("")} aria-label="Cerrar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <CalendarDays className="h-9 w-9 text-muted-foreground/60" />
            <p className="font-semibold">{events.length ? "Ningún evento coincide con la búsqueda" : "Todavía no hay eventos"}</p>
            {!events.length && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => open(null)}>
                Crear el primer evento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((event) => {
            const pct = event.capacity ? Math.round((event.sold / event.capacity) * 100) : 0;
            const status = STATUS[event.status];
            return (
              <Card key={event.id} className="border-border/70 shadow-none transition-colors hover:border-border">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center md:p-5">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[#005082] text-white">
                      <span className="text-lg font-bold leading-none">{event.event_date.slice(8)}</span>
                      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/75">
                        {new Intl.DateTimeFormat("es-HN", { month: "short", timeZone: "UTC" }).format(new Date(event.event_date)).replace(".", "")}
                      </span>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{event.title}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", status.className)}>
                          {status.label}
                        </span>
                        {event.featured && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                            Destacado
                          </span>
                        )}
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {dateLabel(event.event_date)} · {event.event_time}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">
                        Vendidos <span className="tabular font-semibold text-foreground">{event.sold}</span> / {event.capacity}
                      </span>
                      <span className="tabular font-semibold text-foreground">{formatSiteCurrency(event.ticket_price)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-[#0069a8]" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="flex items-center gap-4 pt-1 text-xs">
                      <label className="inline-flex items-center gap-2">
                        <Toggle
                          checked={event.published}
                          disabled={busyId === event.id}
                          onChange={(next) => void togglePublished(event, next)}
                          label={`Publicar ${event.title}`}
                        />
                        <span className={event.published ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {event.published ? "Publicado" : "Oculto"}
                        </span>
                      </label>
                      {event.sales_open && event.status === "active" && (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Boletería abierta
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => open(event)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <a href={`/admin/batches?event=${event.id}`}>
                        <Ticket className="h-3.5 w-3.5" />
                        Boletos
                      </a>
                    </Button>
                    {event.published && (
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
                        <a href={`/eventos/${event.slug}`} target="_blank" rel="noreferrer" aria-label={`Ver ${event.title} en el sitio`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(next) => { if (!next && !saving) setEditing(undefined); }}>
        <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <div className="border-b border-border/60 px-6 py-4">
            <DialogTitle className="text-lg">{editing ? "Editar evento" : "Nuevo evento"}</DialogTitle>
            <DialogDescription className="text-xs">
              Los eventos publicados aparecen en la portada y en /eventos.
            </DialogDescription>
          </div>

          <form id="event-form" onSubmit={submit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="Título *" className="sm:col-span-2">
                <Input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Concierto de Navidad" />
              </Field>
              <Field label="Subtítulo" className="sm:col-span-2" hint="Frase corta que aparece bajo el título.">
                <Input name="subtitle" defaultValue={editing?.subtitle ?? ""} />
              </Field>
              <Field label="Dirección web (slug)" className="sm:col-span-2" hint={`farecoh.org/eventos/${previewSlug || "…"}`}>
                <Input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={eventSlug(title) || "se-genera-del-titulo"} />
              </Field>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <p className="sm:col-span-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha y lugar</p>
              <Field label="Fecha *">
                <Input name="event_date" type="date" required defaultValue={editing?.event_date ?? ""} />
              </Field>
              <Field label="Hora *">
                <Input name="event_time" required defaultValue={editing?.event_time ?? ""} placeholder="7:00 p. m." />
              </Field>
              <Field label="Lugar *">
                <Input name="location" required defaultValue={editing?.location ?? ""} placeholder="Teatro Manuel Bonilla" />
              </Field>
              <Field label="Ciudad">
                <Input name="city" defaultValue={editing?.city ?? ""} placeholder="Tegucigalpa" />
              </Field>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <p className="sm:col-span-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Boletería</p>
              <Field label="Precio (L) *">
                <Input name="ticket_price" type="number" min={0} step="0.01" required defaultValue={editing?.ticket_price ?? ""} />
              </Field>
              <Field label="Capacidad *">
                <Input name="capacity" type="number" min={1} required defaultValue={editing?.capacity ?? ""} />
              </Field>
              <Field label="Estado">
                <select name="status" defaultValue={editing?.status ?? "draft"} className={selectClass}>
                  {(Object.keys(STATUS) as Status[]).map((value) => (
                    <option key={value} value={value}>{STATUS[value].label}</option>
                  ))}
                </select>
              </Field>
            </section>

            <section className="grid gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contenido</p>
              <Field label="Imagen" hint="URL https:// o ruta del sitio, por ejemplo /images/evento/hero.webp">
                <Input name="image_url" defaultValue={editing?.image_url ?? ""} placeholder="https://…" />
              </Field>
              <Field label="Descripción">
                <textarea name="description" rows={4} className={textareaClass} defaultValue={editing?.description ?? ""} />
              </Field>
            </section>

            <section className="grid gap-2 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
              {[
                ["published", "Publicado", "Visible en el sitio", editing?.published],
                ["featured", "Destacado", "Aparece primero", editing?.featured],
                ["sales_open", "Boletería abierta", "Permite reservas", editing?.sales_open],
              ].map(([name, label, hint, checked]) => (
                <label key={name as string} className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" name={name as string} defaultChecked={Boolean(checked)} className="mt-0.5 h-4 w-4 accent-[#005082]" />
                  <span className="leading-tight">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="text-[11px] text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </section>
          </form>

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 bg-muted/20 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p role="alert" className="text-sm text-red-700">{formError}</p>
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(undefined)}>
                Cancelar
              </Button>
              <Button type="submit" form="event-form" disabled={saving}>
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear evento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
