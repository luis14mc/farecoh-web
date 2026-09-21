import type { TicketOrderRequest, TicketOrderResult } from "@/types/orders";
import { ticketOrderSchema } from "@/lib/validation";
import { sql } from "@/lib/db";

type OrderRow = {
  order_id: string;
  ticket_codes: string[];
  total_amount: number | string;
  reservation_status: string;
};

export async function createTicketOrder(input: TicketOrderRequest): Promise<TicketOrderResult> {
  const parsed = ticketOrderSchema.parse(input);

  const rows = await sql<OrderRow[]>`
    SELECT * FROM create_ticket_order(
      ${parsed.eventSlug},
      ${parsed.fullName},
      ${parsed.email ?? ""},
      ${parsed.phone},
      ${parsed.quantity}
    )
  `;

  const order = rows[0];
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
