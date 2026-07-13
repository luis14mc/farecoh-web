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
import { restorePhysicalTicketLayout } from "./ticket-layouts/physical-ticket-layout.ts";

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

  return composeTicketPng(templateBuffer, config, ticketCode, qrToken);
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
  });
}

/** @deprecated Use generateDigitalTicketImage */
export async function generateTicketImage(ticketCode: string, qrToken: string): Promise<Buffer> {
  return generateDigitalTicketImage(ticketCode, qrToken);
}

export async function generateLayoutPreviewImage(
  layoutType: "physical" | "digital",
  ticketCode: string,
  qrToken?: string,
): Promise<Buffer> {
  const token = qrToken ?? "preview-token-not-for-validation";
  const templateBuffer =
    layoutType === "physical" ? await loadPhysicalTemplateBytes() : await loadDigitalTemplateBytes();
  const { config } = await readTicketLayoutConfig(layoutType);

  return composeTicketPng(templateBuffer, config, ticketCode, token, {
    codeFill: layoutType === "physical" ? "#EDE8FA" : "#FFFFFF",
    codeFontWeight: layoutType === "physical" ? 700 : 900,
  });
}

export function buildPhysicalTicketFilename(ticketCode: string): string {
  return `farecoh-physical-${ticketCode}.png`;
}
