import type { PhysicalTicketStatus } from "../types/ticketing.ts";
import { getTicketStatusLabel } from "./ticket-status.ts";

const PUBLIC_STATUS_MESSAGES: Record<PhysicalTicketStatus, string> = {
  available: "Boleto registrado, pendiente de venta.",
  assigned: "Boleto registrado, pendiente de venta.",
  reserved: "Boleto reservado, pendiente de confirmación de pago.",
  sold: "Boleto válido para ingreso.",
  validated: "Este boleto ya fue utilizado.",
  cancelled: "Este boleto fue anulado.",
};

const PUBLIC_STATUS_BADGE_CLASSES: Record<PhysicalTicketStatus, string> = {
  available: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  assigned: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  reserved: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  sold: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  validated: "border-purple-400/40 bg-purple-500/15 text-purple-100",
  cancelled: "border-red-400/40 bg-red-500/15 text-red-100",
};

export function getPublicTicketStatusMessage(status: string): string {
  return PUBLIC_STATUS_MESSAGES[status as PhysicalTicketStatus] ?? PUBLIC_STATUS_MESSAGES.available;
}

export function getPublicTicketStatusLabel(status: string): string {
  return getTicketStatusLabel(status);
}

export function getPublicTicketStatusBadgeClass(status: string): string {
  return PUBLIC_STATUS_BADGE_CLASSES[status as PhysicalTicketStatus] ?? PUBLIC_STATUS_BADGE_CLASSES.available;
}
