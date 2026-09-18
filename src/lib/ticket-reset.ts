import { query, queryRows } from "./db.ts";
import { isTicketCode, normalizeTicketCode } from "../services/ticket-code.ts";

export const RESETTABLE_TICKET_STATUSES = [
  "assigned",
  "reserved",
  "sold",
  "validated",
  "cancelled",
] as const;

export type ResettableTicketStatus = (typeof RESETTABLE_TICKET_STATUSES)[number];

export interface TicketResetRow {
  id: string;
  ticket_code: string;
  status: string;
  buyer_name: string | null;
  seller_name: string | null;
}

export interface TicketResetResult {
  ticket_code: string;
  previous_status: string;
  status: "available";
}

const MAX_RESET_BATCH = 25;

export function parseTicketCodesInput(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => normalizeTicketCode(part))
    .filter(Boolean);

  return [...new Set(parts)];
}

export function validateTicketResetCodes(codes: string[]): string[] {
  if (codes.length === 0) {
    throw new Error("Indique al menos un código de boleto.");
  }

  if (codes.length > MAX_RESET_BATCH) {
    throw new Error(`El límite es de ${MAX_RESET_BATCH} boletos por operación.`);
  }

  const invalid = codes.filter((code) => !isTicketCode(code));
  if (invalid.length) {
    throw new Error(`Código inválido: ${invalid.join(", ")}`);
  }

  return codes;
}

export async function resetTicketsToAvailable(
  _clientOrCodes: any,
  maybeCodes?: string[] | { performedBy?: string },
  maybeOptions?: { performedBy?: string },
): Promise<{ reset: TicketResetResult[]; skipped: string[] }> {
  const ticketCodes: string[] = Array.isArray(_clientOrCodes)
    ? _clientOrCodes
    : Array.isArray(maybeCodes)
      ? maybeCodes
      : [];

  const options = (typeof maybeCodes === "object" && !Array.isArray(maybeCodes) ? maybeCodes : maybeOptions) as
    | { performedBy?: string }
    | undefined;

  const codes = validateTicketResetCodes(ticketCodes);

  const found = await queryRows<TicketResetRow>(
    "SELECT id, ticket_code, status, buyer_name, seller_name FROM tickets WHERE ticket_code = ANY($1) ORDER BY ticket_code ASC;",
    [codes]
  );

  const foundCodes = new Set(found.map((row) => row.ticket_code));
  const missing = codes.filter((code) => !foundCodes.has(code));
  if (missing.length) {
    throw new Error(`Boleto(s) no encontrado(s): ${missing.join(", ")}`);
  }

  const skipped = found.filter((row) => row.status === "available").map((row) => row.ticket_code);
  const toReset = found.filter((row) => row.status !== "available");

  if (toReset.length === 0) {
    return { reset: [], skipped };
  }

  const ids = toReset.map((row) => row.id);

  await query("DELETE FROM checkins WHERE ticket_id = ANY($1);", [ids]);
  await query("DELETE FROM sales WHERE ticket_id = ANY($1);", [ids]);
  await query(
    `UPDATE tickets SET
      status = 'available',
      buyer_name = NULL,
      buyer_phone = NULL,
      buyer_email = NULL,
      seller_id = NULL,
      seller_name = NULL,
      sale_location = NULL,
      payment_method = NULL,
      payment_reference = NULL,
      sold_at = NULL,
      validated_at = NULL,
      reserved_at = NULL,
      batch_id = NULL
    WHERE id = ANY($1);`,
    [ids]
  );

  if (options?.performedBy) {
    await query(
      "INSERT INTO audit_logs (action, entity, performed_by) VALUES ($1, $2, $3);",
      ["ticket.reset", "tickets", `${options.performedBy} (${toReset.map((row) => row.ticket_code).join(", ")})`]
    );
  }

  return {
    reset: toReset.map((row) => ({
      ticket_code: row.ticket_code,
      previous_status: row.status,
      status: "available" as const,
    })),
    skipped,
  };
}
