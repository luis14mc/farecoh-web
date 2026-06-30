import { formatTicketCode } from "@/services/ticket-code";

export {
  CODE_FONT_SIZE,
  CODE_MASK_HEIGHT,
  CODE_MASK_WIDTH,
  CODE_X,
  CODE_Y,
  MAX_PRINT_TICKETS_PER_REQUEST,
  QR_PADDING,
  QR_RENDER_SCALE,
  QR_SIZE,
  QR_X,
  QR_Y,
} from "@/lib/ticket-print-constants";

export const TICKET_TEMPLATE_FILENAME = "ticket-pink-floyd.png";
export const TICKET_TEMPLATE_RELATIVE_PATH = `public/templates/${TICKET_TEMPLATE_FILENAME}`;
/** Public URL path served from `public/templates/` (not `/public/templates/`). */
export const TICKET_TEMPLATE_PUBLIC_PATH = `/templates/${TICKET_TEMPLATE_FILENAME}`;

export const DEFAULT_TEST_PRINT_FROM = formatTicketCode(1);
export const DEFAULT_TEST_PRINT_TO = formatTicketCode(5);
export const FULL_PRINT_FROM = formatTicketCode(1);
export const FULL_PRINT_TO = formatTicketCode(500);

export function isDebugPrintLayout(): boolean {
  const fromProcess = typeof process !== "undefined" ? process.env.DEBUG_PRINT_LAYOUT : undefined;
  const fromMeta = typeof import.meta !== "undefined" ? import.meta.env?.DEBUG_PRINT_LAYOUT : undefined;
  return fromProcess === "true" || fromMeta === "true";
}
