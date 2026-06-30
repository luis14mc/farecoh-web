import type { PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import {
  CODE_FONT_SIZE,
  CODE_MASK_HEIGHT,
  CODE_MASK_WIDTH,
  CODE_X,
  CODE_Y,
  QR_SIZE,
  QR_X,
  QR_Y,
} from "./ticket-print-constants.ts";

/** Convert top-left Y to pdf-lib bottom-left Y for a box top edge. */
export function topLeftYToPdf(pageHeight: number, top: number, boxHeight: number): number {
  return pageHeight - top - boxHeight;
}

export function codeTextBaselineY(pageHeight: number): number {
  return pageHeight - CODE_Y - CODE_FONT_SIZE * 0.32;
}

export function codeMaskRect(pageHeight: number) {
  return {
    x: CODE_X - CODE_MASK_WIDTH / 2,
    y: topLeftYToPdf(pageHeight, CODE_Y - CODE_MASK_HEIGHT / 2, CODE_MASK_HEIGHT),
    width: CODE_MASK_WIDTH,
    height: CODE_MASK_HEIGHT,
  };
}

export function qrImageRect(pageHeight: number) {
  return {
    x: QR_X,
    y: topLeftYToPdf(pageHeight, QR_Y, QR_SIZE),
    width: QR_SIZE,
    height: QR_SIZE,
  };
}

export function drawPrintLayoutDebugBoxes(page: PDFPage, pageHeight: number): void {
  const codeRect = codeMaskRect(pageHeight);
  page.drawRectangle({
    ...codeRect,
    borderColor: rgb(0.2, 0.45, 1),
    borderWidth: 2,
  });

  const qrRect = qrImageRect(pageHeight);
  page.drawRectangle({
    ...qrRect,
    borderColor: rgb(1, 0.2, 0.2),
    borderWidth: 2,
  });
}
