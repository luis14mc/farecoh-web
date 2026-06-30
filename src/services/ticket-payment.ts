import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PhysicalSaleInput, TicketOperationResult } from "@/types/ticketing";
import { normalizeTicketCode } from "./ticket-code";

export async function confirmTicketPayment(
  supabase: SupabaseClient<Database>,
  input: PhysicalSaleInput & { confirmed_by?: string },
): Promise<TicketOperationResult> {
  const { data, error } = await supabase.rpc("confirm_ticket_payment", {
    p_ticket_code: normalizeTicketCode(input.ticket_code),
    p_payment_method: input.payment_method,
    p_payment_reference: input.payment_reference ?? "",
    p_seller_id: input.seller_id,
    p_sale_location: input.sale_location,
    p_confirmed_by: input.confirmed_by ?? "system",
    p_buyer_name: input.buyer_name,
    p_buyer_phone: input.buyer_phone,
    p_buyer_email: input.buyer_email ?? null,
  });

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "No se pudo confirmar el pago.",
    };
  }

  return {
    ok: true,
    message: `${data.ticket_code} marcado como vendido correctamente.`,
    ticket: data,
  };
}
