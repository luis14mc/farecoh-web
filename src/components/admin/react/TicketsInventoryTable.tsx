import { useMemo, useState } from "react";
import { formatSiteDate } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";
import { canConfirmPayment, getTicketActionLabel } from "@/lib/ticket-status";

interface TicketRow {
  ticket_code: string;
  status: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  seller_name: string | null;
  sale_location: string | null;
  sold_at: string | null;
}

interface TicketsInventoryTableProps {
  tickets: TicketRow[];
  sellers: string[];
  locations: string[];
}

export function TicketsInventoryTable({ tickets, sellers, locations }: TicketsInventoryTableProps) {
  const [codeFilter, setCodeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = codeFilter.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesCode = !q || ticket.ticket_code.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesSeller = sellerFilter === "all" || ticket.seller_name === sellerFilter;
      const matchesLocation = locationFilter === "all" || ticket.sale_location === locationFilter;
      return matchesCode && matchesStatus && matchesSeller && matchesLocation;
    });
  }, [tickets, codeFilter, statusFilter, sellerFilter, locationFilter]);

  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 border-b bg-muted/30 p-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="code-filter">Código</Label>
          <Input id="code-filter" placeholder="PF-000001" className="font-mono" value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponible</SelectItem>
              <SelectItem value="assigned">Asignado</SelectItem>
              <SelectItem value="reserved">Reservado</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
              <SelectItem value="validated">Validado</SelectItem>
              <SelectItem value="cancelled">Anulado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Vendedor</Label>
          <Select value={sellerFilter} onValueChange={setSellerFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller} value={seller}>
                  {seller}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Punto de venta</Label>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Punto</TableHead>
              <TableHead>Fecha venta</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((ticket) => {
              const actionText = getTicketActionLabel(ticket.status);
              return (
                <TableRow key={ticket.ticket_code}>
                  <TableCell className="font-mono font-semibold">{ticket.ticket_code}</TableCell>
                  <TableCell>
                    <TicketStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="font-medium">{ticket.buyer_name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{ticket.buyer_phone || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{ticket.seller_name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{ticket.sale_location || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{ticket.sold_at ? formatSiteDate(ticket.sold_at) : "-"}</TableCell>
                  <TableCell className="text-right">
                    {canConfirmPayment(ticket.status) ? (
                      <a className="text-sm font-semibold text-primary hover:underline" href={`/admin/sales?code=${ticket.ticket_code}`}>
                        {actionText}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">{actionText}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          Mostrando {filtered.length} de {tickets.length} boletos
        </span>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <a href="/admin/sales">Registrar venta</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
