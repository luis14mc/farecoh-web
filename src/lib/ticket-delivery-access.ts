import type { SupabaseClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { createSupabaseServerClient } from "./auth.ts";
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
  supabase: SupabaseClient,
  ticketCode: string,
): Promise<TicketLookupResult> {
  const requestedTicketCode = normalizeTicketCode(ticketCode);

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, ticket_code, qr_token, status")
    .eq("ticket_code", requestedTicketCode)
    .in("status", ["sold", "validated"])
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      const { data: existing } = await supabase
        .from("tickets")
        .select("status")
        .eq("ticket_code", requestedTicketCode)
        .maybeSingle();

      if (!existing) {
        return { ticket: null, notFound: true, wrongStatus: false };
      }

      return {
        ticket: null,
        notFound: false,
        wrongStatus: true,
        error: "El boleto debe estar vendido o validado para generar su imagen.",
      };
    }

    throw error;
  }

  return { ticket, notFound: false, wrongStatus: false };
}

export async function fetchDeliverableTicketFromContext(
  context: APIContext,
  ticketCode: string,
): Promise<TicketLookupResult> {
  const supabase = createSupabaseServerClient(context);
  return fetchDeliverableTicket(supabase, ticketCode);
}
