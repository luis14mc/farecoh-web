import { createHash } from "node:crypto";
import sharp from "sharp";
import jsQR from "jsqr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTicketQrUrl, buildCodeTextSvg, countDarkPixelsInBox, resolveLayoutForPng } from "./ticket-image-compose.ts";
import { TICKET_CODE_FONT_FAMILY } from "./ticket-code-font.ts";
import { generateDigitalTicketImage } from "./ticket-delivery.ts";
import { assertTicketIdentity, hashQrToken } from "./ticket-delivery-identity.ts";
import type { DeliverableTicket } from "./ticket-delivery-access.ts";
import { readTicketLayoutConfig } from "./ticket-layout-config.ts";
import type { TicketLayoutConfig } from "./ticket-layouts/types.ts";

export interface DigitalTicketVerificationReport {
  ok: boolean;
  requestedTicket: string;
  renderedTicket: string;
  qrDecodedUrl: string | null;
  qrDecodedMatch: boolean;
  codeVisible: boolean;
  publicTicketResolved: string | null;
  publicTicketMatch: boolean;
  qrTokenModified: boolean;
  ticketCodeModified: boolean;
  qrTokenHash: string;
  layoutSource: string;
  message: string;
}

export class TicketDeliveryVerificationError extends Error {
  readonly report: DigitalTicketVerificationReport;

  constructor(report: DigitalTicketVerificationReport) {
    super(report.message);
    this.name = "TicketDeliveryVerificationError";
    this.report = report;
  }
}

async function decodeQrFromRegion(
  pngBuffer: Buffer,
  layout: TicketLayoutConfig,
): Promise<string | null> {
  const box = layout.qrBoxes[0];
  if (!box) return null;

  const metadata = await sharp(pngBuffer).metadata();
  if (!metadata.width || !metadata.height) return null;

  const left = Math.max(0, Math.min(box.x, metadata.width - 1));
  const top = Math.max(0, Math.min(box.y, metadata.height - 1));
  const width = Math.min(box.width, metadata.width - left);
  const height = Math.min(box.height, metadata.height - top);

  const { data, info } = await sharp(pngBuffer)
    .extract({ left, top, width, height })
    .resize(width * 3, height * 3, { kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const clamped = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  const decoded = jsQR(clamped, info.width, info.height);
  return decoded?.data ?? null;
}

export async function decodeDigitalTicketQrUrl(
  pngBuffer: Buffer,
  layout?: TicketLayoutConfig,
): Promise<string | null> {
  const config = layout ?? (await readTicketLayoutConfig("digital")).config;
  const scaled = await resolveLayoutForPng(config, pngBuffer);
  return decodeQrFromRegion(pngBuffer, scaled);
}

export function verifyRenderedTicketCodeSvg(ticketCode: string, layout: TicketLayoutConfig): boolean {
  const box = layout.codeBoxes[0];
  if (!box) return false;

  const svg = buildCodeTextSvg(ticketCode, box, layout.codeFontSize, {
    fill: "#000000",
    fontWeight: 700,
    renderMode: "digital",
  }).toString();

  return (
    svg.includes(`font-family="${TICKET_CODE_FONT_FAMILY}"`) &&
    svg.includes("@font-face") &&
    svg.includes('fill="#000000"') &&
    svg.includes(`>${ticketCode}<`)
  );
}

export async function verifyTicketCodeVisibleInPng(
  pngBuffer: Buffer,
  layout: TicketLayoutConfig,
): Promise<boolean> {
  const scaled = await resolveLayoutForPng(layout, pngBuffer);
  const box = scaled.codeBoxes[0];
  if (!box) return false;

  const darkPixels = await countDarkPixelsInBox(pngBuffer, box);
  return darkPixels > 50;
}

async function resolvePublicTicketCode(
  supabase: SupabaseClient,
  qrToken: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_public_ticket_status", {
    p_qr_token: qrToken,
  });

  if (error || !data?.length) return null;
  return data[0]?.ticket_code ?? null;
}

