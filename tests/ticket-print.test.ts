import assert from "node:assert/strict";
import test from "node:test";
import {
  CODE_X,
  QR_SIZE,
  QR_X,
  QR_Y,
} from "../src/lib/ticket-print-constants.ts";
import { qrImageRect } from "../src/lib/ticket-print-layout.ts";

test("ticket print layout targets right stub on 2000x800 template", () => {
  const pageHeight = 800;
  const qrRect = qrImageRect(pageHeight);

  assert.ok(CODE_X > 1500, "code should be on right stub, not donation area");
  assert.ok(QR_X > 1500, "QR should be on right stub");
  assert.ok(QR_Y + QR_SIZE < pageHeight, "QR must fit inside template height");
  assert.ok(qrRect.y >= 0, "QR pdf-lib Y must be on-page");
  assert.equal(qrRect.width, QR_SIZE);
  assert.equal(qrRect.height, QR_SIZE);
});
