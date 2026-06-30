import { useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { formatSiteDate } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
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

function FilterFields({
  codeFilter,
  setCodeFilter,
  statusFilter,
  setStatusFilter,
  sellerFilter,
  setSellerFilter,
  locationFilter,
  setLocationFilter,
  sellers,
  locations,
}: {
  codeFilter: string;
  setCodeFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  sellerFilter: string;
  setSellerFilter: (v: string) => void;
  locationFilter: string;
  setLocationFilter: (v: string) => void;
  sellers: string[];
  locations: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
  );
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

  const filterProps = {
    codeFilter,
    setCodeFilter,
    statusFilter,
    setStatusFilter,
    sellerFilter,
    setSellerFilter,
    locationFilter,
    setLocationFilter,
    sellers,
    locations,
  };

  return (
    <Card>
      <div className="border-b bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
          <p className="text-sm font-medium">Filtros</p>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle>Filtrar boletos</SheetTitle>
              </SheetHeader>
              <FilterFields {...filterProps} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden md:block">
          <FilterFields {...filterProps} />
        </div>

        <div className="mt-3 md:hidden">
          <div className="space-y-2">
            <Label htmlFor="code-filter-mobile">Código</Label>
            <Input id="code-filter-mobile" placeholder="PF-000001" className="font-mono" value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} />
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No hay boletos que coincidan con los filtros.</p>
        ) : (
          <>
            <div className="hidden lg:block">
              <ResponsiveScrollArea minWidth="980px">
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
              </ResponsiveScrollArea>
            </div>

            <div className="divide-y lg:hidden">
              {filtered.map((ticket) => {
                const actionText = getTicketActionLabel(ticket.status);
                return (
                  <article key={ticket.ticket_code} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-base font-semibold">{ticket.ticket_code}</p>
                        <p className="mt-1 text-sm font-medium">{ticket.buyer_name || "Sin comprador"}</p>
                        <p className="text-xs text-muted-foreground">{ticket.buyer_phone || "-"}</p>
                      </div>
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>{ticket.seller_name || "Sin vendedor"}</span>
                      <span className="text-right">{ticket.sold_at ? formatSiteDate(ticket.sold_at) : "-"}</span>
                      <span className="col-span-2">{ticket.sale_location || "Sin punto"}</span>
                    </div>
                    {canConfirmPayment(ticket.status) ? (
                      <Button asChild size="sm" className="w-full">
                        <a href={`/admin/sales?code=${ticket.ticket_code}`}>{actionText}</a>
                      </Button>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground">{actionText}</p>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          Mostrando {filtered.length} de {tickets.length} boletos
        </span>
        <Button asChild size="sm" className="hidden w-full sm:inline-flex sm:w-auto">
          <a href="/admin/sales">
            <Plus className="h-4 w-4" />
            Registrar venta
          </a>
        </Button>
      </CardFooter>

      <div className="fixed bottom-4 left-4 right-4 z-30 lg:hidden">
        <Button asChild className="h-12 w-full shadow-lg">
          <a href="/admin/sales">
            <Plus className="h-4 w-4" />
            Registrar venta
          </a>
        </Button>
      </div>
    </Card>
  );
}
