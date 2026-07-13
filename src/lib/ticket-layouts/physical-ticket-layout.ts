import { QR_HEIGHT_POINTS, QR_WIDTH_POINTS } from "../ticket-print-measurements.ts";
import type { TicketLayoutConfig } from "./types.ts";

export const PHYSICAL_TICKET_TEMPLATE_PATH = "/templates/ticket-pink-floyd.png";
export const PHYSICAL_TICKET_TEMPLATE_FILENAME = "ticket-pink-floyd.png";

const CODE_BOX_WIDTH = 200;
const CODE_BOX_HEIGHT = 40;
const QR_SIZE = Math.round(QR_WIDTH_POINTS);

function codeBoxFromCenter(centerX: number, centerY: number) {
  return {
    x: Math.round(centerX - CODE_BOX_WIDTH / 2),
    y: Math.round(centerY - CODE_BOX_HEIGHT / 2),
    width: CODE_BOX_WIDTH,
    height: CODE_BOX_HEIGHT,
  };
}

function qrBoxFromCenter(centerX: number, centerY: number) {
  return {
    x: Math.round(centerX - QR_SIZE / 2),
    y: Math.round(centerY - QR_SIZE / 2),
    width: QR_SIZE,
    height: QR_SIZE,
  };
}

/** Default overlay positions for the 2000×800 physical template (left + right sections). */
export const DEFAULT_PHYSICAL_TICKET_LAYOUT: TicketLayoutConfig = {
  templateWidth: 2000,
  templateHeight: 800,
  codeFontSize: 36,
  codeBoxes: [
    codeBoxFromCenter(290, 386),
    codeBoxFromCenter(1710, 386),
  ],
  qrBoxes: [
    qrBoxFromCenter(282, 583),
    qrBoxFromCenter(1718, 583),
  ],
};

export function restorePhysicalTicketLayout(): TicketLayoutConfig {
  return structuredClone(DEFAULT_PHYSICAL_TICKET_LAYOUT);
}
