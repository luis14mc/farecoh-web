import { rpc } from "@/lib/db";
import type { TicketValidationResult } from "@/types/tickets";
import { normalizeTicketCode } from "./ticket-code";

export async function validateTicketCheckin(
  _clientOrCode: any,
  possibleCode?: string,
  options: { validatedBy?: string | null } = {},
): Promise<TicketValidationResult> {
  const ticketCode = typeof _clientOrCode === "string" ? _clientOrCode : (possibleCode || "");
  const normalized = normalizeTicketCode(ticketCode);

  try {
    const rows = await rpc<Array<{
      ok: boolean;
      message: string;
      ticket_id: string | null;
      ticket_code: string;
      status: string | null;
      validated_at: string | null;
    }>>("validate_ticket", [normalized, options.validatedBy ?? "system"]);

    const result = rows?.[0];

    return {
      ok: Boolean(result?.ok),
      message: result?.message ?? "Sin respuesta de validación",
      ticketId: result?.ticket_id ?? null,
      ticketCode: result?.ticket_code ?? normalized,
      status: result?.status ?? null,
      validatedAt: result?.validated_at ?? null,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || "Error al validar boleto",
      ticketId: null,
      ticketCode: normalized,
      status: null,
      validatedAt: null,
    };
  }
}
