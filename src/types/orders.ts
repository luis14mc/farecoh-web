import type { TicketStatus } from "./database";

export interface TicketOrderRequest {
  eventSlug: string;
  fullName: string;
  email?: string;
  phone: string;
  quantity: number;
}

export interface TicketOrderResult {
  orderId: string;
  ticketCodes: string[];
  totalAmount: number;
  status: TicketStatus;
}
