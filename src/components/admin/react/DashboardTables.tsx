import { ArrowUpRight, CalendarCheck, Clock, Inbox } from "lucide-react";
import { formatSiteDate } from "@/lib/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";

interface ReservationRow {
  ticket_code: string;
  buyer_name: string | null;
  buyer_phone: string | null;
}

export function RecentReservationsTable({ reservations }: { reservations: ReservationRow[] }) {
  if (!reservations.length) {
    return (
      <Card className="border-border/60">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Reservas recientes</CardTitle>
          </div>
          <CardDescription>Boletos reservados desde el formulario público</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No hay reservas recientes</p>
          <p className="mt-1 text-xs text-muted-foreground">Las nuevas reservas aparecerán aquí automáticamente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">Reservas recientes</CardTitle>
            </div>
            <CardDescription>Boletos reservados desde el formulario público</CardDescription>
          </div>
          <a
            href="/admin/reservations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <span>Ver todas</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden sm:block">
          <ResponsiveScrollArea minWidth="560px">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px] text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold">Comprador</TableHead>
                  <TableHead className="text-xs font-semibold">Teléfono</TableHead>
                  <TableHead className="w-[100px] text-right text-xs font-semibold">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((ticket) => (
                  <TableRow key={ticket.ticket_code} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      <a
                        href={`/admin/reservations?code=${ticket.ticket_code}`}
                        className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {ticket.ticket_code}
                      </a>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">{ticket.buyer_name || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ticket.buyer_phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <TicketStatusBadge status="reserved" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveScrollArea>
        </div>

        <div className="divide-y divide-border/60 sm:hidden">
          {reservations.map((ticket) => (
            <article key={ticket.ticket_code} className="flex items-start justify-between gap-3 p-4">
              <div>
                <a
                  href={`/admin/reservations?code=${ticket.ticket_code}`}
                  className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-bold text-foreground hover:text-primary"
                >
                  {ticket.ticket_code}
                </a>
                <p className="mt-1.5 text-xs font-medium text-foreground">{ticket.buyer_name || "-"}</p>
                <p className="text-xs text-muted-foreground">{ticket.buyer_phone || "-"}</p>
              </div>
              <TicketStatusBadge status="reserved" />
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface CheckinRow {
  validated_by: string | null;
  validated_at: string | null;
  ticket: { ticket_code?: string; buyer_name?: string | null } | null;
}

export function RecentCheckinsTable({ checkins }: { checkins: CheckinRow[] }) {
  if (!checkins.length) {
    return (
      <Card className="border-border/60">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-sm font-semibold">Check-ins recientes</CardTitle>
          </div>
          <CardDescription>Últimos ingresos validados en puerta</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No hay check-ins registrados</p>
          <p className="mt-1 text-xs text-muted-foreground">Las validaciones en puerta se mostrarán aquí en vivo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-emerald-500" />
          <CardTitle className="text-sm font-semibold">Check-ins recientes</CardTitle>
        </div>
        <CardDescription>Últimos ingresos validados en puerta</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden sm:block">
          <ResponsiveScrollArea minWidth="560px">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px] text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold">Comprador</TableHead>
                  <TableHead className="text-xs font-semibold">Validado por</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkins.map((row, i) => (
                  <TableRow key={`${row.ticket?.ticket_code}-${i}`} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      <span className="rounded bg-muted/60 px-1.5 py-0.5">
                        {row.ticket?.ticket_code || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">{row.ticket?.buyer_name || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.validated_by || "-"}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {row.validated_at
                        ? formatSiteDate(row.validated_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveScrollArea>
        </div>

        <div className="divide-y divide-border/60 sm:hidden">
          {checkins.map((row, i) => (
            <article key={`${row.ticket?.ticket_code}-${i}`} className="space-y-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-bold text-foreground">
                  {row.ticket?.ticket_code || "-"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.validated_at
                    ? formatSiteDate(row.validated_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "-"}
                </span>
              </div>
              <p className="text-xs font-medium text-foreground">{row.ticket?.buyer_name || "-"}</p>
              <p className="text-xs text-muted-foreground">{row.validated_by || "-"}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
