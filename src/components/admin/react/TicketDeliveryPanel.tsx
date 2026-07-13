import { useState, useMemo } from "react";
import { Search, Share2, Clipboard, MessageSquare, Download, ExternalLink, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TicketRow {
  ticket_code: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  sold_at: string | null;
  validated_at: string | null;
}

interface TicketDeliveryPanelProps {
  tickets: TicketRow[];
}

export function TicketDeliveryPanel({ tickets }: TicketDeliveryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingZipGroup, setDownloadingZipGroup] = useState<string | null>(null);
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);

  // Enforce sold or validated status for delivery
  const eligibleTickets = useMemo(() => {
    return tickets.filter((t) => t.status === "sold" || t.status === "validated");
  }, [tickets]);

  // Group tickets in memory by buyer
  const groupedOrders = useMemo(() => {
    const groups: Record<string, {
      buyerName: string;
      buyerPhone: string;
      buyerEmail: string;
      tickets: TicketRow[];
    }> = {};

    eligibleTickets.forEach((ticket) => {
      const name = (ticket.buyer_name || "Sin Nombre").trim();
      const phone = (ticket.buyer_phone || "Sin Teléfono").trim();
      const email = (ticket.buyer_email || "").trim();
      const key = `${name.toLowerCase()}||${phone}`;

      if (!groups[key]) {
        groups[key] = {
          buyerName: name,
          buyerPhone: phone,
          buyerEmail: email,
          tickets: [],
        };
      }
      groups[key].tickets.push(ticket);
    });

    return Object.entries(groups).map(([key, value]) => ({
      key,
      ...value,
    }));
  }, [eligibleTickets]);

  // Search filter
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return groupedOrders;

    return groupedOrders.filter((order) => {
      const matchName = order.buyerName.toLowerCase().includes(q);
      const matchPhone = order.buyerPhone.includes(q);
      const matchEmail = order.buyerEmail.toLowerCase().includes(q);
      const matchTicket = order.tickets.some((t) => t.ticket_code.toLowerCase().includes(q));
      return matchName || matchPhone || matchEmail || matchTicket;
    });
  }, [groupedOrders, searchQuery]);

  // Generate WhatsApp message body
  const getWhatsAppMessage = (buyerName: string, ticketCodes: string[]) => {
    const codesList = ticketCodes.map((code) => `- ${code}`).join("\n");
    return `Hola ${buyerName} 👋\n\nTu compra para el Tributo a Pink Floyd ha sido confirmada.\n\nBoletos:\n${codesList}\n\nAdjuntamos tus boletos digitales.\n\nCada código QR es único y válido para un solo ingreso.\n\n⚠️ No compartas, reenvíes ni publiques estas imágenes.\nLa primera persona que utilice un QR válido podrá ingresar y el código quedará invalidado para cualquier intento posterior.\n\nConserva tus boletos en un lugar seguro y preséntalos el día del evento.`;
  };

  // Open WhatsApp Link
  const handleOpenWhatsApp = (phone: string, buyerName: string, ticketCodes: string[]) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return;
    const normalized = digits.startsWith("504") ? digits : `504${digits}`;
    const text = getWhatsAppMessage(buyerName, ticketCodes);
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noreferrer");
  };

  // Copy Message to Clipboard
  const handleCopyMessage = async (buyerName: string, ticketCodes: string[], key: string) => {
    const text = getWhatsAppMessage(buyerName, ticketCodes);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedGroup(key);
      setTimeout(() => setCopiedGroup(null), 2000);
    } catch (err) {
      alert("Error al copiar al portapapeles.");
    }
  };

  // Download ZIP of all tickets in the group
  const handleDownloadZip = async (buyerName: string, ticketCodes: string[], key: string) => {
    try {
      setDownloadingZipGroup(key);
      const response = await fetch("/api/delivery/ticket-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCodes }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Error al descargar el ZIP.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = buyerName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      a.download = `farecoh-pink-floyd-${cleanName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Error al procesar la descarga de boletos.");
    } finally {
      setDownloadingZipGroup(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informative Warning block */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold mb-1">Instrucciones de Envío por WhatsApp</h4>
          <p>
            WhatsApp no permite adjuntar archivos automáticamente desde un enlace web.
            Descargue las imágenes (individualmente o en ZIP) y adjúntelas manualmente al chat del comprador.
          </p>
        </div>
      </div>

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" />
          <Input
            placeholder="Buscar por comprador, teléfono o código..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold">
            Ventas Totales: {eligibleTickets.length} boletos
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold">
            Grupos de Entrega: {groupedOrders.length} ordenes
          </Badge>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-outline-variant bg-surface-container-lowest">
          <p className="text-on-surface-variant font-medium">No se encontraron órdenes elegibles para entrega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => {
            const ticketCodes = order.tickets.map((t) => t.ticket_code);
            return (
              <Card key={order.key} className="border-outline-variant bg-surface-container-lowest">
                <CardHeader className="border-b border-outline-variant pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-on-surface">
                        {order.buyerName}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-on-surface-variant">
                        <span>📞 {order.buyerPhone}</span>
                        {order.buyerEmail && <span>✉️ {order.buyerEmail}</span>}
                      </CardDescription>
                    </div>

                    {/* Group actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingZipGroup === order.key}
                        onClick={() => handleDownloadZip(order.buyerName, ticketCodes, order.key)}
                      >
                        <Download className="mr-1.5 h-4 w-4" />
                        {downloadingZipGroup === order.key ? "Generando ZIP..." : "Descargar ZIP"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyMessage(order.buyerName, ticketCodes, order.key)}
                      >
                        <Clipboard className="mr-1.5 h-4 w-4" />
                        {copiedGroup === order.key ? "¡Copiado!" : "Copiar mensaje"}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleOpenWhatsApp(order.buyerPhone, order.buyerName, ticketCodes)}
                      >
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Abrir WhatsApp
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                    Boletos en esta orden ({order.tickets.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.tickets.map((ticket) => (
                      <div
                        key={ticket.ticket_code}
                        className="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-low"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-bold text-sm text-on-surface">
                            {ticket.ticket_code}
                          </span>
                          <span className="text-xs text-on-surface-variant flex items-center gap-1">
                            Estado: 
                            <Badge
                              variant={ticket.status === "validated" ? "default" : "secondary"}
                              className="text-[10px] px-1 py-0"
                            >
                              {ticket.status === "validated" ? "Validado" : "Vendido"}
                            </Badge>
                          </span>
                        </div>

                        <div className="flex gap-1.5">
                          <a
                            href={`/api/delivery/ticket-image/${ticket.ticket_code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                            title="Ver boleto en nueva pestaña"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <a
                            href={`/api/delivery/ticket-image/${ticket.ticket_code}?download=true`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-primary hover:bg-primary/10 transition-colors"
                            title="Descargar imagen del boleto"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
