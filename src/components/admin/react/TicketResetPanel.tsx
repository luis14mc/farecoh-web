import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TicketResetPanelProps {
  onResetComplete?: () => void;
}

export function TicketResetPanel({ onResetComplete }: TicketResetPanelProps) {
  const [input, setInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmReset() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/tickets/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ticketCodes: input }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "No se pudo revertir el boleto.");
      }

      setMessage(payload.message as string);
      setInput("");
      setConfirmOpen(false);
      onResetComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const previewCodes = input
    .split(/[\s,;]+/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="h-4 w-4" />
          Revertir boletos
        </CardTitle>
        <CardDescription>
          Devuelve boletos vendidos, reservados o validados a <strong>disponible</strong>. Elimina ventas y
          check-ins asociados. No modifica el código ni el QR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ticket-reset-codes">Códigos PF (uno por línea o separados por coma)</Label>
          <textarea
            id="ticket-reset-codes"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[88px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            placeholder={"PF-000106\nPF-000107\nPF-000108"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

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

        <Button
          type="button"
          variant="destructive"
          disabled={!input.trim() || loading}
          onClick={() => setConfirmOpen(true)}
        >
          Revertir boletos
        </Button>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirmar reversión
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Los siguientes boletos volverán a disponible y se borrarán sus
              datos de venta/validación:
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-sm">
            {previewCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleConfirmReset()} disabled={loading}>
              {loading ? "Revirtiendo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
