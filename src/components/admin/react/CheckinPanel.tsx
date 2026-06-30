import { useState } from "react";
import { Loader2, Search, UserCheck } from "lucide-react";
import { formatSiteDate } from "@/lib/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";
import { supabase } from "@/lib/supabase";

interface TicketRecord {
  ticket_code: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  seller_name: string | null;
  sale_location: string | null;
  sold_at: string | null;
  validated_at: string | null;
}

export function CheckinPanel() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; variant: "destructive" | "warning" | "success" | "info" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function searchTicket() {
    const ticketCode = code.trim().toUpperCase();
    setTicket(null);

    if (!ticketCode) {
      setMessage({ text: "Ingrese un código de boleto.", variant: "warning" });
      return;
    }
    if (!/^PF-\d{6}$/.test(ticketCode)) {
      setMessage({ text: "Formato inválido. Use PF-000001.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setMessage({ text: "Buscando boleto...", variant: "info" });
    const { data, error } = await supabase.from("tickets").select("*").eq("ticket_code", ticketCode).single();
    setLoading(false);

    if (error || !data) {
      setMessage({ text: "Boleto inexistente.", variant: "destructive" });
      return;
    }

    setTicket(data);
    if (data.status === "sold") setMessage({ text: "Boleto vendido. Puede validar ingreso.", variant: "success" });
    else if (data.status === "validated") setMessage({ text: "Boleto ya utilizado.", variant: "destructive" });
    else if (data.status === "reserved") setMessage({ text: "Boleto reservado, pago no confirmado", variant: "warning" });
    else if (data.status === "available" || data.status === "assigned")
      setMessage({ text: "Boleto no vendido", variant: "warning" });
    else if (data.status === "cancelled") setMessage({ text: "Boleto anulado.", variant: "destructive" });
  }

  async function validateTicket() {
    if (!ticket) return;
    setValidating(true);
    setMessage({ text: "Validando boleto...", variant: "info" });

    const { data, error } = await supabase.rpc("validate_ticket", {
      p_ticket_code: ticket.ticket_code,
      p_validated_by: "admin-checkin",
    });

    setValidating(false);
    setConfirmOpen(false);

    if (error) {
      setMessage({ text: "Error al validar: " + error.message, variant: "destructive" });
      return;
    }

    const result = data?.[0];
    if (!result?.ok) {
      setMessage({ text: result?.message || "No se pudo validar el boleto.", variant: "destructive" });
      return;
    }

    setTicket({ ...ticket, status: "validated", validated_at: result.validated_at });
    setMessage({ text: "Ingreso validado correctamente.", variant: "success" });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Validar ingreso</CardTitle>
          <CardDescription>Ingrese el código PF-000001 y confirme el estado antes de validar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="checkin-code">Código del boleto</Label>
              <Input
                id="checkin-code"
                placeholder="PF-000001"
                className="font-mono text-base"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && void searchTicket()}
              />
            </div>
            <Button type="button" className="w-full sm:mt-7 sm:w-auto sm:shrink-0" onClick={() => void searchTicket()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>

          {message && (
            <Alert variant={message.variant === "destructive" ? "destructive" : message.variant === "success" ? "success" : message.variant === "warning" ? "warning" : "info"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {ticket && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Boleto</p>
                  <h3 className="font-mono text-xl font-semibold">{ticket.ticket_code}</h3>
                </div>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Comprador</dt>
                  <dd className="font-medium">{ticket.buyer_name || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Teléfono</dt>
                  <dd>{ticket.buyer_phone || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Vendedor</dt>
                  <dd>{ticket.seller_name || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Punto</dt>
                  <dd>{ticket.sale_location || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Venta</dt>
                  <dd>{ticket.sold_at ? formatSiteDate(ticket.sold_at, { dateStyle: "medium", timeStyle: "short" }) : "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Validación</dt>
                  <dd>{ticket.validated_at ? formatSiteDate(ticket.validated_at, { dateStyle: "medium", timeStyle: "short" }) : "-"}</dd>
                </div>
              </dl>

              {ticket.status === "sold" && (
                <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setConfirmOpen(true)}>
                  <UserCheck className="h-4 w-4" />
                  Validar ingreso
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar ingreso</DialogTitle>
            <DialogDescription>
              ¿Validar el ingreso del boleto <span className="font-mono font-semibold">{ticket?.ticket_code}</span>?
            </DialogDescription>
          </DialogHeader>

          {ticket && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{ticket.buyer_name || "Sin nombre"}</p>
              <p className="text-muted-foreground">{ticket.buyer_phone || "Sin teléfono"}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={() => void validateTicket()} disabled={validating}>
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Confirmar ingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
