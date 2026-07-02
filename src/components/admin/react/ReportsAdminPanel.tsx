import { CreditCard, Download, FileSpreadsheet, Ticket, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSiteCurrency } from "@/lib/locale";
import { SELLER_TYPE_LABELS, type SellerType } from "@/types/sellers";

interface ReportMetric {
  label: string;
  value: string;
}

interface SellerReportRow {
  sellerName: string;
  type: SellerType | string;
  salesCount: number;
  ticketsSold: number;
  revenue: number;
}

interface ReportsAdminPanelProps {
  eventName: string;
  metrics: ReportMetric[];
  reportRows: SellerReportRow[];
}

const metricIcons = [Ticket, UserCheck, CreditCard];

export function ReportsAdminPanel({ eventName, metrics, reportRows }: ReportsAdminPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Evento activo</p>
            <CardTitle>{eventName}</CardTitle>
            <CardDescription>Reportes de ventas físicas por vendedor y estado general del lote.</CardDescription>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href="/admin/vendors">
              <Users className="h-4 w-4" />
              Gestionar vendedores
            </a>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar CSV</CardTitle>
          <CardDescription>Descargas operativas para respaldo y conciliación.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <a href="/admin/reports/export-tickets.csv">
              <Download className="h-4 w-4" />
              Boletos
            </a>
          </Button>
          <Button asChild size="sm">
            <a href="/admin/reports/export-sales.csv">
              <Download className="h-4 w-4" />
              Ventas
            </a>
          </Button>
          <Button asChild size="sm">
            <a href="/admin/reports/export-checkins.csv">
              <Download className="h-4 w-4" />
              Check-ins
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar boletos para Canva</CardTitle>
          <CardDescription>
            CSV con códigos, URLs de consulta e imágenes QR para Canva Bulk Create (Pink Floyd).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/exports/canva-tickets.csv">
              <FileSpreadsheet className="h-4 w-4" />
              Descargar CSV Canva
            </a>
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? Ticket;
          return (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas por vendedor</CardTitle>
          <CardDescription>Transacciones registradas por cada vendedor o punto físico activo.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reportRows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aún no hay ventas registradas por vendedor.
            </p>
          ) : (
            <>
              <div className="hidden md:block">
                <ResponsiveScrollArea minWidth="760px">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Ventas</TableHead>
                        <TableHead>Boletos vendidos</TableHead>
                        <TableHead>Ingresos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportRows.map((row) => (
                        <TableRow key={row.sellerName}>
                          <TableCell className="font-medium">{row.sellerName}</TableCell>
                          <TableCell>
                            {SELLER_TYPE_LABELS[row.type as SellerType] ?? row.type}
                          </TableCell>
                          <TableCell>{row.salesCount}</TableCell>
                          <TableCell>{row.ticketsSold}</TableCell>
                          <TableCell className="font-semibold text-primary">{formatSiteCurrency(row.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveScrollArea>
              </div>

              <div className="divide-y md:hidden">
                {reportRows.map((row) => (
                  <article key={row.sellerName} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{row.sellerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {SELLER_TYPE_LABELS[row.type as SellerType] ?? row.type}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold text-primary">{formatSiteCurrency(row.revenue)}</p>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{row.salesCount} ventas</span>
                      <span>{row.ticketsSold} boletos</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
