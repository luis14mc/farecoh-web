import { rpc } from "@/lib/db";
import type { PhysicalSaleInput, TicketOperationResult } from "@/types/ticketing";
import { normalizeTicketCode } from "./ticket-code";

export async function confirmTicketPayment(
  _clientOrInput: any,
  possibleInput?: PhysicalSaleInput & { confirmed_by?: string },
): Promise<TicketOperationResult> {
  const input = possibleInput || (_clientOrInput as PhysicalSaleInput & { confirmed_by?: string });

  try {
    const rows = await rpc<Array<{
      ticket_code: string;
      [key: string]: any;
    }>>("confirm_ticket_payment", [
      normalizeTicketCode(input.ticket_code),
      input.payment_method,
      input.payment_reference ?? "",
      input.seller_id,
      input.sale_location,
      input.confirmed_by ?? "system",
      input.buyer_name,
      input.buyer_phone,
      input.buyer_email ?? null,
    ]);

    const data = rows?.[0];
    if (!data) {
      return {
        ok: false,
        message: "No se pudo confirmar el pago.",
      };
    }

    return {
      ok: true,
      message: `${data.ticket_code} marcado como vendido correctamente.`,
      ticket: data as any,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message ?? "No se pudo confirmar el pago.",
    };
  }
}
