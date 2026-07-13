import { composeTicketPng, buildTicketQrUrl } from "./ticket-image-compose.ts";
import {
  buildDigitalTicketFilename,
  restoreDigitalTicketLayout,
} from "./ticket-layouts/digital-ticket-layout.ts";
import {
  readTicketLayoutConfig,
  loadDigitalTemplateBytes,
  loadPhysicalTemplateBytes,
} from "./ticket-layout-config.ts";
import { stablePreviewQrToken } from "./ticket-delivery-verify.ts";

export { buildTicketQrUrl, buildDigitalTicketFilename };

export function isPngBuffer(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

export async function generateDigitalTicketImage(
  ticketCode: string,
  qrToken: string,
): Promise<Buffer> {
  const [{ config }, templateBuffer] = await Promise.all([
    readTicketLayoutConfig("digital"),
    loadDigitalTemplateBytes(),
  ]);

  return composeTicketPng(templateBuffer, config, ticketCode, qrToken, {
    codeFill: "#000000",
    codeFontWeight: 700,
    codeRenderMode: "digital",
  });
}

export async function generatePhysicalTicketImage(
  ticketCode: string,
  qrToken: string,
): Promise<Buffer> {
  const [{ config }, templateBuffer] = await Promise.all([
    readTicketLayoutConfig("physical"),
    loadPhysicalTemplateBytes(),
  ]);

  return composeTicketPng(templateBuffer, config, ticketCode, qrToken, {
    codeFill: "#EDE8FA",
    codeFontWeight: 700,
    codeRenderMode: "physical",
  });
}

/** @deprecated Use generateDigitalTicketImage */
export async function generateTicketImage(ticketCode: string, qrToken: string): Promise<Buffer> {
  return generateDigitalTicketImage(ticketCode, qrToken);
}

/** Calibration preview only — never used by production delivery endpoints. */
export async function generateLayoutPreviewImage(
  layoutType: "physical" | "digital",
  ticketCode: string,
): Promise<Buffer> {
  const templateBuffer =
    layoutType === "physical" ? await loadPhysicalTemplateBytes() : await loadDigitalTemplateBytes();
  const { config } = await readTicketLayoutConfig(layoutType);
  const previewQrToken = stablePreviewQrToken(ticketCode);

  return composeTicketPng(templateBuffer, config, ticketCode, previewQrToken, {
    codeFill: layoutType === "physical" ? "#EDE8FA" : "#000000",
    codeFontWeight: 700,
    codeRenderMode: layoutType === "physical" ? "physical" : "digital",
  });
}

export function buildPhysicalTicketFilename(ticketCode: string): string {
  return `farecoh-physical-${ticketCode}.png`;
}

export { restoreDigitalTicketLayout };
