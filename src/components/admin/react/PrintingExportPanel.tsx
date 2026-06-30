import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCanvaExportFilename } from "@/lib/canva-export";
import { isTicketCode, normalizeTicketCode } from "@/services/ticket-code";

interface EventOption {
  id: string;
  slug: string;
  name: string;
}

interface BatchOption {
  id: string;
  event_id: string;
  name: string;
  start_code: string;
  end_code: string;
}

interface PrintingExportPanelProps {
  events: EventOption[];
  batches: BatchOption[];
}

export function PrintingExportPanel({ events, batches }: PrintingExportPanelProps) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [batchId, setBatchId] = useState<string>("none");
  const [startCode, setStartCode] = useState("");
  const [endCode, setEndCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const eventBatches = useMemo(
    () => batches.filter((batch) => batch.event_id === eventId),
    [batches, eventId],
  );

  const selectedEvent = events.find((event) => event.id === eventId);
  const selectedBatch = eventBatches.find((batch) => batch.id === batchId) ?? null;

  useEffect(() => {
    if (!eventId && events[0]?.id) {
      setEventId(events[0].id);
    }
  }, [eventId, events]);

  useEffect(() => {
    if (batchId === "none") return;
    const batch = eventBatches.find((item) => item.id === batchId);
    if (!batch) {
      setBatchId("none");
      return;
    }
    setStartCode(batch.start_code);
    setEndCode(batch.end_code);
  }, [batchId, eventBatches]);

  useEffect(() => {
    setBatchId("none");
    setStartCode("");
    setEndCode("");
  }, [eventId]);

  function validateForm(): string | null {
    if (!eventId) return "Seleccione un evento.";
    const start = normalizeTicketCode(startCode);
    const end = normalizeTicketCode(endCode);
    if (!isTicketCode(start) || !isTicketCode(end)) {
      return "Use códigos válidos, por ejemplo PF-000001.";
    }
    if (Number(start.split("-")[1]) > Number(end.split("-")[1])) {
      return "El boleto inicial debe ser menor o igual al final.";
    }
    if (selectedBatch) {
      const startSeq = Number(start.split("-")[1]);
      const endSeq = Number(end.split("-")[1]);
      const batchStart = Number(selectedBatch.start_code.split("-")[1]);
      const batchEnd = Number(selectedBatch.end_code.split("-")[1]);
      if (startSeq < batchStart || endSeq > batchEnd) {
        return "El rango debe estar dentro del lote seleccionado.";
      }
    }
    return null;
  }

  function handleExport() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const params = new URLSearchParams({
      event_id: eventId,
      start_code: normalizeTicketCode(startCode),
      end_code: normalizeTicketCode(endCode),
    });
    if (batchId !== "none") {
      params.set("batch_id", batchId);
    }

    window.location.href = `/admin/printing/export.csv?${params.toString()}`;
  }

  const previewFilename =
    selectedEvent && isTicketCode(normalizeTicketCode(startCode)) && isTicketCode(normalizeTicketCode(endCode))
      ? formatCanvaExportFilename(selectedEvent.slug, normalizeTicketCode(startCode), normalizeTicketCode(endCode))
      : "farecoh-event-batch-001-100.csv";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Exportación Canva
        </CardTitle>
        <CardDescription>
          Genere un CSV con URLs de consulta e imágenes QR para Canva Bulk Create. No modifica boletos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Evento</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione evento" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Lote (opcional)</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin lote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin lote / rango manual</SelectItem>
                {eventBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name} ({batch.start_code} – {batch.end_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-code">Boleto inicial</Label>
            <Input
              id="start-code"
              className="font-mono"
              placeholder="PF-000001"
              value={startCode}
              onChange={(e) => setStartCode(e.target.value.toUpperCase())}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-code">Boleto final</Label>
            <Input
              id="end-code"
              className="font-mono"
              placeholder="PF-000100"
              value={endCode}
              onChange={(e) => setEndCode(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Archivo</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{previewFilename}</p>
          <p className="mt-2 text-muted-foreground">
            Columnas: ticket_code, qr_url, qr_image, status, event, batch (UTF-8)
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="button" className="w-full sm:w-auto" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export for Canva
        </Button>
      </CardContent>
    </Card>
  );
}
