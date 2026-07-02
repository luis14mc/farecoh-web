import { SITE_TIMEZONE } from "../lib/locale.ts";

export type ReservationAgeFilter = "all" | "today" | "older_24h";

export interface ReservationTicketRow {
  ticket_code: string;
  qr_token: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  created_at: string;
  reserved_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
}

export interface ReservationCounters {
  totalReserved: number;
  reservedToday: number;
  olderThan24h: number;
  convertedToSoldToday: number;
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function resolveReservationTimestamp(reservedAt: string | null, createdAt: string | null): string | null {
  return reservedAt ?? createdAt ?? null;
}

function siteDateKey(value: Date): string {
  return value.toLocaleDateString("en-CA", { timeZone: SITE_TIMEZONE });
}

export function isReservedToday(reservedAt: string | null, createdAt: string | null, now = new Date()): boolean {
  const timestamp = resolveReservationTimestamp(reservedAt, createdAt);
  if (!timestamp) return false;
  return siteDateKey(new Date(timestamp)) === siteDateKey(now);
}

export function isOlderThan24h(reservedAt: string | null, createdAt: string | null, now = new Date()): boolean {
  const timestamp = resolveReservationTimestamp(reservedAt, createdAt);
  if (!timestamp) return false;
  return now.getTime() - new Date(timestamp).getTime() >= MS_PER_DAY;
}

export function formatReservationAge(reservedAt: string | null, createdAt: string | null, now = new Date()): string {
  const timestamp = resolveReservationTimestamp(reservedAt, createdAt);
  if (!timestamp) return "—";

  const diffMs = Math.max(0, now.getTime() - new Date(timestamp).getTime());
  const minutes = Math.floor(diffMs / (60 * 1000));

  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function computeReservationCounters(
  reservations: ReservationTicketRow[],
  convertedToSoldToday: number,
  now = new Date(),
): ReservationCounters {
  return {
    totalReserved: reservations.length,
    reservedToday: reservations.filter((row) => isReservedToday(row.reserved_at, row.created_at, now)).length,
    olderThan24h: reservations.filter((row) => isOlderThan24h(row.reserved_at, row.created_at, now)).length,
    convertedToSoldToday,
  };
}

export function matchesReservationAgeFilter(
  row: ReservationTicketRow,
  filter: ReservationAgeFilter,
  now = new Date(),
): boolean {
  if (filter === "all") return true;
  if (filter === "today") return isReservedToday(row.reserved_at, row.created_at, now);
  return isOlderThan24h(row.reserved_at, row.created_at, now);
}

export function matchesReservationSearch(row: ReservationTicketRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const codeDigits = row.ticket_code.replace(/\D/g, "");
  const queryDigits = q.replace(/\D/g, "");

  return (
    row.ticket_code.toLowerCase().includes(q) ||
    (queryDigits.length > 0 && codeDigits.includes(queryDigits)) ||
    (row.buyer_name ?? "").toLowerCase().includes(q) ||
    (queryDigits.length > 0 && (row.buyer_phone ?? "").replace(/\D/g, "").includes(queryDigits)) ||
    (row.buyer_email ?? "").toLowerCase().includes(q)
  );
}

export function buildBuyerWhatsAppUrl(phone: string, buyerName: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const normalized = digits.startsWith("504") ? digits : `504${digits}`;
  const message = `Hola ${buyerName.trim()}, le saludamos de FARECOH. Su reserva para el Tributo a Pink Floyd está pendiente de confirmación de pago.`;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function getSiteStartOfTodayIso(now = new Date()): string {
  const dateKey = siteDateKey(now);
  return new Date(`${dateKey}T06:00:00.000Z`).toISOString();
}
