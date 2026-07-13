import type { DeliverableTicket } from "./ticket-delivery-access.ts";
import { resolveDatabaseTicketCode } from "../services/ticket-code.ts";

/** Preview-only ticket code for calibration UI — never used in production delivery. */
export const CALIBRATION_PREVIEW_TICKET_CODE = "PF-000000";

export class TicketCodeMismatchError extends Error {
  readonly requestedTicketCode: string;
  readonly databaseTicketCode: string;

  constructor(requestedTicketCode: string, databaseTicketCode: string) {
    super("El código solicitado no coincide con el boleto recuperado.");
    this.name = "TicketCodeMismatchError";
    this.requestedTicketCode = requestedTicketCode;
    this.databaseTicketCode = databaseTicketCode;
  }
}

export function parseDeliveryTicketCodeParam(raw: string | undefined): string {
  return decodeURIComponent(raw ?? "").trim().toUpperCase();
}

export function resolveProductionTicketCode(
  ticket: DeliverableTicket,
  requestedTicketCode: string,
): string {
  const requested = parseDeliveryTicketCodeParam(requestedTicketCode);
  const ticketCode = String(ticket.ticket_code).trim().toUpperCase();

  if (ticketCode !== requested) {
    throw new TicketCodeMismatchError(requested, ticketCode);
  }

  return resolveDatabaseTicketCode(ticketCode);
}

export function assertStoredQrToken(ticket: DeliverableTicket): void {
  if (!ticket.qr_token?.trim()) {
    throw new Error(`Ticket ${ticket.ticket_code} has no stored QR token.`);
  }
}
