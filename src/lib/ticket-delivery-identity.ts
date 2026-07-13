import { createHash } from "node:crypto";
import { normalizeTicketCode } from "../services/ticket-code.ts";
import type { DeliverableTicket } from "./ticket-delivery-access.ts";

export function hashQrToken(qrToken: string): string {
  return createHash("sha256").update(qrToken).digest("hex").slice(0, 12);
}

export function assertTicketIdentity(requestedTicketCode: string, ticket: DeliverableTicket): void {
  const requested = normalizeTicketCode(requestedTicketCode);
  const stored = normalizeTicketCode(ticket.ticket_code);

  if (requested !== stored) {
    throw new Error(
      `Ticket identity mismatch: requested ${requested} but database record is ${stored}.`,
    );
  }
}

export function buildDeliveryDebugHeaders(ticket: DeliverableTicket): Record<string, string> {
  return {
    "X-Ticket-Code": ticket.ticket_code,
    "X-QR-Source": "stored-token",
    "X-QR-Token-Hash": hashQrToken(ticket.qr_token),
  };
}

export function formatTicketStatusLabel(status: string): string {
  if (status === "validated") return "Validado";
  if (status === "sold") return "Vendido";
  return status;
}
