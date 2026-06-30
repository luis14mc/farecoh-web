import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/admin/react/NativeSelect";
import { TICKET_STATUS_LABELS, canConfirmPayment, getTicketActionLabel } from "@/lib/ticket-status";

interface Seller {
  id: string;
  name: string;
  type: string;
}

export interface SaleFormFieldsProps {
  code: string;
  onCodeChange: (value: string) => void;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerReadonly: boolean;
  onBuyerNameChange: (value: string) => void;
  onBuyerPhoneChange: (value: string) => void;
  onBuyerEmailChange: (value: string) => void;
  sellers: Seller[];
  ticketStatus?: string;
  submitDisabled: boolean;
  submitLabel: string;
  formMessage?: string;
  formError?: boolean;
  formId?: string;
}

export function SaleFormFields({
  code,
  onCodeChange,
  buyerName,
  buyerPhone,
  buyerEmail,
  buyerReadonly,
  onBuyerNameChange,
  onBuyerPhoneChange,
  onBuyerEmailChange,
  sellers,
  ticketStatus,
  submitDisabled,
  submitLabel,
  formMessage,
  formError,
  formId = "sale-form",
}: SaleFormFieldsProps) {
  const status = ticketStatus || "";

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-code`}>Código boleto *</Label>
        <Input
          id={`${formId}-code`}
          name="code"
          required
          placeholder="PF-000001"
          className="font-mono"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
        />
      </div>

      {ticketStatus && (
        <Alert variant={canConfirmPayment(status) ? "success" : "destructive"}>
          <AlertDescription>
            Estado: {TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS] || status}.{" "}
            {canConfirmPayment(status) ? `Puede ${submitLabel.toLowerCase()}.` : `${submitLabel}.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${formId}-buyer-name`}>Nombre comprador *</Label>
          <Input
            id={`${formId}-buyer-name`}
            name="buyer_name"
            required
            value={buyerName}
            readOnly={buyerReadonly}
            onChange={(e) => onBuyerNameChange(e.target.value)}
            className={buyerReadonly ? "bg-muted" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-buyer-phone`}>Teléfono *</Label>
          <Input
            id={`${formId}-buyer-phone`}
            name="buyer_phone"
            required
            type="tel"
            autoComplete="tel"
            value={buyerPhone}
            readOnly={buyerReadonly}
            onChange={(e) => onBuyerPhoneChange(e.target.value)}
            className={buyerReadonly ? "bg-muted" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-buyer-email`}>Correo</Label>
          <Input
            id={`${formId}-buyer-email`}
            name="buyer_email"
            type="email"
            autoComplete="email"
            value={buyerEmail}
            readOnly={buyerReadonly}
            onChange={(e) => onBuyerEmailChange(e.target.value)}
            className={buyerReadonly ? "bg-muted" : undefined}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-seller`}>Vendedor *</Label>
          <NativeSelect id={`${formId}-seller`} name="seller_id" required defaultValue="">
            <option value="" disabled>
              Seleccione un vendedor
            </option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name} ({seller.type === "vendor" ? "Vendedor" : "Punto físico"})
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-payment`}>Método de pago *</Label>
          <NativeSelect id={`${formId}-payment`} name="payment_method" required defaultValue="">
            <option value="" disabled>
              Seleccione
            </option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="POS">POS</option>
            <option value="Cortesía">Cortesía</option>
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-location`}>Punto de venta *</Label>
        <Input id={`${formId}-location`} name="sale_location" required placeholder="Escuela Nacional de Música" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-reference`}>Referencia</Label>
        <Input id={`${formId}-reference`} name="payment_reference" placeholder="Opcional" />
      </div>

      <Button type="submit" className="w-full" disabled={submitDisabled}>
        {submitLabel}
      </Button>

      {formMessage && (
        <Alert variant={formError ? "destructive" : "success"}>
          <AlertDescription>{formMessage}</AlertDescription>
        </Alert>
      )}

      <p className="text-center text-xs text-muted-foreground">
        <a href="/admin/vendors" className="font-medium text-primary hover:underline">
          Registrar vendedor
        </a>
      </p>
    </>
  );
}

export function getSaleSubmitState(preview: { status: string } | null) {
  const status = preview?.status || "";
  return {
    submitDisabled: preview ? !canConfirmPayment(status) : false,
    submitLabel: preview ? getTicketActionLabel(status) : "Registrar venta",
    status,
  };
}
