import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TicketOrderRequest, TicketOrderResult } from "@/types/orders";
import { ticketOrderSchema } from "@/lib/validation";

export async function createTicketOrder(
  supabase: SupabaseClient<Database>,
  input: TicketOrderRequest,
): Promise<TicketOrderResult> {
  const parsed = ticketOrderSchema.parse(input);

  const { data, error } = await supabase.rpc("create_ticket_order", {
    p_event_slug: parsed.eventSlug,
    p_full_name: parsed.fullName,
    p_email: parsed.email ?? "",
    p_phone: parsed.phone,
    p_quantity: parsed.quantity,
  });

  if (error) {
    throw new Error(error.message);
  }

  const order = data?.[0];
  if (!order) {
    throw new Error("No se pudo crear la reservación de boletos.");
  }

  return {
    orderId: order.order_id,
    ticketCodes: order.ticket_codes,
    totalAmount: Number(order.total_amount),
    status: order.status,
  };
}
