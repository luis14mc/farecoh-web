import assert from "node:assert/strict";
import test from "node:test";
import {
  isMissingLayoutTableError,
  parseLayoutTypeParam,
  resolveLayoutTypeParam,
} from "../src/lib/ticket-layout-api.ts";
import {
  normalizeStoredLayoutConfig,
  parseLayoutRequestBody,
} from "../src/lib/ticket-layout-config.ts";
import { restorePhysicalTicketLayout } from "../src/lib/ticket-layouts/physical-ticket-layout.ts";

test("parseLayoutTypeParam accepts physical and digital only", () => {
  assert.equal(parseLayoutTypeParam("physical"), "physical");
  assert.equal(parseLayoutTypeParam("digital"), "digital");
  assert.equal(parseLayoutTypeParam("invalid"), null);
  assert.equal(parseLayoutTypeParam(undefined), null);
});

test("resolveLayoutTypeParam reads layoutType and legacy type param", () => {
  assert.equal(resolveLayoutTypeParam({ layoutType: "physical" }), "physical");
  assert.equal(resolveLayoutTypeParam({ type: "digital" }), "digital");
  assert.equal(resolveLayoutTypeParam({ layoutType: "physical", type: "digital" }), "physical");
});

test("parseLayoutRequestBody accepts extended POST payload with ids and per-box fontSize", () => {
  const body = {
    templatePath: "/templates/ticket-pink-floyd.png",
    templateWidth: 2000,
    templateHeight: 760,
    codeBoxes: [
      { id: "left-code", x: 100, y: 100, width: 250, height: 70, fontSize: 36 },
      { id: "right-code", x: 1600, y: 120, width: 250, height: 70, fontSize: 36 },
    ],
    qrBoxes: [
      { id: "left-qr", x: 100, y: 220, width: 240, height: 240 },
      { id: "right-qr", x: 1600, y: 240, width: 240, height: 240 },
    ],
  };

  const parsed = parseLayoutRequestBody(body, "physical");
  assert.equal(parsed.templatePath, "/templates/ticket-pink-floyd.png");
  assert.equal(parsed.config.codeBoxes.length, 2);
  assert.equal(parsed.config.qrBoxes.length, 2);
  assert.equal(parsed.config.codeFontSize, 36);
  assert.equal(parsed.storedConfig.codeBoxes?.[0]?.id, "left-code");
});

test("parseLayoutRequestBody accepts legacy { config: ... } wrapper", () => {
  const defaults = restorePhysicalTicketLayout();
  const parsed = parseLayoutRequestBody({ config: defaults }, "physical");
  assert.equal(parsed.config.codeBoxes.length, defaults.codeBoxes.length);
});

test("normalizeStoredLayoutConfig preserves optional overlay ids", () => {
  const normalized = normalizeStoredLayoutConfig(
    {
      templatePath: "/templates/digital-ticket.png",
      templateWidth: 1050,
      templateHeight: 1890,
      codeFontSize: 34,
      codeBoxes: [{ id: "ticket-code", x: 340, y: 1400, width: 400, height: 80 }],
      qrBoxes: [{ id: "ticket-qr", x: 360, y: 910, width: 360, height: 360 }],
    },
    "digital",
  );

  assert.equal(normalized.storedConfig.codeBoxes?.[0]?.id, "ticket-code");
  assert.equal(normalized.storedConfig.qrBoxes?.[0]?.id, "ticket-qr");
});

test("isMissingLayoutTableError detects PostgREST missing table codes", () => {
  assert.equal(
    isMissingLayoutTableError({ code: "PGRST205", message: "Could not find the table public.ticket_layout_configs" }),
    true,
  );
  assert.equal(
    isMissingLayoutTableError({ code: "42P01", message: 'relation "ticket_layout_configs" does not exist' }),
    true,
  );
  assert.equal(isMissingLayoutTableError({ code: "23505", message: "duplicate key value" }), false);
});
