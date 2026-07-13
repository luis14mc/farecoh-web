import assert from "node:assert/strict";
import test from "node:test";
import { buildCodeTextSvg, buildTicketQrUrl } from "../src/lib/ticket-image-compose.ts";
import { assertTicketIdentity, hashQrToken } from "../src/lib/ticket-delivery-identity.ts";
import {
  generateDigitalTicketImage,
  generatePhysicalTicketImage,
} from "../src/lib/ticket-delivery.ts";
import { DEFAULT_DIGITAL_TICKET_LAYOUT } from "../src/lib/ticket-layouts/digital-ticket-layout.ts";
import {
  decodeDigitalTicketQrUrl,
  stablePreviewQrToken,
  verifyRenderedTicketCodeSvg,
  verifyTicketCodeVisibleInPng,
} from "../src/lib/ticket-delivery-verify.ts";
import { scaleLayoutToTemplate } from "../src/lib/ticket-image-compose.ts";

const ticketCode = "PF-000016";
const qrToken = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

test("digital ticket code SVG uses safe Arial stack and black fill", () => {
  const box = DEFAULT_DIGITAL_TICKET_LAYOUT.codeBoxes[0];
  const svg = buildCodeTextSvg(ticketCode, box, 34, {
    fill: "#000000",
    fontWeight: 700,
    renderMode: "digital",
  }).toString();

  assert.match(svg, /font-family="Arial, Helvetica, sans-serif"/);
  assert.match(svg, /fill="#000000"/);
  assert.match(svg, /font-weight="700"/);
  assert.match(svg, /PF-000016/);
  assert.doesNotMatch(svg, /Montserrat/);
  assert.doesNotMatch(svg, /dominant-baseline/);
});

test("physical ticket code SVG keeps physical render mode", () => {
  const box = { x: 0, y: 0, width: 200, height: 40 };
  const svg = buildCodeTextSvg(ticketCode, box, 36, {
    fill: "#EDE8FA",
    fontWeight: 700,
    renderMode: "physical",
  }).toString();

  assert.match(svg, /fill="#EDE8FA"/);
  assert.match(svg, /Montserrat/);
});

test("QR URL is built only from stored qr_token", () => {
  assert.equal(buildTicketQrUrl(qrToken), `https://www.farecoh.org/t/${qrToken}`);
  assert.doesNotMatch(buildTicketQrUrl(qrToken), /PF-000016/);
});

test("assertTicketIdentity rejects mismatched codes", () => {
  assert.throws(() =>
    assertTicketIdentity("PF-000016", {
      id: "1",
      ticket_code: "PF-000017",
      qr_token: qrToken,
      status: "sold",
    }),
  );
});

test("verifyRenderedTicketCodeSvg validates digital overlay markup", () => {
  assert.equal(verifyRenderedTicketCodeSvg(ticketCode, DEFAULT_DIGITAL_TICKET_LAYOUT), true);
});

test("generated digital PNG decodes QR to stored token URL", async () => {
  const png = await generateDigitalTicketImage(ticketCode, qrToken);
  const decoded = await decodeDigitalTicketQrUrl(png);
  assert.equal(decoded, buildTicketQrUrl(qrToken));
});

test("generated digital PNG renders visible ticket code pixels", async () => {
  const png = await generateDigitalTicketImage(ticketCode, qrToken);
  const visible = await verifyTicketCodeVisibleInPng(png, DEFAULT_DIGITAL_TICKET_LAYOUT, ticketCode);
  assert.equal(visible, true);
});

test("scaleLayoutToTemplate adapts stored calibration to actual PNG size", () => {
  const stored = {
    ...DEFAULT_DIGITAL_TICKET_LAYOUT,
    templateWidth: 1080,
    templateHeight: 1920,
    codeBoxes: [{ x: 340, y: 1400, width: 400, height: 80 }],
    qrBoxes: [{ x: 360, y: 910, width: 360, height: 360 }],
  };
  const scaled = scaleLayoutToTemplate(stored, 1050, 1890);
  assert.equal(scaled.templateWidth, 1050);
  assert.equal(scaled.templateHeight, 1890);
  assert.equal(scaled.codeBoxes[0].x, 331);
  assert.equal(scaled.qrBoxes[0].y, 896);
});

test("physical ticket generation remains available and unchanged in API surface", async () => {
  const png = await generatePhysicalTicketImage(ticketCode, qrToken);
  assert.ok(png.length > 1000);
});

test("preview QR token is deterministic and not a random placeholder", () => {
  const a = stablePreviewQrToken("PF-000001");
  const b = stablePreviewQrToken("PF-000001");
  const c = stablePreviewQrToken("PF-000002");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.doesNotMatch(a, /preview-token/);
});

test("hashQrToken never exposes raw token", () => {
  const hash = hashQrToken(qrToken);
  assert.equal(hash.length, 12);
  assert.ok(!hash.includes(qrToken));
});
