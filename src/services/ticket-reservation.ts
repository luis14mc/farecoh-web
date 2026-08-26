import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { parseTicketCodesInput } from "@/lib/ticket-reset";
import { normalizeTicketCode } from "./ticket-code";

export async function cancelTicketReservation(
  supabase: SupabaseClient<Database>,
  input: { ticket_code: string; cancelled_by: string; reason: string },
): Promise<{ ok: true; ticket_code: string; status: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("cancel_ticket_reservation", {
    p_ticket_code: normalizeTicketCode(input.ticket_code),
    p_cancelled_by: input.cancelled_by,
    p_reason: input.reason.trim(),
  });

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "No se pudo cancelar la reserva.",
    };
  }

  return {
    ok: true,
    ticket_code: data.ticket_code,
    status: data.status,
  };
}

export async function createStaffReservations(
  supabase: SupabaseClient<Database>,
  input: {
    ticketCodes: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_email?: string;
    reserved_by: string;
  },
): Promise<{ reserved: string[]; errors: string[] }> {
  const codes = parseTicketCodesInput(input.ticketCodes);
  if (codes.length === 0) {
    throw new Error("Indique al menos un código PF-XXXXXX.");
  }

  const reserved: string[] = [];
  const errors: string[] = [];

  for (const ticket_code of codes) {
    const { data, error } = await supabase.rpc("staff_reserve_ticket", {
      p_ticket_code: ticket_code,
      p_full_name: input.buyer_name.trim(),
      p_phone: input.buyer_phone.trim(),
      p_email: input.buyer_email?.trim() ?? "",
      p_reserved_by: input.reserved_by,
    });

    if (error || !data) {
      errors.push(`${ticket_code}: ${error?.message ?? "No se pudo reservar."}`);
      continue;
    }

    reserved.push(data.ticket_code);
  }

  if (reserved.length === 0) {
    throw new Error(errors.join(" "));
  }

  return { reserved, errors };
}
