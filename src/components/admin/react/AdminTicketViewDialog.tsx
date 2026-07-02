import { useEffect, useState } from "react";
import { Loader2, Ticket } from "lucide-react";
import { formatSiteDateTime } from "@/lib/locale";
import { getPublicTicketStatusMessage } from "@/lib/public-ticket-status";
import { buildTicketQrUrl } from "@/lib/ticket-qr-url";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyTextButton } from "@/components/admin/react/CopyTextButton";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";
import { supabase } from "@/lib/supabase";

export interface AdminTicketPreview {
  ticket_code: string;
  qr_token?: string | null;
  status?: string;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  buyer_email?: string | null;
  seller_name?: string | null;
  sale_location?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  sold_at?: string | null;
  validated_at?: string | null;
  reserved_at?: string | null;
  created_at?: string | null;
}

interface AdminTicketViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketCode?: string | null;
  initialTicket?: AdminTicketPreview | null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  return formatSiteDateTime(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminTicketViewDialog({
  open,
  onOpenChange,
  ticketCode,
  initialTicket,
}: AdminTicketViewDialogProps) {
  const [ticket, setTicket] = useState<AdminTicketPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTicket(null);
      setError(null);
      setLoading(false);
      return;
    }

    const code = (ticketCode ?? initialTicket?.ticket_code)?.trim().toUpperCase();
    if (initialTicket) {
      setTicket(initialTicket);
    }

    if (!code) {
      setError("Código de boleto no disponible.");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("tickets")
        .select("*")
        .eq("ticket_code", code)
        .single();

      if (cancelled) return;

      setLoading(false);

      if (fetchError || !data) {
        if (!initialTicket) {
          setError("No se encontró el boleto.");
          setTicket(null);
        }
        return;
      }

      setTicket(data as AdminTicketPreview);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, ticketCode, initialTicket?.ticket_code]);

  const status = ticket?.status ?? initialTicket?.status ?? "available";
  const qrToken = ticket?.qr_token ?? initialTicket?.qr_token;
  const publicUrl = qrToken ? buildTicketQrUrl(qrToken) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Detalle del boleto
          </DialogTitle>
          <DialogDescription>
            Vista operativa dentro del panel admin. No valida ingreso al evento.
          </DialogDescription>
        </DialogHeader>

        {loading && !ticket ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error && !ticket ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : ticket ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Código</p>
                <p className="font-mono text-xl font-bold">{ticket.ticket_code}</p>
              </div>
              <TicketStatusBadge status={status} />
            </div>

            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {getPublicTicketStatusMessage(status)}
            </p>

            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Comprador" value={ticket.buyer_name || "—"} />
              <DetailRow label="Teléfono" value={ticket.buyer_phone || "—"} />
              <DetailRow label="Correo" value={ticket.buyer_email || "—"} />
              <DetailRow label="Vendedor" value={ticket.seller_name || "—"} />
              <DetailRow label="Punto de venta" value={ticket.sale_location || "—"} />
              <DetailRow label="Método de pago" value={ticket.payment_method || "—"} />
              <DetailRow label="Referencia de pago" value={ticket.payment_reference || "—"} />
              {status === "reserved" ? (
                <DetailRow
                  label="Reservado"
                  value={formatTimestamp(ticket.reserved_at ?? ticket.created_at)}
                />
              ) : null}
              <DetailRow label="Vendido" value={formatTimestamp(ticket.sold_at)} />
              <DetailRow label="Validado" value={formatTimestamp(ticket.validated_at)} />
            </dl>

            {qrToken ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-white p-4">
                <img
                  src={`/api/qr/${qrToken}`}
                  alt={`QR ${ticket.ticket_code}`}
                  className="h-40 w-40 rounded-md"
                  width={160}
                  height={160}
                />
                {publicUrl ? (
                  <CopyTextButton value={publicUrl} label="Copiar enlace consulta" />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
