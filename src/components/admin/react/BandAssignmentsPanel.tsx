import { useMemo, useState } from "react";
import { Music2, Plus, Trash2, X } from "lucide-react";
import type { BandMusicianView } from "@/lib/band-assignments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";

interface BandAssignmentsPanelProps {
  musicians: BandMusicianView[];
}

export function BandAssignmentsPanel({ musicians: initialMusicians }: BandAssignmentsPanelProps) {
  const [musicians, setMusicians] = useState(initialMusicians);
  const [newMusicianName, setNewMusicianName] = useState("");
  const [selectedMusicianId, setSelectedMusicianId] = useState(initialMusicians[0]?.id ?? "");
  const [ticketInput, setTicketInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalTickets = useMemo(
    () => musicians.reduce((sum, musician) => sum + musician.tickets.length, 0),
    [musicians],
  );

  async function reloadAssignments() {
    window.location.reload();
  }

  async function postAction(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/band-assignments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "No se pudo completar la operación.");
      }
      setMessage(payload.message as string);
      await reloadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMusician(event: React.FormEvent) {
    event.preventDefault();
    await postAction({ action: "create_musician", name: newMusicianName });
    setNewMusicianName("");
  }

  async function handleAddTickets(event: React.FormEvent) {
    event.preventDefault();
    await postAction({
      action: "add_tickets",
      musicianId: selectedMusicianId,
      ticketCodes: ticketInput,
    });
    setTicketInput("");
  }

  async function handleRemoveTicket(assignmentId: string, ticketCode: string) {
    const confirmed = window.confirm(`¿Quitar ${ticketCode} de la lista de control?`);
    if (!confirmed) return;
    await postAction({ action: "remove_ticket", assignmentId });
  }

  async function handleDeleteMusician(musician: BandMusicianView) {
    const confirmed = window.confirm(
      `¿Eliminar a ${musician.name} y sus ${musician.tickets.length} boleto(s) de la lista?`,
    );
    if (!confirmed) return;
    await postAction({ action: "delete_musician", musicianId: musician.id });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Music2 className="h-4 w-4" />
            Control de boletos — banda
          </CardTitle>
          <CardDescription>
            Lista de referencia para saber qué boleto tiene asignado cada músico. No cambia el estado de venta ni
            validación del boleto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{musicians.length} músicos</Badge>
            <Badge variant="outline">{totalTickets} boletos asignados</Badge>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Nuevo músico</CardTitle>
            <CardDescription>Agregue integrantes de la banda para asignarles boletos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void handleCreateMusician(event)}>
              <div className="space-y-2">
                <Label htmlFor="musician-name">Nombre</Label>
                <Input
                  id="musician-name"
                  placeholder="Ej. Mauricio"
                  value={newMusicianName}
                  onChange={(event) => setNewMusicianName(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !newMusicianName.trim()}>
                <Plus className="h-4 w-4" />
                Agregar músico
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Asignar boletos</CardTitle>
            <CardDescription>
              Acepta códigos como <span className="font-mono">481</span> o{" "}
              <span className="font-mono">PF-000481</span>, separados por coma o salto de línea.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void handleAddTickets(event)}>
              <div className="space-y-2">
                <Label htmlFor="musician-select">Músico</Label>
                <select
                  id="musician-select"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  value={selectedMusicianId}
                  onChange={(event) => setSelectedMusicianId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Seleccione un músico
                  </option>
                  {musicians.map((musician) => (
                    <option key={musician.id} value={musician.id}>
                      {musician.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-codes">Boletos</Label>
                <textarea
                  id="ticket-codes"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[96px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  placeholder={"481\n297\n383"}
                  value={ticketInput}
                  onChange={(event) => setTicketInput(event.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={loading || !selectedMusicianId || !ticketInput.trim()}
              >
                Asignar boletos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {musicians.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Todavía no hay músicos registrados.
            </CardContent>
          </Card>
        ) : (
          musicians.map((musician) => (
            <Card key={musician.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">{musician.name}</CardTitle>
                  <CardDescription>
                    {musician.tickets.length} boleto{musician.tickets.length === 1 ? "" : "s"} asignado
                    {musician.tickets.length === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => void handleDeleteMusician(musician)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </CardHeader>
              <CardContent>
                {musician.tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin boletos asignados.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {musician.tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                      >
                        <span className="font-mono text-sm font-semibold">{ticket.ticket_code}</span>
                        {ticket.ticket_status ? <TicketStatusBadge status={ticket.ticket_status} /> : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={loading}
                          aria-label={`Quitar ${ticket.ticket_code}`}
                          onClick={() => void handleRemoveTicket(ticket.id, ticket.ticket_code)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
