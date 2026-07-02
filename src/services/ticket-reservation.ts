import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { normalizeTicketCode } from "./ticket-code";

export async function cancelTicketReservation(
  supabase: SupabaseClient<Database>,
  input: { ticket_code: string; cancelled_by: string; reason: string },
): Promise<{ ok: true; ticket_code: string } | { ok: false; message: string }> {
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
  };
}
