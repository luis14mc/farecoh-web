import type { SupabaseClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { createSupabaseServerClient } from "./auth.ts";

export interface DeliverableTicket {
  ticket_code: string;
  qr_token: string;
  status: string;
}

export async function fetchDeliverableTicket(
  supabase: SupabaseClient,
  ticketCode: string,
): Promise<DeliverableTicket | null> {
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("ticket_code, qr_token, status")
    .eq("ticket_code", ticketCode.toUpperCase())
    .maybeSingle();

  if (error || !ticket) return null;
  if (ticket.status !== "sold" && ticket.status !== "validated") return null;
  return ticket;
}

export async function fetchDeliverableTicketFromContext(
  context: APIContext,
  ticketCode: string,
): Promise<{ ticket: DeliverableTicket | null; error?: string }> {
  const supabase = createSupabaseServerClient(context);
  const ticket = await fetchDeliverableTicket(supabase, ticketCode);
  if (!ticket) {
    const { data } = await supabase
      .from("tickets")
      .select("status")
      .eq("ticket_code", ticketCode.toUpperCase())
      .maybeSingle();

    if (!data) return { ticket: null, error: "Boleto no encontrado." };
    return {
      ticket: null,
      error: "El boleto debe estar vendido o validado para generar su imagen.",
    };
  }
  return { ticket };
}
