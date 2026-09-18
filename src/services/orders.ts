import { rpc } from "@/lib/db";
import type { TicketOrderRequest, TicketOrderResult } from "@/types/orders";
import { ticketOrderSchema } from "@/lib/validation";

export async function createTicketOrder(
  _clientOrInput: any,
  possibleInput?: TicketOrderRequest,
): Promise<TicketOrderResult> {
  const input = possibleInput || (_clientOrInput as TicketOrderRequest);
  const parsed = ticketOrderSchema.parse(input);

  const rows = await rpc<Array<{
    order_id: string;
    ticket_codes: string[];
    total_amount: number | string;
    reservation_status: string;
  }>>("create_ticket_order", [
    parsed.eventSlug,
    parsed.fullName,
    parsed.email ?? "",
    parsed.phone,
    parsed.quantity,
  ]);

  const order = rows?.[0];
  if (!order) {
    throw new Error("No se pudo crear la reservación de boletos.");
  }

  return {
    orderId: order.order_id,
    ticketCodes: order.ticket_codes,
    totalAmount: Number(order.total_amount),
    status: order.reservation_status,
  };
}