export async function verifyDigitalTicketRecord(
  supabase: SupabaseClient,
  requestedTicketCode: string,
  ticket: DeliverableTicket,
  pngBuffer: Buffer,
): Promise<DigitalTicketVerificationReport> {
  const requested = requestedTicketCode.trim().toUpperCase();
  const originalCode = ticket.ticket_code;
  const originalToken = ticket.qr_token;
  const expectedUrl = buildTicketQrUrl(originalToken);

  assertTicketIdentity(requested, ticket);

  const layoutRecord = await readTicketLayoutConfig("digital");
  const { config } = layoutRecord;

  const svgOk = verifyRenderedTicketCodeSvg(originalCode, config);
  const codeVisible = await verifyTicketCodeVisibleInPng(pngBuffer, config);
  const qrDecodedUrl = await decodeDigitalTicketQrUrl(pngBuffer, config);
  const qrDecodedMatch = qrDecodedUrl === expectedUrl;
  const publicTicketResolved = await resolvePublicTicketCode(supabase, originalToken);
  const publicTicketMatch = publicTicketResolved === originalCode;

  const { data: after } = await supabase
    .from("tickets")
    .select("ticket_code, qr_token")
    .eq("id", ticket.id)
    .single();

  const qrTokenModified = !after || after.qr_token !== originalToken;
  const ticketCodeModified = !after || after.ticket_code !== originalCode;

  const ok =
    svgOk &&
    codeVisible &&
    qrDecodedMatch &&
    publicTicketMatch &&
    !qrTokenModified &&
    !ticketCodeModified &&
    requested === originalCode;

  const message = ok
    ? "Digital ticket identity and QR verified."
    : [
        "Digital ticket verification failed.",
        !codeVisible ? "Ticket code not visible at calibrated position." : null,
        !qrDecodedMatch ? "QR decode mismatch at calibrated position." : null,
        !publicTicketMatch ? "Public ticket lookup mismatch." : null,
        qrTokenModified || ticketCodeModified ? "Ticket identity changed during render." : null,
      ]
        .filter(Boolean)
        .join(" ");

  return {
    ok,
    requestedTicket: requested,
    renderedTicket: originalCode,
    qrDecodedUrl,
    qrDecodedMatch,
    codeVisible,
    publicTicketResolved,
    publicTicketMatch,
    qrTokenModified,
    ticketCodeModified,
    qrTokenHash: hashQrToken(originalToken),
    layoutSource: layoutRecord.source,
    message,
  };
}

export async function produceVerifiedDigitalTicketPng(
  supabase: SupabaseClient,
  requestedTicketCode: string,
  ticket: DeliverableTicket,
): Promise<{ pngBuffer: Buffer; report: DigitalTicketVerificationReport }> {
  assertTicketIdentity(requestedTicketCode, ticket);

  const pngBuffer = await generateDigitalTicketImage(ticket.ticket_code, ticket.qr_token);
  const report = await verifyDigitalTicketRecord(supabase, requestedTicketCode, ticket, pngBuffer);

  if (!report.ok) {
    throw new TicketDeliveryVerificationError(report);
  }

  return { pngBuffer, report };
}

export function verificationReportToText(report: DigitalTicketVerificationReport): string {
  return [
    `Requested ticket: ${report.requestedTicket}`,
    `Rendered ticket: ${report.renderedTicket}`,
    `Layout source: ${report.layoutSource}`,
    `Code visible: ${report.codeVisible ? "YES" : "NO"}`,
    `QR decoded URL: ${report.qrDecodedMatch ? "MATCH" : "MISMATCH"}`,
    `Public ticket resolved: ${report.publicTicketResolved ?? "NONE"}`,
    `QR token modified: ${report.qrTokenModified ? "YES" : "NO"}`,
    `Ticket code modified: ${report.ticketCodeModified ? "YES" : "NO"}`,
  ].join("\n");
}

export function stablePreviewQrToken(ticketCode: string): string {
  return createHash("sha256").update(`calibration-preview:${ticketCode}`).digest("hex");
}
