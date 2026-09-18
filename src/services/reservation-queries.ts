import { queryRows, queryOne } from "../lib/db.ts";
import type { ReservationTicketRow } from "./reservation-stats.ts";

export function isMissingReservedAtColumn(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("reserved_at") && (normalized.includes("column") || normalized.includes("does not exist"));
}

export async function loadReservedTickets(
  _client?: any,
): Promise<{ rows: ReservationTicketRow[]; warning: string | null }> {
  try {
    const rows = await queryRows<ReservationTicketRow>(`
      SELECT ticket_code, qr_token, buyer_name, buyer_phone, buyer_email, created_at, payment_method, payment_reference, reserved_at
      FROM tickets
      WHERE status = 'reserved'
      ORDER BY reserved_at DESC NULLS LAST, created_at DESC;
    `);

    return { rows, warning: null };
  } catch (err: any) {
    if (isMissingReservedAtColumn(err?.message || "")) {
      const fallbackRows = await queryRows<ReservationTicketRow>(`
        SELECT ticket_code, qr_token, buyer_name, buyer_phone, buyer_email, created_at, payment_method, payment_reference, NULL as reserved_at
        FROM tickets
        WHERE status = 'reserved'
        ORDER BY created_at DESC;
      `);
      return {
        rows: fallbackRows,
        warning: "La columna reserved_at no existe en la base de datos.",
      };
    }
    throw err;
  }
}

export async function loadConvertedReservationsToday(
  _client: any,
  startOfTodayIso?: string,
): Promise<number> {
  const dateIso = typeof _client === "string" ? _client : (startOfTodayIso || new Date().toISOString());

  try {
    const res = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action = 'ticket.payment_confirmed' AND created_at >= $1;
    `, [dateIso]);

    return Number(res?.count || 0);
  } catch {
    return 0;
  }
}
