import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ReservationTicketRow } from "./reservation-stats.ts";

const BASE_SELECT =
  "ticket_code, qr_token, buyer_name, buyer_phone, buyer_email, created_at, payment_method, payment_reference";

export function isMissingReservedAtColumn(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("reserved_at") && (normalized.includes("column") || normalized.includes("does not exist"));
}

export async function loadReservedTickets(
  supabase: SupabaseClient<Database>,
): Promise<{ rows: ReservationTicketRow[]; warning: string | null }> {
  const withReservedAt = await supabase
    .from("tickets")
    .select(`${BASE_SELECT}, reserved_at`)
    .eq("status", "reserved")
    .order("reserved_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!withReservedAt.error) {
    return { rows: (withReservedAt.data ?? []) as ReservationTicketRow[], warning: null };
  }

  if (!isMissingReservedAtColumn(withReservedAt.error.message)) {
    throw new Error(withReservedAt.error.message);
  }

  const fallback = await supabase
    .from("tickets")
    .select(BASE_SELECT)
    .eq("status", "reserved")
    .order("created_at", { ascending: false });

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  const rows = (fallback.data ?? []).map((row) => ({
    ...row,
    reserved_at: null,
  })) as ReservationTicketRow[];

  return {
    rows,
    warning:
      "La columna reserved_at aún no existe en Supabase. Ejecute supabase/migrations/20260630_reservation_workflow.sql para fechas de reserva precisas.",
  };
}

export async function loadConvertedReservationsToday(
  supabase: SupabaseClient<Database>,
  startOfTodayIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "ticket.payment_confirmed")
    .gte("created_at", startOfTodayIso);

  if (error) {
    return 0;
  }

  return count ?? 0;
}
