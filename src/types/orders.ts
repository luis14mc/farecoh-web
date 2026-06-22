import type { OrderStatus } from "./database";

export interface TicketOrderRequest {
  eventSlug: string;
  fullName: string;
  email?: string;
  phone: string;
  quantity: number;
}

export interface TicketOrderResult {
  orderId: string;
  customerId: string;
  ticketCodes: string[];
  totalAmount: number;
  status: OrderStatus;
}

export interface PaymentConfirmationRequest {
  orderId: string;
  paymentReference: string;
  paymentMethod: string;
}