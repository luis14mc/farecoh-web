import { parseTicketCodesInput } from "@/lib/ticket-reset";
import { normalizeTicketCode } from "./ticket-code";
import { sql } from "@/lib/db";

type TicketRow = {
  ticket_code: string;
  status: string;
  event_slug: string;
};

export async function cancelTicketReservation(
  userId: string,
  input: { ticket_code: string; cancelled_by: string; reason: string },
): Promise<{ ok: true; ticket_code: string; status: string } | { ok: false; message: string }> {
  try {
    const rows = await sql<TicketRow[]>`
      SELECT ticket_code, status, ''::TEXT AS event_slug
      FROM cancel_ticket_reservation(
        ${userId},
        ${normalizeTicketCode(input.ticket_code)},
        ${input.reason.trim()}
      )
    `;
    const row = rows[0];
    if (!row) {
      return { ok: false, message: "No se pudo cancelar la reserva." };
    }
    return { ok: true, ticket_code: row.ticket_code, status: row.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo cancelar la reserva.";
    return { ok: false, message };
  }
}

export async function createStaffReservations(
  userId: string,
  eventSlug: string,
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

  for (const code of codes) {
    try {
      const rows = await sql<TicketRow[]>`
        SELECT ticket_code, status, ''::TEXT AS event_slug
        FROM staff_reserve_ticket(
          ${userId},
          ${eventSlug},
          ${code},
          ${input.buyer_name.trim()},
          ${input.buyer_phone.trim()},
          ${input.buyer_email?.trim() ?? ""}
        )
      `;
      const row = rows[0];
      if (row) reserved.push(row.ticket_code);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo reservar.";
      errors.push(`${code}: ${message}`);
    }
  }

  if (reserved.length === 0) {
    throw new Error(errors.join(" "));
  }

  return { reserved, errors };
}
