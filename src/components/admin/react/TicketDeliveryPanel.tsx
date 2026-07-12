import { useMemo, useState } from "react";
import { Copy, Download, ExternalLink, MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatSiteDate } from "@/lib/locale";
import { buildTicketQrUrl } from "@/lib/ticket-qr-url";

interface SoldTicket {
  ticket_code: string;
  qr_token: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  sold_at: string | null;
}

interface DeliveryGroup {
  key: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  soldAt: string | null;
  tickets: SoldTicket[];
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("504")) return digits;
  return `504${digits}`;
}

function groupTickets(tickets: SoldTicket[]): DeliveryGroup[] {
  const groups = new Map<string, DeliveryGroup>();

  for (const ticket of tickets) {
    const buyerPhone = ticket.buyer_phone?.trim() ?? "";
    const buyerEmail = ticket.buyer_email?.trim().toLowerCase() ?? "";
    const buyerName = ticket.buyer_name?.trim() || "Comprador sin nombre";
    const key = buyerPhone || buyerEmail || `${buyerName}-${ticket.sold_at?.slice(0, 10) ?? "sin-fecha"}`;

    const existing = groups.get(key);
    if (existing) {
      existing.tickets.push(ticket);
      if (!existing.soldAt || (ticket.sold_at && ticket.sold_at < existing.soldAt)) {
        existing.soldAt = ticket.sold_at;
      }
      continue;
    }

    groups.set(key, {
      key,
      buyerName,
      buyerPhone,
      buyerEmail,
      soldAt: ticket.sold_at,
      tickets: [ticket],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      tickets: [...group.tickets].sort((a, b) => a.ticket_code.localeCompare(b.ticket_code)),
    }))
    .sort((a, b) => (b.soldAt ?? "").localeCompare(a.soldAt ?? ""));
}

function buildMessage(group: DeliveryGroup): string {
  const lines = group.tickets.flatMap((ticket) => [
    `🎫 ${ticket.ticket_code}`,
    buildTicketQrUrl(ticket.qr_token),
  ]);

  return [
    `Hola ${group.buyerName} 👋`,
    "",
    "Gracias por apoyar a FARECOH. Tu compra ha sido confirmada.",
    "",
    "Evento: Tributo a Pink Floyd",
    "Fecha: 29 de agosto de 2026",
    "Hora: 8:00 PM",
    "Lugar: Escuela Nacional de Música",
    "",
    `Boletos confirmados (${group.tickets.length}):`,
    ...lines,
    "",
    "Cada QR es único y válido para un solo ingreso.",
    "Conserva este mensaje y presenta cada boleto en la entrada.",
  ].join("\n");
}

function downloadManifest(group: DeliveryGroup): void {
  const content = buildMessage(group);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `farecoh-${group.tickets[0]?.ticket_code ?? "boletos"}-${group.tickets.length}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function TicketDeliveryPanel({ tickets }: { tickets: SoldTicket[] }) {
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const groups = useMemo(() => groupTickets(tickets), [tickets]);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return groups;
    return groups.filter((group) => {
      const haystack = [
        group.buyerName,
        group.buyerPhone,
        group.buyerEmail,
        ...group.tickets.map((ticket) => ticket.ticket_code),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(clean);
    });
  }, [groups, query]);

  async function copyMessage(group: DeliveryGroup) {
    await navigator.clipboard.writeText(buildMessage(group));
    setCopiedKey(group.key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  }

  function openWhatsApp(group: DeliveryGroup) {
    const phone = normalizePhone(group.buyerPhone);
    const message = encodeURIComponent(buildMessage(group));
    const target = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compradores</CardDescription>
            <CardTitle className="text-2xl">{groups.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Boletos vendidos</CardDescription>
            <CardTitle className="text-2xl">{tickets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>QR modificados</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">0</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preparar entrega</CardTitle>
          <CardDescription>
            Esta vista reutiliza los códigos y tokens existentes. No regenera ni modifica ningún QR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por comprador, teléfono, correo o boleto"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay ventas que coincidan con la búsqueda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((group) => (
            <Card key={group.key}>
              <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg">{group.buyerName}</CardTitle>
                  <CardDescription className="mt-1">
                    {group.buyerPhone || "Sin teléfono"}
                    {group.buyerEmail ? ` · ${group.buyerEmail}` : ""}
                    {group.soldAt ? ` · ${formatSiteDate(group.soldAt)}` : ""}
                  </CardDescription>
                </div>
                <Badge variant="outline">{group.tickets.length} boleto{group.tickets.length === 1 ? "" : "s"}</Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.tickets.map((ticket) => (
                    <div key={ticket.ticket_code} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono font-semibold">{ticket.ticket_code}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Vendido</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={`/t/${ticket.qr_token}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Ver boleto
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap">
                  <Button onClick={() => openWhatsApp(group)} disabled={!group.buyerPhone}>
                    <MessageCircle className="h-4 w-4" />
                    Abrir WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => void copyMessage(group)}>
                    <Copy className="h-4 w-4" />
                    {copiedKey === group.key ? "Mensaje copiado" : "Copiar mensaje"}
                  </Button>
                  <Button variant="outline" onClick={() => downloadManifest(group)}>
                    <Download className="h-4 w-4" />
                    Descargar resumen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
