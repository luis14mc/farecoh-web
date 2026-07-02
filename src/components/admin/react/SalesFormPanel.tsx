import { useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { formatSiteDate } from "@/lib/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { SaleFormFields, getSaleSubmitState } from "@/components/admin/react/SaleFormFields";
import { AdminMobileActionBar } from "@/components/admin/react/AdminMobileActionBar";
import { AdminTicketViewDialog, type AdminTicketPreview } from "@/components/admin/react/AdminTicketViewDialog";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
import { SalesMetricsPanel, type SalesMetric } from "@/components/admin/react/SalesMetricsPanel";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

interface Seller {
  id: string;
  name: string;
  type: string;
}

interface RecentSale {
  ticket_code: string;
  buyer_name: string | null;
  seller_name: string | null;
  sale_location: string | null;
  sold_at: string | null;
}

interface SalesFormPanelProps {
  sellers: Seller[];
  recentSales: RecentSale[];
  ticketPrice: number;
  metrics: SalesMetric[];
  formMessage?: string;
  formError?: boolean;
}

export function SalesFormPanel({
  sellers,
  recentSales,
  ticketPrice,
  metrics,
  formMessage,
  formError,
}: SalesFormPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Record<string, string | null> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [buyerReadonly, setBuyerReadonly] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  const { submitDisabled, submitLabel } = getSaleSubmitState(
    preview ? { status: preview.status || "" } : null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("code");
    if (formMessage) setModalOpen(true);
    if (initial) {
      setCode(initial);
      void loadPreview(initial);
      setModalOpen(true);
    }
  }, [formMessage]);

  async function loadPreview(rawCode: string) {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    if (!/^PF-\d{6}$/.test(cleanCode)) {
      setPreviewError("Formato inválido. Use PF-000001.");
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    const { data: ticket, error } = await supabase.from("tickets").select("*").eq("ticket_code", cleanCode).single();
    setPreviewLoading(false);

    if (error || !ticket) {
      setPreviewError("Boleto inexistente.");
      setPreview(null);
      return;
    }

    setPreview(ticket);
    const hasBuyer = Boolean(ticket.buyer_name && ticket.buyer_phone);
    const readonly = ticket.status === "reserved" && hasBuyer;
    setBuyerReadonly(readonly);
    setBuyerName(ticket.buyer_name || "");
    setBuyerPhone(ticket.buyer_phone || "");
    setBuyerEmail(ticket.buyer_email || "");
  }

  function openSaleModal() {
    setModalOpen(true);
  }

  function handleCodeChange(value: string) {
    setCode(value);
    void loadPreview(value);
  }

  return (
    <section className="space-y-4">
      <SalesMetricsPanel metrics={metrics} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Ventas del evento</h2>
          <p className="text-sm text-muted-foreground">Precio unitario: L {ticketPrice}</p>
        </div>
        <Button className="hidden w-full sm:inline-flex sm:w-auto" onClick={openSaleModal}>
          <Plus className="h-4 w-4" />
          Registrar venta
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Consultar boleto</CardTitle>
          <CardDescription>Busque un código antes de confirmar pago o registrar venta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="lookup-code">Código</Label>
              <Input
                id="lookup-code"
                placeholder="PF-000001"
                className="font-mono"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && void loadPreview(code)}
              />
            </div>
            <Button type="button" variant="secondary" className="w-full sm:mt-7 sm:w-auto sm:shrink-0" onClick={() => void loadPreview(code)} disabled={previewLoading}>
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>

          {previewError && (
            <Alert variant="destructive">
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Boleto</p>
                  <p className="font-mono text-lg font-semibold">{preview.ticket_code}</p>
                </div>
                <TicketStatusBadge status={preview.status || "available"} />
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Comprador</dt>
                  <dd className="font-medium">{preview.buyer_name || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Teléfono</dt>
                  <dd>{preview.buyer_phone || "-"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setViewOpen(true)}>
                  Ver boleto
                </Button>
                <Button type="button" className="w-full sm:w-auto" onClick={openSaleModal} disabled={submitDisabled}>
                  {submitLabel}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">Últimas ventas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentSales.length ? (
            <>
              <div className="hidden md:block">
                <ResponsiveScrollArea minWidth="720px">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Punto</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSales.map((ticket) => (
                        <TableRow key={ticket.ticket_code}>
                          <TableCell className="font-mono font-semibold">{ticket.ticket_code}</TableCell>
                          <TableCell>{ticket.buyer_name}</TableCell>
                          <TableCell>{ticket.seller_name}</TableCell>
                          <TableCell>{ticket.sale_location}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {ticket.sold_at
                              ? formatSiteDate(ticket.sold_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveScrollArea>
              </div>

              <div className="divide-y md:hidden">
                {recentSales.map((ticket) => (
                  <article key={ticket.ticket_code} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold">{ticket.ticket_code}</span>
                      <span className="text-xs text-muted-foreground">
                        {ticket.sold_at
                          ? formatSiteDate(ticket.sold_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{ticket.buyer_name || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.seller_name} · {ticket.sale_location}
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin ventas registradas</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirmar pago / registrar venta</DialogTitle>
            <DialogDescription>Reservas web o venta presencial. Complete los datos y confirme.</DialogDescription>
          </DialogHeader>

          <form id="sale-form" method="POST" className="space-y-4">
            <SaleFormFields
              code={code}
              onCodeChange={handleCodeChange}
              buyerName={buyerName}
              buyerPhone={buyerPhone}
              buyerEmail={buyerEmail}
              buyerReadonly={buyerReadonly}
              onBuyerNameChange={setBuyerName}
              onBuyerPhoneChange={setBuyerPhone}
              onBuyerEmailChange={setBuyerEmail}
              sellers={sellers}
              ticketStatus={preview?.status || undefined}
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
        ticketCode={preview?.ticket_code as string | undefined}
        initialTicket={preview as AdminTicketPreview | null}
      />

      <AdminMobileActionBar>
        <Button className="h-12 w-full" onClick={openSaleModal}>
          <Plus className="h-4 w-4" />
          Registrar venta
        </Button>
      </AdminMobileActionBar>
    </section>
  );
}
