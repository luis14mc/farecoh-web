import type { PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import { CODE_FONT_SIZE } from "./ticket-print-constants.ts";
import { QR_HEIGHT_POINTS, QR_WIDTH_POINTS } from "./ticket-print-measurements.ts";
import type { TicketPrintLayout, TicketTemplateDimensions } from "../types/ticket-print-layout.ts";

/** Convert top-left Y to pdf-lib bottom-left Y for a box top edge. */
export function topLeftYToPdf(pageHeight: number, top: number, boxHeight: number): number {
  return pageHeight - top - boxHeight;
}

export function layoutCenterToPagePoint(
  layout: TicketPrintLayout,
  template: TicketTemplateDimensions,
  target: "qr" | "code",
) {
  const xPercent = target === "qr" ? layout.qrCenterXPercent : layout.codeCenterXPercent;
  const yPercent = target === "qr" ? layout.qrCenterYPercent : layout.codeCenterYPercent;

  return {
    x: template.width * xPercent,
    yFromTop: template.height * yPercent,
    y: template.height - template.height * yPercent,
  };
}

export function codeTextBaselineY(
  layout: TicketPrintLayout,
  template: TicketTemplateDimensions,
): number {
  const center = layoutCenterToPagePoint(layout, template, "code");
  return center.y - CODE_FONT_SIZE * 0.34;
}

export function qrImageRect(layout: TicketPrintLayout, template: TicketTemplateDimensions) {
  const center = layoutCenterToPagePoint(layout, template, "qr");

  return {
    x: center.x - QR_WIDTH_POINTS / 2,
    y: center.y - QR_HEIGHT_POINTS / 2,
    width: QR_WIDTH_POINTS,
    height: QR_HEIGHT_POINTS,
  };
}

function drawCross(page: PDFPage, x: number, y: number, color: ReturnType<typeof rgb>): void {
  const size = 18;
  page.drawLine({
    start: { x: x - size, y },
    end: { x: x + size, y },
    color,
    thickness: 2,
  });
  page.drawLine({
    start: { x, y: y - size },
    end: { x, y: y + size },
    color,
    thickness: 2,
  });
}

export function drawPrintLayoutDebugBoxes(
  page: PDFPage,
  layout: TicketPrintLayout,
  template: TicketTemplateDimensions,
): void {
  const qrCenter = layoutCenterToPagePoint(layout, template, "qr");
  const codeCenter = layoutCenterToPagePoint(layout, template, "code");
  const qrRect = qrImageRect(layout, template);

  drawCross(page, qrCenter.x, qrCenter.y, rgb(1, 0, 0));
  drawCross(page, codeCenter.x, codeCenter.y, rgb(0, 0.72, 0.18));

  page.drawRectangle({
    ...qrRect,
    borderColor: rgb(0.1, 0.35, 1),
    borderWidth: 2,
  });

  page.drawText("QR center", {
    x: qrCenter.x + 24,
    y: qrCenter.y + 6,
    size: 20,
    color: rgb(1, 0, 0),
  });
  page.drawText("Code center", {
    x: codeCenter.x + 24,
    y: codeCenter.y + 6,
    size: 20,
    color: rgb(0, 0.72, 0.18),
  });
}