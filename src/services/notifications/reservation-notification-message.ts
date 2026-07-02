import { sanitizeText } from "../../lib/security.ts";

const RESERVATIONS_PANEL_URL = "https://www.farecoh.org/admin/reservations";
const DEFAULT_EVENT_TITLE = "Tributo a Pink Floyd";

export interface ReservationNotificationMessageInput {
  ticketCodes: string[];
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  eventTitle?: string;
}

export function buildReservationNotificationMessage(input: ReservationNotificationMessageInput): string {
  const ticketCodes = input.ticketCodes.join(", ");
  const eventTitle = sanitizeText(input.eventTitle ?? DEFAULT_EVENT_TITLE, 120);
  const buyerName = sanitizeText(input.buyerName, 120);
  const buyerPhone = sanitizeText(input.buyerPhone, 32) || "—";
  const buyerEmail = sanitizeText(input.buyerEmail, 160) || "—";

  return [
    "Nueva reserva FARECOH",
    `Evento: ${eventTitle}`,
    `Boletos: ${ticketCodes}`,
    `Cliente: ${buyerName}`,
    `Teléfono: ${buyerPhone}`,
    `Correo: ${buyerEmail}`,
    "Estado: Pendiente de confirmación de pago",
    `Panel: ${RESERVATIONS_PANEL_URL}`,
  ].join("\n");
}
