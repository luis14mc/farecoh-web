import { formatTicketCode } from "@/services/ticket-code";

export const TICKET_TEMPLATE_FILENAME = "ticket-pink-floyd.png";
export const TICKET_TEMPLATE_RELATIVE_PATH = `public/templates/${TICKET_TEMPLATE_FILENAME}`;
/** Public URL path served from `public/templates/` (not `/public/templates/`). */
export const TICKET_TEMPLATE_PUBLIC_PATH = `/templates/${TICKET_TEMPLATE_FILENAME}`;

/** Horizontal center of the ticket code box (pixels, top-left origin). */
export const CODE_X = 1180;
/** Vertical center of the ticket code box (pixels, top-left origin). */
export const CODE_Y = 520;
export const CODE_FONT_SIZE = 42;

/** Top-left X of the QR frame (pixels, top-left origin). */
export const QR_X = 180;
/** Top-left Y of the QR frame (pixels, top-left origin). */
export const QR_Y = 900;
export const QR_SIZE = 320;
export const QR_PADDING = 24;
export const QR_RENDER_SCALE = 3;

export const MAX_PRINT_TICKETS_PER_REQUEST = 500;

export const DEFAULT_TEST_PRINT_FROM = formatTicketCode(1);
export const DEFAULT_TEST_PRINT_TO = formatTicketCode(5);
export const FULL_PRINT_FROM = formatTicketCode(1);
export const FULL_PRINT_TO = formatTicketCode(500);
