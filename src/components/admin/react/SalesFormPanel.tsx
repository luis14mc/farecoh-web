import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatSiteDate } from "@/lib/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/admin/react/NativeSelect";
import { TicketStatusBadge } from "@/components/admin/react/TicketStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { TICKET_STATUS_LABELS, canConfirmPayment, getTicketActionLabel } from "@/lib/ticket-status";

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
  formMessage?: string;
  formError?: boolean;
}

export function SalesFormPanel({
  sellers,
  recentSales,
  ticketPrice,
  formMessage,
  formError,
}: SalesFormPanelProps) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Record<string, string | null> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [buyerReadonly, setBuyerReadonly] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("code");
    if (initial) {
      setCode(initial);
      void loadPreview(initial);
    }
  }, []);

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

  const status = preview?.status || "";
  const submitDisabled = preview ? !canConfirmPayment(status) : false;
  const submitLabel = preview ? getTicketActionLabel(status) : "Registrar venta";

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Confirmar pago / registrar venta</CardTitle>
          <CardDescription>Reservas web o venta presencial.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="sale-form" method="POST" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code-input">Código boleto *</Label>
              <Input
                id="code-input"
                name="code"
                required
                placeholder="PF-000001"
                className="font-mono"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setCode(v);
                  void loadPreview(v);
                }}
              />
            </div>

            {preview && (
              <Alert variant={canConfirmPayment(status) ? "success" : "destructive"}>
                <AlertDescription>
                  Estado: {TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS] || status}.{" "}
                  {canConfirmPayment(status) ? `Puede ${submitLabel.toLowerCase()}.` : submitLabel + "."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="buyer-name-input">Nombre comprador *</Label>
              <Input
                id="buyer-name-input"
                name="buyer_name"
                required
                value={buyerName}
                readOnly={buyerReadonly}
                onChange={(e) => setBuyerName(e.target.value)}
                className={buyerReadonly ? "bg-muted" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer-phone-input">Teléfono *</Label>
              <Input
                id="buyer-phone-input"
                name="buyer_phone"
                required
                type="tel"
                autoComplete="tel"
                value={buyerPhone}
                readOnly={buyerReadonly}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className={buyerReadonly ? "bg-muted" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer-email-input">Correo</Label>
              <Input
                id="buyer-email-input"
                name="buyer_email"
                type="email"
                autoComplete="email"
                value={buyerEmail}
                readOnly={buyerReadonly}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className={buyerReadonly ? "bg-muted" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seller-select">Vendedor *</Label>
              <NativeSelect id="seller-select" name="seller_id" required defaultValue="">
                <option value="" disabled>
                  Seleccione un vendedor
                </option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} ({seller.type === "vendor" ? "Vendedor" : "Punto físico"})
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                <a href="/admin/vendors" className="font-medium text-primary hover:underline">
                  Registrar vendedor
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-location">Punto de venta *</Label>
              <Input id="sale-location" name="sale_location" required placeholder="Escuela Nacional de Música" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de pago *</Label>
              <NativeSelect id="payment-method" name="payment_method" required defaultValue="">
                <option value="" disabled>
                  Seleccione
                </option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="POS">POS</option>
                <option value="Cortesía">Cortesía</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-reference">Referencia</Label>
              <Input id="payment-reference" name="payment_reference" />
            </div>

            <Button type="submit" className="w-full" disabled={submitDisabled}>
              {submitLabel}
            </Button>

            {formMessage && (
              <Alert variant={formError ? "destructive" : "success"}>
                <AlertDescription>{formMessage}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado del boleto</CardTitle>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando...
              </div>
            ) : previewError ? (
              <p className="text-sm font-medium text-destructive">{previewError}</p>
            ) : preview ? (
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Código:</span> <strong>{preview.ticket_code}</strong>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Estado:</span>
                  <TicketStatusBadge status={preview.status || "available"} />
                </p>
                <p>
                  <span className="text-muted-foreground">Vendedor:</span> {preview.seller_name || "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">Punto:</span> {preview.sale_location || "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">Comprador:</span> {preview.buyer_name || "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">Vendido:</span>{" "}
                  {preview.sold_at
                    ? formatSiteDate(preview.sold_at, { dateStyle: "short", timeStyle: "short" })
                    : "-"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ingrese un código para consultar.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Últimas ventas</CardTitle>
            <CardDescription>Precio unitario: L {ticketPrice}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentSales.length ? (
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
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin ventas registradas</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
