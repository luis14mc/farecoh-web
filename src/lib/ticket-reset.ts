import type { SupabaseClient } from "@supabase/supabase-js";
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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

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
  supabase: SupabaseClient,
  ticketCodes: string[],
  options?: { performedBy?: string },
): Promise<{ reset: TicketResetResult[]; skipped: string[] }> {
  const codes = validateTicketResetCodes(ticketCodes);

  const { data: tickets, error: listError } = await supabase
    .from("tickets")
    .select("id, ticket_code, status, buyer_name, seller_name")
    .in("ticket_code", codes)
    .order("ticket_code");

  if (listError) throw listError;

  const found = tickets ?? [];
  const foundCodes = new Set(found.map((row) => row.ticket_code));
  const missing = codes.filter((code) => !foundCodes.has(code));
  if (missing.length) {
    throw new Error(`Boleto(s) no encontrado(s): ${missing.join(", ")}`);
  }

  const skipped = found.filter((row) => row.status === "available").map((row) => row.ticket_code);
  const toReset = found.filter((row) => row.status !== "available") as TicketResetRow[];

  if (toReset.length === 0) {
    return { reset: [], skipped };
  }

  const ids = toReset.map((row) => row.id);

  for (const batch of chunk(ids, 100)) {
    const { error } = await supabase.from("checkins").delete().in("ticket_id", batch);
    if (error) throw error;
  }

  for (const batch of chunk(ids, 100)) {
    const { error } = await supabase.from("sales").delete().in("ticket_id", batch);
    if (error) throw error;
  }

  for (const batch of chunk(ids, 100)) {
    const { error } = await supabase.from("tickets").update({
      status: "available",
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      seller_id: null,
      seller_name: null,
      sale_location: null,
      payment_method: null,
      payment_reference: null,
      sold_at: null,
      validated_at: null,
      reserved_at: null,
      batch_id: null,
    }).in("id", batch);
    if (error) throw error;
  }

  if (options?.performedBy) {
    await supabase.from("audit_logs").insert({
      action: "ticket.reset",
      entity: "tickets",
      entity_id: null,
      performed_by: `${options.performedBy} (${toReset.map((row) => row.ticket_code).join(", ")})`,
    });
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
