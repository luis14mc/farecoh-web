import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TicketValidationResult } from "@/types/tickets";
import { normalizeTicketCode } from "./ticket-code";

export async function validateTicketCheckin(
  supabase: SupabaseClient<Database>,
  ticketCode: string,
  options: { validatedBy?: string | null } = {},
): Promise<TicketValidationResult> {
  const { data, error } = await supabase.rpc("validate_ticket", {
    p_ticket_code: normalizeTicketCode(ticketCode),
    p_validated_by: options.validatedBy ?? "system",
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
      ticketId: null,
      ticketCode: normalizeTicketCode(ticketCode),
      status: null,
      validatedAt: null,
    };
  }

  const result = data?.[0];

  return {
    ok: Boolean(result?.ok),
    message: result?.message ?? "Sin respuesta de validación",
    ticketId: result?.ticket_id ?? null,
    ticketCode: result?.ticket_code ?? normalizeTicketCode(ticketCode),
    status: result?.status ?? null,
    validatedAt: result?.validated_at ?? null,
  };
}
