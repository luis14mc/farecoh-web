import { rpc } from "@/lib/db";
import { parseTicketCodesInput } from "@/lib/ticket-reset";
import { normalizeTicketCode } from "./ticket-code";

export async function cancelTicketReservation(
  _clientOrInput: any,
  possibleInput?: { ticket_code: string; cancelled_by: string; reason: string },
): Promise<{ ok: true; ticket_code: string; status: string } | { ok: false; message: string }> {
  const input = possibleInput || (_clientOrInput as { ticket_code: string; cancelled_by: string; reason: string });

  try {
    const rows = await rpc<Array<{ ticket_code: string; status: string }>>("cancel_ticket_reservation", [
      normalizeTicketCode(input.ticket_code),
      input.cancelled_by,
      input.reason.trim(),
    ]);

    const data = rows?.[0];
    if (!data) {
      return {
        ok: false,
        message: "No se pudo cancelar la reserva.",
      };
    }

    return {
      ok: true,
      ticket_code: data.ticket_code,
      status: data.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message ?? "No se pudo cancelar la reserva.",
    };
  }
}

export async function createStaffReservations(
  _clientOrInput: any,
  possibleInput?: {
    ticketCodes: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_email?: string;
    reserved_by: string;
  },
): Promise<{ reserved: string[]; errors: string[] }> {
  const input = possibleInput || (_clientOrInput as {
    ticketCodes: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_email?: string;
    reserved_by: string;
  });

  const codes = parseTicketCodesInput(input.ticketCodes);
  if (codes.length === 0) {
    throw new Error("Indique al menos un código PF-XXXXXX.");
  }

  const reserved: string[] = [];
  const errors: string[] = [];

  for (const ticket_code of codes) {
    try {
      const rows = await rpc<Array<{ ticket_code: string }>>("staff_reserve_ticket", [
        ticket_code,
        input.buyer_name.trim(),
        input.buyer_phone.trim(),
        input.buyer_email?.trim() ?? "",
        input.reserved_by,
      ]);

      const data = rows?.[0];
      if (!data) {
        errors.push(`${ticket_code}: No se pudo reservar.`);
        continue;
      }

      reserved.push(data.ticket_code);
    } catch (error: any) {
      errors.push(`${ticket_code}: ${error?.message ?? "No se pudo reservar."}`);
    }
  }

  if (reserved.length === 0) {
    throw new Error(errors.join(" "));
  }

  return { reserved, errors };
}
