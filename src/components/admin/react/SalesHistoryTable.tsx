import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatSiteCurrency, formatSiteDate } from "@/lib/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/admin/react/NativeSelect";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SaleRow {
  created_at: string;
  amount: number | string;
  payment_method: string;
  seller_name: string;
  sales_point: string;
  ticket: {
    ticket_code: string;
    buyer_name: string | null;
    buyer_phone: string | null;
    buyer_email: string | null;
  } | null;
}

interface SalesHistoryTableProps {
  sales: SaleRow[];
}

export function SalesHistoryTable({ sales }: SalesHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("all");
  const [date, setDate] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter((sale) => {
      const ticket = sale.ticket;
      const buyer = ticket?.buyer_name?.toLowerCase() || "";
      const seller = sale.seller_name.toLowerCase();
      const code = ticket?.ticket_code.toLowerCase() || "";
      const dateStr = new Date(sale.created_at).toISOString().split("T")[0];
      const matchesSearch = !q || buyer.includes(q) || seller.includes(q) || code.includes(q);
      const matchesPayment = payment === "all" || sale.payment_method.toLowerCase() === payment;
      const matchesDate = !date || dateStr === date;
      return matchesSearch && matchesPayment && matchesDate;
    });
  }, [sales, search, payment, date]);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">Historial de ventas</CardTitle>
        <CardDescription>Vea y filtre las transacciones registradas</CardDescription>
      </CardHeader>

      <div className="grid grid-cols-1 gap-4 border-b bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3 md:p-6">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="sales-search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="sales-search" className="pl-9" placeholder="Comprador, vendedor o código..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-filter">Método de pago</Label>
          <NativeSelect id="payment-filter" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="all">Todos</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="pos">POS</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date-filter">Fecha</Label>
          <Input id="date-filter" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No se encontraron ventas que coincidan con los filtros.</p>
        ) : (
          <>
            <div className="hidden md:block">
              <ResponsiveScrollArea minWidth="760px">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Boleto</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((sale, i) => {
                      const ticket = sale.ticket || { ticket_code: "N/A", buyer_name: "Desconocido", buyer_phone: "", buyer_email: "" };
                      return (
                        <TableRow key={`${ticket.ticket_code}-${i}`}>
                          <TableCell className="font-mono font-semibold">{ticket.ticket_code}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold">{ticket.buyer_name}</span>
                              <span className="text-xs text-muted-foreground">{ticket.buyer_phone || ticket.buyer_email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{formatSiteCurrency(Number(sale.amount))}</TableCell>
                          <TableCell className="capitalize">{sale.payment_method}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{sale.seller_name}</span>
                              <span className="text-xs text-muted-foreground">{sale.sales_point}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatSiteDate(sale.created_at, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ResponsiveScrollArea>
            </div>

            <div className="divide-y md:hidden">
              {filtered.map((sale, i) => {
                const ticket = sale.ticket || { ticket_code: "N/A", buyer_name: "Desconocido", buyer_phone: "", buyer_email: "" };
                return (
                  <article key={`${ticket.ticket_code}-${i}`} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold">{ticket.ticket_code}</span>
                      <span className="font-semibold">{formatSiteCurrency(Number(sale.amount))}</span>
                    </div>
                    <p className="text-sm font-medium">{ticket.buyer_name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{sale.payment_method}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.seller_name} · {formatSiteDate(sale.created_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      <div className="border-t bg-muted/30 p-4 md:p-6">
        <span className="text-sm text-muted-foreground">
          Mostrando {filtered.length} de {sales.length} ventas
        </span>
      </div>
    </Card>
  );
}
