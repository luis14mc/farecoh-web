import type { APIContext } from "astro";
import { queryOne } from "./db.ts";
import { normalizeTicketCode } from "../services/ticket-code.ts";

export interface DeliverableTicket {
  id: string;
  ticket_code: string;
  qr_token: string;
  status: string;
}

export interface TicketLookupResult {
  ticket: DeliverableTicket | null;
  notFound: boolean;
  wrongStatus: boolean;
  error?: string;
}

export async function fetchDeliverableTicket(
  _clientOrCode: any,
  possibleCode?: string,
): Promise<TicketLookupResult> {
  const code = typeof _clientOrCode === "string" ? _clientOrCode : (possibleCode || "");
  const requestedTicketCode = normalizeTicketCode(code);

  const existing = await queryOne<DeliverableTicket>(
    "SELECT id, ticket_code, qr_token, status FROM tickets WHERE ticket_code = $1 LIMIT 1;",
    [requestedTicketCode]
  );

  if (!existing) {
    return { ticket: null, notFound: true, wrongStatus: false };
  }

  if (existing.status !== "sold" && existing.status !== "validated") {
    return {
      ticket: null,
      notFound: false,
      wrongStatus: true,
      error: "El boleto debe estar vendido o validado para generar su imagen.",
    };
  }

  return { ticket: existing, notFound: false, wrongStatus: false };
}

export async function fetchDeliverableTicketFromContext(
  _context: APIContext,
  ticketCode: string,
): Promise<TicketLookupResult> {
  return fetchDeliverableTicket(ticketCode);
}
