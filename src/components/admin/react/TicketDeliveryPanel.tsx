import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Clipboard, MessageSquare, Download, ExternalLink, Info, ShieldCheck, ShieldAlert } from "lucide-react";
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

interface TicketVerificationState {
  loading: boolean;
  identityVerified: boolean;
  statusLabel: string;
  message?: string;
}

const DOWNLOAD_DELAY_MS = 600;

function buildDigitalDownloadUrl(ticketCode: string): string {
  return `/api/delivery/digital-ticket/${ticketCode}?download=true`;
}

function buildDigitalFilename(ticketCode: string): string {
  return `farecoh-digital-${ticketCode}.png`;
}

function buildVerifyUrl(ticketCode: string): string {
  return `/api/delivery/digital-ticket/${ticketCode}/verify`;
}

function formatStatusLabel(status: string): string {
  if (status === "validated") return "Validado";
  if (status === "sold") return "Vendido";
  return status;
}

export function TicketDeliveryPanel({ tickets }: TicketDeliveryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingGroup, setDownloadingGroup] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [downloadBlockedGroup, setDownloadBlockedGroup] = useState<string | null>(null);
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [verificationMap, setVerificationMap] = useState<Record<string, TicketVerificationState>>({});

  const eligibleTickets = useMemo(() => {
    return tickets.filter((t) => t.status === "sold" || t.status === "validated");
  }, [tickets]);

  useEffect(() => {
    let cancelled = false;

    async function verifyTickets() {
      const initial: Record<string, TicketVerificationState> = {};
      eligibleTickets.forEach((ticket) => {
        initial[ticket.ticket_code] = {
          loading: true,
          identityVerified: false,
          statusLabel: formatStatusLabel(ticket.status),
        };
      });
      setVerificationMap(initial);

      await Promise.all(
        eligibleTickets.map(async (ticket) => {
          try {
            const response = await fetch(buildVerifyUrl(ticket.ticket_code), {
              credentials: "same-origin",
              cache: "no-store",
            });
            const payload = await response.json();
            if (cancelled) return;

            setVerificationMap((current) => ({
              ...current,
              [ticket.ticket_code]: {
                loading: false,
                identityVerified: Boolean(payload.identityVerified ?? payload.ok),
                statusLabel: payload.statusLabel ?? formatStatusLabel(ticket.status),
                message: payload.ok ? undefined : payload.message,
              },
            }));
          } catch {
            if (cancelled) return;
            setVerificationMap((current) => ({
              ...current,
              [ticket.ticket_code]: {
                loading: false,
                identityVerified: false,
                statusLabel: formatStatusLabel(ticket.status),
                message: "No se pudo verificar la identidad del boleto.",
              },
            }));
          }
        }),
      );
    }

    if (eligibleTickets.length > 0) {
      verifyTickets();
    } else {
      setVerificationMap({});
    }

    return () => {
      cancelled = true;
    };
  }, [eligibleTickets]);

  const groupedOrders = useMemo(() => {
    const groups: Record<
      string,
      {
        buyerName: string;
        buyerPhone: string;
        buyerEmail: string;
        tickets: TicketRow[];
      }
    > = {};

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

  const isTicketVerified = useCallback(
    (ticketCode: string) => verificationMap[ticketCode]?.identityVerified === true,
    [verificationMap],
  );

  const getWhatsAppMessage = (buyerName: string, ticketCodes: string[]) => {
    const codesList = ticketCodes.map((code) => `- ${code}`).join("\n");
    return `Hola ${buyerName} 👋\n\nTu compra para el Tributo a Pink Floyd ha sido confirmada.\n\nBoletos:\n${codesList}\n\nAdjuntamos tus boletos digitales.\n\nCada código QR es único y válido para un solo ingreso.\n\n⚠️ No compartas, reenvíes ni publiques estas imágenes.\nLa primera persona que utilice un QR válido podrá ingresar y el código quedará invalidado para cualquier intento posterior.\n\nConserva tus boletos en un lugar seguro y preséntalos el día del evento.`;
  };

  const handleOpenWhatsApp = (phone: string, buyerName: string, ticketCodes: string[]) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return;
    const normalized = digits.startsWith("504") ? digits : `504${digits}`;
    const text = getWhatsAppMessage(buyerName, ticketCodes);
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noreferrer");
  };

  const handleCopyMessage = async (buyerName: string, ticketCodes: string[], key: string) => {
    const text = getWhatsAppMessage(buyerName, ticketCodes);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedGroup(key);
      setTimeout(() => setCopiedGroup(null), 2000);
    } catch {
      alert("Error al copiar al portapapeles.");
    }
  };

  const triggerDownload = useCallback(async (ticketCode: string): Promise<boolean> => {
    if (!isTicketVerified(ticketCode)) return false;

    try {
      const response = await fetch(buildDigitalDownloadUrl(ticketCode), { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildDigitalFilename(ticketCode);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }, [isTicketVerified]);

  const handleDownloadSingle = async (ticketCode: string) => {
    if (!isTicketVerified(ticketCode)) {
      alert("La verificación de identidad falló. No se puede descargar este boleto.");
      return;
    }

    setDownloadProgress(`Descargando ${ticketCode}...`);
    const ok = await triggerDownload(ticketCode);
    setDownloadProgress(ok ? `Imagen descargada: ${ticketCode}` : `No se pudo descargar ${ticketCode}.`);
    setTimeout(() => setDownloadProgress(null), 3000);
  };

  const handleDownloadAllImages = async (ticketCodes: string[], key: string) => {
    const verifiedCodes = ticketCodes.filter((code) => isTicketVerified(code));
    if (verifiedCodes.length === 0) {
      alert("Ningún boleto de este grupo pasó la verificación de identidad.");
      return;
    }

    setDownloadingGroup(key);
    setDownloadBlockedGroup(null);

    let successCount = 0;
    let blocked = false;

    for (let index = 0; index < verifiedCodes.length; index += 1) {
      const ticketCode = verifiedCodes[index];
      setDownloadProgress(`Descargando ${index + 1} de ${verifiedCodes.length}`);

      const ok = await triggerDownload(ticketCode);
      if (ok) {
        successCount += 1;
      } else {
        blocked = true;
      }

      if (index < verifiedCodes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_DELAY_MS));
      }
    }

    if (blocked) {
      setDownloadBlockedGroup(key);
    }

    setDownloadProgress(`${successCount} imágenes descargadas.`);
    setDownloadingGroup(null);

    setTimeout(() => setDownloadProgress(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold mb-1">Instrucciones de envío por WhatsApp</h4>
          <p className="mb-2">
            Primero descargue las imágenes verificadas. Luego abra WhatsApp y adjúntelas manualmente al mensaje.
          </p>
          <p>
            La descarga se bloquea si el QR del boleto no coincide con el registro en base de datos.
          </p>
        </div>
      </div>

      {downloadProgress && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          {downloadProgress}
        </div>
      )}

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
            Ventas totales: {eligibleTickets.length} boletos
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold">
            Grupos de entrega: {groupedOrders.length} órdenes
          </Badge>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-outline-variant bg-surface-container-lowest">
          <p className="text-on-surface-variant font-medium">No se encontraron órdenes elegibles para entrega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => {
            const ticketCodes = order.tickets.map((t) => t.ticket_code);
            const verifiedCount = ticketCodes.filter((code) => isTicketVerified(code)).length;
            const isDownloading = downloadingGroup === order.key;
            const allVerified = verifiedCount === ticketCodes.length && ticketCodes.length > 0;

            return (
              <Card key={order.key} className="border-outline-variant bg-surface-container-lowest">
                <CardHeader className="border-b border-outline-variant pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-on-surface">{order.buyerName}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-on-surface-variant">
                        <span>📞 {order.buyerPhone}</span>
                        {order.buyerEmail && <span>✉️ {order.buyerEmail}</span>}
                        <span>🎫 {order.tickets.length} boleto(s)</span>
                        <span>✅ {verifiedCount}/{ticketCodes.length} verificados</span>
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isDownloading || !allVerified}
                        onClick={() => handleDownloadAllImages(ticketCodes, order.key)}
                      >
                        <Download className="mr-1.5 h-4 w-4" />
                        {isDownloading ? "Descargando..." : "Descargar todas las imágenes"}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleOpenWhatsApp(order.buyerPhone, order.buyerName, ticketCodes)}
                      >
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Abrir WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyMessage(order.buyerName, ticketCodes, order.key)}
                      >
                        <Clipboard className="mr-1.5 h-4 w-4" />
                        {copiedGroup === order.key ? "¡Copiado!" : "Copiar mensaje"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  {downloadBlockedGroup === order.key && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      El navegador bloqueó algunas descargas automáticas. Use los botones individuales debajo.
                    </div>
                  )}

                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Boletos en esta orden
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.tickets.map((ticket) => {
                      const verification = verificationMap[ticket.ticket_code];
                      const identityVerified = verification?.identityVerified === true;
                      const verifying = verification?.loading ?? true;

                      return (
                        <div
                          key={ticket.ticket_code}
                          className="flex flex-col gap-3 p-3 rounded-lg border border-outline-variant bg-surface-container-low"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-2">
                              <span className="font-mono font-bold text-sm text-on-surface">
                                Boleto: {ticket.ticket_code}
                              </span>
                              <div className="text-xs text-on-surface-variant space-y-1">
                                <p>Estado: {verification?.statusLabel ?? formatStatusLabel(ticket.status)}</p>
                                <p className="flex items-center gap-1">
                                  {verifying ? (
                                    <>Verificando identidad...</>
                                  ) : identityVerified ? (
                                    <>
                                      <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                                      QR asociado al boleto: Sí
                                    </>
                                  ) : (
                                    <>
                                      <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                                      QR asociado al boleto: No
                                    </>
                                  )}
                                </p>
                                {!verifying && identityVerified && (
                                  <p className="flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                                    Identidad del boleto: Verificada
                                  </p>
                                )}
                                {verification?.message && !identityVerified && (
                                  <p className="text-red-700">{verification.message}</p>
                                )}
                              </div>
                            </div>
                            <a
                              href={`/api/delivery/digital-ticket/${ticket.ticket_code}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                              title="Ver boleto (admin)"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={verifying || !identityVerified}
                            onClick={() => handleDownloadSingle(ticket.ticket_code)}
                          >
                            <Download className="mr-1.5 h-4 w-4" />
                            Descargar imagen
                          </Button>
                        </div>
                      );
                    })}
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
