import assert from "node:assert/strict";
import test from "node:test";
import { QR_HEIGHT_POINTS, QR_WIDTH_POINTS } from "../src/lib/ticket-print-measurements.ts";
import { layoutCenterToPagePoint, qrImageRect } from "../src/lib/ticket-print-layout.ts";
import type { TicketPrintLayout } from "../src/types/ticket-print-layout.ts";

const template = { width: 2000, height: 800 };
const layout: TicketPrintLayout = {
  qrCenterXPercent: 0.859,
  qrCenterYPercent: 0.729,
  codeCenterXPercent: 0.855,
  codeCenterYPercent: 0.4825,
  updatedAt: null,
};

test("ticket print layout uses calibrated percentages and physical QR points", () => {
  const qrCenter = layoutCenterToPagePoint(layout, template, "qr");
  const codeCenter = layoutCenterToPagePoint(layout, template, "code");
  const qrRect = qrImageRect(layout, template);

  assert.equal(qrCenter.x, template.width * layout.qrCenterXPercent);
  assert.equal(qrCenter.yFromTop, template.height * layout.qrCenterYPercent);
  assert.equal(codeCenter.x, template.width * layout.codeCenterXPercent);
  assert.equal(codeCenter.yFromTop, template.height * layout.codeCenterYPercent);

  assert.equal(Number(QR_WIDTH_POINTS.toFixed(2)), 295.28);
  assert.equal(Number(QR_HEIGHT_POINTS.toFixed(2)), 283.46);
  assert.equal(qrRect.width, QR_WIDTH_POINTS);
  assert.equal(qrRect.height, QR_HEIGHT_POINTS);
  assert.equal(qrRect.x + qrRect.width / 2, qrCenter.x);
  assert.equal(qrRect.y + qrRect.height / 2, qrCenter.y);
});