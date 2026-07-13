import assert from "node:assert/strict";
import test from "node:test";
import { generateTicketImage, isPngBuffer } from "../src/lib/ticket-delivery.ts";

test("digital ticket generator constructs a valid PNG", async () => {
  const ticketCode = "PF-000151";
  const qrToken = "c1b0d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e";

  console.log("Generating test digital ticket...");
  const pngBuffer = await generateTicketImage(ticketCode, qrToken);

  assert.ok(pngBuffer);
  assert.ok(pngBuffer.length > 1000, "PNG buffer should not be empty");
  assert.ok(isPngBuffer(pngBuffer), "Buffer should start with PNG magic bytes");
});
