import type { TicketLayoutConfig } from "./types.ts";

export const DIGITAL_TICKET_TEMPLATE_PATH = "/templates/digital-ticket.png";
export const DIGITAL_TICKET_TEMPLATE_FILENAME = "digital-ticket.png";
export const DIGITAL_TICKET_TEMPLATE_FALLBACK = "ticket-digital-pink-floyd.png";

/** Default overlay positions for the 1080×1920 digital template. */
export const DEFAULT_DIGITAL_TICKET_LAYOUT: TicketLayoutConfig = {
  templateWidth: 1080,
  templateHeight: 1920,
  codeFontSize: 34,
  codeBoxes: [{ x: 340, y: 1400, width: 400, height: 80 }],
  qrBoxes: [{ x: 360, y: 910, width: 360, height: 360 }],
};

export function restoreDigitalTicketLayout(): TicketLayoutConfig {
  return structuredClone(DEFAULT_DIGITAL_TICKET_LAYOUT);
}

export function buildDigitalTicketFilename(ticketCode: string): string {
  return `farecoh-digital-${ticketCode}.png`;
}
