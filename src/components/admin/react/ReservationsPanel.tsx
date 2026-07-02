import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Eye,
  MessageCircle,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { AdminTicketViewDialog } from "@/components/admin/react/AdminTicketViewDialog";
import { formatSiteDate, formatSiteDateTime, formatSiteNumber } from "@/lib/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SaleFormFields, getSaleSubmitState } from "@/components/admin/react/SaleFormFields";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildBuyerWhatsAppUrl,
  computeReservationCounters,
  formatReservationAge,
  matchesReservationAgeFilter,
  matchesReservationSearch,
  resolveReservationTimestamp,
  type ReservationAgeFilter,
  type ReservationCounters,
  type ReservationTicketRow,
} from "@/services/reservation-stats";

interface Seller {
  id: string;
  name: string;
  type: string;
}

interface ReservationsPanelProps {
  reservations: ReservationTicketRow[];
  sellers: Seller[];
  convertedToSoldToday: number;
  formMessage?: string;
  formError?: boolean;
  cancelMessage?: string;
  cancelError?: boolean;
}

function CounterCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "red" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-600"
      : tone === "red"
        ? "text-red-600"
        : tone === "green"
          ? "text-green-600"
          : "text-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={toneClass}>{formatSiteNumber(value)}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function ReservationsPanel({
  reservations,
  sellers,
  convertedToSoldToday,
  formMessage,
  formError,
  cancelMessage,
  cancelError,
}: ReservationsPanelProps) {
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState<ReservationAgeFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<ReservationTicketRow | null>(null);
  const [viewTicket, setViewTicket] = useState<ReservationTicketRow | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const counters: ReservationCounters = useMemo(
    () => computeReservationCounters(reservations, convertedToSoldToday),
    [reservations, convertedToSoldToday],
  );

  const paymentMethods = useMemo(() => {
    const values = new Set<string>();
    reservations.forEach((row) => {
      if (row.payment_method) values.add(row.payment_method);
    });
    return Array.from(values).sort();
  }, [reservations]);

  const filtered = useMemo(() => {
    return reservations.filter((row) => {
      if (!matchesReservationSearch(row, search)) return false;
      if (!matchesReservationAgeFilter(row, ageFilter)) return false;
      if (paymentFilter !== "all" && row.payment_method !== paymentFilter) return false;
      return true;
    });
  }, [reservations, search, ageFilter, paymentFilter]);

  const confirmPreview = activeTicket ? { status: "reserved" } : null;
  const { submitDisabled, submitLabel } = getSaleSubmitState(confirmPreview);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCode = params.get("code");
    if (initialCode) {
      const ticket = reservations.find((row) => row.ticket_code === initialCode.trim().toUpperCase());
      if (ticket) openConfirmModal(ticket);
    }
    if (formMessage) setConfirmOpen(true);
  }, [formMessage, reservations]);

  function openConfirmModal(ticket: ReservationTicketRow) {
    setActiveTicket(ticket);
    setConfirmCode(ticket.ticket_code);
    setBuyerName(ticket.buyer_name || "");
    setBuyerPhone(ticket.buyer_phone || "");
    setBuyerEmail(ticket.buyer_email || "");
    setConfirmOpen(true);
  }

  function openCancelModal(ticket: ReservationTicketRow) {
    setActiveTicket(ticket);
    setCancelReason("");
    setCancelOpen(true);
  }

  function openTicketView(ticket: ReservationTicketRow) {
    setViewTicket(ticket);
    setViewOpen(true);
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CounterCard label="Total reservados" value={counters.totalReserved} tone="amber" />
        <CounterCard label="Reservados hoy" value={counters.reservedToday} />
        <CounterCard label="Más de 24 h" value={counters.olderThan24h} tone="red" />
        <CounterCard label="Confirmados hoy" value={counters.convertedToSoldToday} tone="green" />
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Busque reservas pendientes de confirmación de pago.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 xl:col-span-2">
            <Label htmlFor="reservation-search">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reservation-search"
                className="pl-9"
                placeholder="Código, nombre o teléfono"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Antigüedad</Label>
            <Select value={ageFilter} onValueChange={(value) => setAgeFilter(value as ReservationAgeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="today">Reservadas hoy</SelectItem>
                <SelectItem value="older_24h">Más de 24 h</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Reservas pendientes</CardTitle>
              <CardDescription>
                Mostrando {filtered.length} de {reservations.length} reservas activas
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              Seguimiento operativo
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No hay reservas que coincidan con los filtros.</p>
          ) : (
            <>
              <div className="hidden lg:block">
                <ResponsiveScrollArea minWidth="1120px">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Correo</TableHead>
                        <TableHead>Reservado</TableHead>
                        <TableHead>Antigüedad</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((ticket) => {
                        const reservedAt = resolveReservationTimestamp(ticket.reserved_at, ticket.created_at);
                        const whatsappUrl = ticket.buyer_phone
                          ? buildBuyerWhatsAppUrl(ticket.buyer_phone, ticket.buyer_name || "cliente")
                          : null;

                        return (
                          <TableRow key={ticket.ticket_code}>
                            <TableCell className="font-mono font-semibold">{ticket.ticket_code}</TableCell>
                            <TableCell className="font-medium">{ticket.buyer_name || "—"}</TableCell>
                            <TableCell>{ticket.buyer_phone || "—"}</TableCell>
                            <TableCell className="max-w-[180px] truncate">{ticket.buyer_email || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {reservedAt ? formatSiteDateTime(reservedAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </TableCell>
                            <TableCell>{formatReservationAge(ticket.reserved_at, ticket.created_at)}</TableCell>
                            <TableCell>{ticket.payment_reference || "—"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" size="sm" onClick={() => openConfirmModal(ticket)}>
                                  <ShieldCheck className="h-4 w-4" />
                                  Confirmar pago
                                </Button>
                                {whatsappUrl ? (
                                  <Button asChild size="sm" variant="outline">
                                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                                      <MessageCircle className="h-4 w-4" />
                                      Contactar
                                    </a>
                                  </Button>
                                ) : null}
                                <Button type="button" size="sm" variant="outline" onClick={() => openTicketView(ticket)}>
                                  <Eye className="h-4 w-4" />
                                  Ver boleto
                                </Button>
                                <Button type="button" size="sm" variant="destructive" onClick={() => openCancelModal(ticket)}>
                                  <Trash2 className="h-4 w-4" />
                                  Cancelar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ResponsiveScrollArea>
              </div>

              <div className="divide-y lg:hidden">
                {filtered.map((ticket) => {
                  const reservedAt = resolveReservationTimestamp(ticket.reserved_at, ticket.created_at);
                  const whatsappUrl = ticket.buyer_phone
                    ? buildBuyerWhatsAppUrl(ticket.buyer_phone, ticket.buyer_name || "cliente")
                    : null;

                  return (
                    <article key={ticket.ticket_code} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-base font-semibold">{ticket.ticket_code}</p>
                          <p className="mt-1 text-sm font-medium">{ticket.buyer_name || "Sin comprador"}</p>
                        </div>
                        <TicketStatusBadge status="reserved" />
                      </div>

                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Teléfono</dt>
                          <dd>{ticket.buyer_phone || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Correo</dt>
                          <dd className="truncate">{ticket.buyer_email || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Reservado</dt>
                          <dd>{reservedAt ? formatSiteDate(reservedAt) : "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Antigüedad</dt>
                          <dd>{formatReservationAge(ticket.reserved_at, ticket.created_at)}</dd>
                        </div>
                      </dl>

                      {ticket.payment_reference ? (
                        <p className="text-xs text-muted-foreground">Referencia: {ticket.payment_reference}</p>
                      ) : null}

                      <div className="flex flex-col gap-2">
                        <Button type="button" size="sm" className="w-full" onClick={() => openConfirmModal(ticket)}>
                          <ShieldCheck className="h-4 w-4" />
                          Confirmar pago
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          {whatsappUrl ? (
                            <Button asChild size="sm" variant="outline" className="w-full">
                              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                                <MessageCircle className="h-4 w-4" />
                                Contactar
                              </a>
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="w-full" disabled>
                              Sin teléfono
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => openTicketView(ticket)}>
                            <Eye className="h-4 w-4" />
                            Ver boleto
                          </Button>
                        </div>
                        <Button type="button" size="sm" variant="destructive" className="w-full" onClick={() => openCancelModal(ticket)}>
                          <Trash2 className="h-4 w-4" />
                          Cancelar reserva
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirmar pago</DialogTitle>
            <DialogDescription>
              Convierte la reserva en venta confirmada usando el flujo estándar de pago.
            </DialogDescription>
          </DialogHeader>

          <form id="reservation-confirm-form" method="POST" className="space-y-4">
            <input type="hidden" name="action" value="confirm_payment" />
            <SaleFormFields
              formId="reservation-confirm-form"
              code={confirmCode}
              onCodeChange={setConfirmCode}
              buyerName={buyerName}
              buyerPhone={buyerPhone}
              buyerEmail={buyerEmail}
              buyerReadonly
              onBuyerNameChange={setBuyerName}
              onBuyerPhoneChange={setBuyerPhone}
              onBuyerEmailChange={setBuyerEmail}
              sellers={sellers}
              ticketStatus="reserved"
              submitDisabled={submitDisabled}
              submitLabel={submitLabel}
              formMessage={formMessage}
              formError={formError}
            />
          </form>
        </DialogContent>
      </Dialog>

      <AdminTicketViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        ticketCode={viewTicket?.ticket_code}
        initialTicket={
          viewTicket
            ? {
                ...viewTicket,
                status: "reserved",
              }
            : null
        }
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              Libera el boleto {activeTicket?.ticket_code}. El QR se conserva y el boleto vuelve a disponible.
            </DialogDescription>
          </DialogHeader>

          <form method="POST" className="space-y-4">
            <input type="hidden" name="action" value="cancel_reservation" />
            <input type="hidden" name="ticket_code" value={activeTicket?.ticket_code ?? ""} />

            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motivo</Label>
              <textarea
                id="cancel-reason"
                name="reason"
                required
                rows={3}
                placeholder="Ej. Cliente no completó el pago"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button type="submit" variant="destructive" className="w-full">
              <XCircle className="h-4 w-4" />
              Confirmar cancelación
            </Button>

            {cancelMessage ? (
              <Alert variant={cancelError ? "destructive" : "success"}>
                <AlertDescription>{cancelMessage}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
