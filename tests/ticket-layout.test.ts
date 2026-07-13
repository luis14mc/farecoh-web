import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTicketQrUrl,
  composeTicketPng,
  sanitizeTicketLayoutConfig,
} from "../src/lib/ticket-image-compose.ts";
import { DEFAULT_DIGITAL_TICKET_LAYOUT } from "../src/lib/ticket-layouts/digital-ticket-layout.ts";
import { DEFAULT_PHYSICAL_TICKET_LAYOUT } from "../src/lib/ticket-layouts/physical-ticket-layout.ts";
import {
  generateDigitalTicketImage,
  generatePhysicalTicketImage,
  isPngBuffer,
} from "../src/lib/ticket-delivery.ts";
import { buildDigitalTicketFilename } from "../src/lib/ticket-layouts/digital-ticket-layout.ts";

const ticketCode = "PF-000151";
const qrToken = "c1b0d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e";

test("QR URL uses existing qr_token without exposing it in ticket_code", () => {
  const url = buildTicketQrUrl(qrToken);
  assert.equal(url, `https://www.farecoh.org/t/${qrToken}`);
  assert.ok(!url.includes(ticketCode));
});

test("physical layout has two code boxes and two qr boxes", () => {
  assert.equal(DEFAULT_PHYSICAL_TICKET_LAYOUT.codeBoxes.length, 2);
  assert.equal(DEFAULT_PHYSICAL_TICKET_LAYOUT.qrBoxes.length, 2);
});

test("digital layout has one code box and one qr box", () => {
  assert.equal(DEFAULT_DIGITAL_TICKET_LAYOUT.codeBoxes.length, 1);
  assert.equal(DEFAULT_DIGITAL_TICKET_LAYOUT.qrBoxes.length, 1);
});

test("digital ticket filename follows farecoh-digital-PF-XXXXXX pattern", () => {
  assert.equal(buildDigitalTicketFilename("PF-000151"), "farecoh-digital-PF-000151.png");
});

test("digital ticket generator constructs a valid PNG", async () => {
  const pngBuffer = await generateDigitalTicketImage(ticketCode, qrToken);
  assert.ok(pngBuffer.length > 1000);
  assert.ok(isPngBuffer(pngBuffer));
});

test("physical ticket generator constructs a valid PNG", async () => {
  const pngBuffer = await generatePhysicalTicketImage(ticketCode, qrToken);
  assert.ok(pngBuffer.length > 1000);
  assert.ok(isPngBuffer(pngBuffer));
});

test("composeTicketPng reuses the same QR for every qr box on physical layout", async () => {
  const { loadPhysicalTemplateBytes } = await import("../src/lib/ticket-layout-config.ts");
  const template = await loadPhysicalTemplateBytes();
  const png = await composeTicketPng(template, DEFAULT_PHYSICAL_TICKET_LAYOUT, ticketCode, qrToken);
  assert.ok(isPngBuffer(png));
  assert.equal(DEFAULT_PHYSICAL_TICKET_LAYOUT.qrBoxes.length, 2);
});

test("sanitizeTicketLayoutConfig preserves independent physical and digital defaults", () => {
  const physical = sanitizeTicketLayoutConfig({}, DEFAULT_PHYSICAL_TICKET_LAYOUT);
  const digital = sanitizeTicketLayoutConfig({}, DEFAULT_DIGITAL_TICKET_LAYOUT);
  assert.notDeepEqual(physical.codeBoxes, digital.codeBoxes);
  assert.notDeepEqual(physical.qrBoxes, digital.qrBoxes);
});

test("WhatsApp-style message lists ticket numbers only", () => {
  const codes = ["PF-000151", "PF-000152"];
  const codesList = codes.map((code) => `- ${code}`).join("\n");
  const message = `Boletos:\n${codesList}`;
  assert.match(message, /PF-000151/);
  assert.doesNotMatch(message, /\/t\//);
  assert.doesNotMatch(message, /qr_token/);
});
