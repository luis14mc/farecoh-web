import type { TicketStatus } from "./database";

export type TicketCode = `PF-${string}`;

export interface TicketRecord {
  id: string;
  eventId: string;
  orderId: string;
  customerId: string;
  ticketCode: TicketCode;
  status: TicketStatus;
  qrToken: string;
  ticketUrl: string | null;
  issuedAt: string;
  validatedAt: string | null;
}

export interface TicketValidationResult {
  ok: boolean;
  message: string;
  ticketId: string | null;
  ticketCode: string;
  status: TicketStatus | null;
  validatedAt: string | null;
}