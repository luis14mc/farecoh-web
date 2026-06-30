import { useEffect, useState } from "react";
import { Loader2, Search, UserCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";
import { supabase } from "@/lib/supabase";
import { TICKET_STATUS_LABELS } from "@/lib/ticket-status";

export function TicketSearchQuick({ siteLocale }: { siteLocale: string }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; variant: "info" | "success" | "warning" | "destructive" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Record<string, string | null> | null>(null);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("code");
    if (initial) {
      setCode(initial);
      void searchTicket(initial);
    }
  }, []);

  async function searchTicket(query: string) {
    const clean = query.trim().toUpperCase();
    if (!clean) {
      setMessage({ text: "Por favor ingrese un código de boleto.", variant: "warning" });
      setTicket(null);
      return;
    }

    setLoading(true);
    setValidated(false);
    const { data, error } = await supabase.from("tickets").select("*").eq("ticket_code", clean).single();
    setLoading(false);

    if (error || !data) {
      setMessage({ text: "Boleto no encontrado. Verifique el código.", variant: "destructive" });
      setTicket(null);
      return;
    }

    setTicket(data);
    setMessage({ text: "Boleto encontrado.", variant: "success" });
  }

  async function validateTicket() {
    if (!ticket) return;
    setValidating(true);
    try {
      const { data, error } = await supabase.rpc("validate_ticket", {
        p_ticket_code: ticket.ticket_code,
        p_validated_by: "admin-dashboard",
      });
      if (error) throw error;
      const result = data?.[0];
      if (!result?.ok) throw new Error(result?.message || "No se pudo validar el boleto.");
      setValidated(true);
      setTicket({ ...ticket, status: "validated", validated_at: result.validated_at });
      setMessage({ text: "Entrada validada correctamente.", variant: "success" });
    } catch {
      setMessage({ text: "Error al validar el ingreso. Intente de nuevo.", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  }

  const canValidate = ticket?.status === "sold" && !validated;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Control de acceso rápido</CardTitle>
        <CardDescription>Busque y valide boletos desde el panel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="checkin-search">Buscar por código</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="checkin-search"
              className="min-w-0 flex-1 font-mono"
              placeholder="PF-000001"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && void searchTicket(code)}
            />
            <Button type="button" className="w-full sm:w-auto" onClick={() => void searchTicket(code)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>
        </div>

        {message && (
          <Alert variant={message.variant === "destructive" ? "destructive" : message.variant === "success" ? "success" : message.variant === "warning" ? "warning" : "info"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {ticket && (
          <div className="rounded-lg border border-dashed p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Boleto encontrado</p>
                <p className="font-mono text-lg font-semibold">{ticket.ticket_code}</p>
              </div>
              <TicketStatusBadge status={ticket.status || "available"} />
            </div>

            <dl className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b pb-2">
                <dt className="text-muted-foreground">Comprador</dt>
                <dd className="font-medium">{ticket.buyer_name || "Invitado"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-2">
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>{ticket.buyer_phone || "Sin teléfono"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-2">
                <dt className="text-muted-foreground">Estado</dt>
                <dd>{TICKET_STATUS_LABELS[ticket.status as keyof typeof TICKET_STATUS_LABELS] || ticket.status}</dd>
              </div>
              {ticket.status === "validated" && ticket.validated_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Ingreso</dt>
                  <dd className="font-medium text-green-700">
                    {new Date(ticket.validated_at).toLocaleTimeString(siteLocale, { hour: "numeric", minute: "2-digit" })}
                  </dd>
                </div>
              )}
            </dl>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!canValidate || validating || validated}
              onClick={() => void validateTicket()}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : validated ? (
                "Acceso concedido"
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Validar ingreso
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
