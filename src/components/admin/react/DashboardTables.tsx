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
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Reservas recientes</CardTitle>
          <CardDescription>Boletos reservados desde el formulario público</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No hay reservas recientes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">Reservas recientes</CardTitle>
        <CardDescription>Boletos reservados desde el formulario público</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden sm:block">
          <ResponsiveScrollArea minWidth="560px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((ticket) => (
                  <TableRow key={ticket.ticket_code}>
                    <TableCell className="font-mono font-semibold">{ticket.ticket_code}</TableCell>
                    <TableCell>{ticket.buyer_name || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{ticket.buyer_phone || "-"}</TableCell>
                    <TableCell>
                      <TicketStatusBadge status="reserved" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveScrollArea>
        </div>

        <div className="divide-y sm:hidden">
          {reservations.map((ticket) => (
            <article key={ticket.ticket_code} className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-mono font-semibold">{ticket.ticket_code}</p>
                <p className="mt-1 text-sm">{ticket.buyer_name || "-"}</p>
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
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Check-ins recientes</CardTitle>
          <CardDescription>Últimos ingresos validados en puerta</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No hay check-ins registrados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">Check-ins recientes</CardTitle>
        <CardDescription>Últimos ingresos validados en puerta</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden sm:block">
          <ResponsiveScrollArea minWidth="560px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Validado por</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkins.map((row, i) => (
                  <TableRow key={`${row.ticket?.ticket_code}-${i}`}>
                    <TableCell className="font-mono font-semibold">{row.ticket?.ticket_code || "-"}</TableCell>
                    <TableCell>{row.ticket?.buyer_name || "-"}</TableCell>
                    <TableCell>{row.validated_by || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
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

        <div className="divide-y sm:hidden">
          {checkins.map((row, i) => (
            <article key={`${row.ticket?.ticket_code}-${i}`} className="space-y-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold">{row.ticket?.ticket_code || "-"}</span>
                <span className="text-xs text-muted-foreground">
                  {row.validated_at
                    ? formatSiteDate(row.validated_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "-"}
                </span>
              </div>
              <p className="text-sm">{row.ticket?.buyer_name || "-"}</p>
              <p className="text-xs text-muted-foreground">{row.validated_by || "-"}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
