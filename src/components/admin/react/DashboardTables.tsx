import { formatSiteDate } from "@/lib/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";

interface ReservationRow {
  ticket_code: string;
  buyer_name: string | null;
  buyer_phone: string | null;
}

export function RecentReservationsTable({ reservations }: { reservations: ReservationRow[] }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">Reservas recientes</CardTitle>
        <CardDescription>Boletos reservados desde el formulario público</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
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
            {reservations.length ? (
              reservations.map((ticket) => (
                <TableRow key={ticket.ticket_code}>
                  <TableCell className="font-mono font-semibold">{ticket.ticket_code}</TableCell>
                  <TableCell>{ticket.buyer_name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{ticket.buyer_phone || "-"}</TableCell>
                  <TableCell>
                    <TicketStatusBadge status="reserved" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No hay reservas recientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">Check-ins recientes</CardTitle>
        <CardDescription>Últimos ingresos validados en puerta</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
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
            {checkins.length ? (
              checkins.map((row, i) => (
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No hay check-ins registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
