import type { TicketValidationResult } from "@/types/tickets";
import { normalizeTicketCode } from "./ticket-code";
import { sql } from "@/lib/db";

type ValidateRow = {
  ok: boolean;
  message: string;
  ticket_id: string | null;
  ticket_code: string;
  status: string | null;
  validated_at: string | null;
};

export async function validateTicketCheckin(
  userId: string,
  ticketCode: string,
  options: { validatedBy?: string | null } = {},
): Promise<TicketValidationResult> {
  const code = normalizeTicketCode(ticketCode);
  try {
    const rows = await sql<ValidateRow[]>`
      SELECT * FROM validate_ticket(${userId}, ${code}, ${options.validatedBy ?? "system"})
    `;
    const result = rows[0];
    return {
      ok: Boolean(result?.ok),
      message: result?.message ?? "Sin respuesta de validación",
      ticketId: result?.ticket_id ?? null,
      ticketCode: result?.ticket_code ?? code,
      status: result?.status ?? null,
      validatedAt: result?.validated_at ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo validar el boleto";
    return {
      ok: false,
      message,
      ticketId: null,
      ticketCode: code,
      status: null,
      validatedAt: null,
    };
  }
}
