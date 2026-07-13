import type { TicketLayoutConfig } from "./types.ts";

export const DIGITAL_TICKET_TEMPLATE_PATH = "/templates/digital-ticket.png";
export const DIGITAL_TICKET_TEMPLATE_FILENAME = "digital-ticket.png";
export const DIGITAL_TICKET_TEMPLATE_FALLBACK = "ticket-digital-pink-floyd.png";

/** Default overlay positions for the 1050×1890 digital template. */
export const DEFAULT_DIGITAL_TICKET_LAYOUT: TicketLayoutConfig = {
  templateWidth: 1050,
  templateHeight: 1890,
  codeFontSize: 34,
  codeBoxes: [{ x: 331, y: 1378, width: 389, height: 79 }],
  qrBoxes: [{ x: 350, y: 896, width: 350, height: 354 }],
};

export function restoreDigitalTicketLayout(): TicketLayoutConfig {
  return structuredClone(DEFAULT_DIGITAL_TICKET_LAYOUT);
}

export function buildDigitalTicketFilename(ticketCode: string): string {
  return `farecoh-digital-${ticketCode}.png`;
}
