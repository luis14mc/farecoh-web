import { sql } from "@/lib/db";
import type { ReservationTicketRow } from "./reservation-stats";

export function isMissingReservedAtColumn(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("reserved_at") && (normalized.includes("column") || normalized.includes("does not exist"));
}

export async function loadReservedTickets(): Promise<{ rows: ReservationTicketRow[]; warning: string | null }> {
  const rows = await sql<ReservationTicketRow[]>`
    SELECT ticket_code, qr_token, buyer_name, buyer_phone, buyer_email,
           created_at, reserved_at, payment_method, payment_reference
    FROM tickets
    WHERE status = 'reserved'
    ORDER BY reserved_at DESC NULLS LAST, created_at DESC
  `;
  return { rows, warning: null };
}

export async function loadConvertedReservationsToday(startOfTodayIso: string): Promise<number> {
  const rows = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count
    FROM audit_logs
    WHERE action = 'ticket.payment_confirmed'
      AND created_at >= ${startOfTodayIso}
  `;
  return rows[0]?.count ?? 0;
}
