import sharp from "sharp";
import QRCode from "qrcode";
import type { OverlayBox, TicketLayoutConfig } from "./ticket-layouts/types.ts";

export const TICKET_QR_PUBLIC_BASE_URL = "https://www.farecoh.org";

export type CodeTextRenderMode = "digital" | "physical";

export function buildTicketQrUrl(qrToken: string): string {
  return `${TICKET_QR_PUBLIC_BASE_URL}/t/${qrToken}`;
}

function clampBox(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function sanitizeOverlayBox(value: unknown, fallback: OverlayBox): OverlayBox {
  const candidate = value && typeof value === "object" ? (value as Partial<OverlayBox>) : {};
  return {
    x: clampBox(candidate.x, fallback.x),
    y: clampBox(candidate.y, fallback.y),
    width: Math.max(1, clampBox(candidate.width, fallback.width)),
    height: Math.max(1, clampBox(candidate.height, fallback.height)),
  };
}

export function sanitizeTicketLayoutConfig(
  value: unknown,
  defaults: TicketLayoutConfig,
): TicketLayoutConfig {
  const candidate = value && typeof value === "object" ? (value as Partial<TicketLayoutConfig>) : {};

  const codeBoxes = Array.isArray(candidate.codeBoxes)
    ? candidate.codeBoxes.map((box, index) =>
        sanitizeOverlayBox(box, defaults.codeBoxes[index] ?? defaults.codeBoxes[0]),
      )
    : defaults.codeBoxes.map((box) => ({ ...box }));

  const qrBoxes = Array.isArray(candidate.qrBoxes)
    ? candidate.qrBoxes.map((box, index) =>
        sanitizeOverlayBox(box, defaults.qrBoxes[index] ?? defaults.qrBoxes[0]),
      )
    : defaults.qrBoxes.map((box) => ({ ...box }));

  while (codeBoxes.length < defaults.codeBoxes.length) {
    codeBoxes.push({ ...defaults.codeBoxes[codeBoxes.length] });
  }
  while (qrBoxes.length < defaults.qrBoxes.length) {
    qrBoxes.push({ ...defaults.qrBoxes[qrBoxes.length] });
  }

  return {
    templateWidth: Math.max(1, clampBox(candidate.templateWidth, defaults.templateWidth)),
    templateHeight: Math.max(1, clampBox(candidate.templateHeight, defaults.templateHeight)),
    codeFontSize: Math.max(8, clampBox(candidate.codeFontSize, defaults.codeFontSize)),
    codeBoxes: codeBoxes.slice(0, defaults.codeBoxes.length),
    qrBoxes: qrBoxes.slice(0, defaults.qrBoxes.length),
  };
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildCodeTextSvg(
  ticketCode: string,
  box: OverlayBox,
  fontSize: number,
  options?: { fill?: string; fontWeight?: number; renderMode?: CodeTextRenderMode },
): Buffer {
  const renderMode = options?.renderMode ?? "physical";
  const safeCode = escapeXml(ticketCode);

  if (renderMode === "digital") {
    const fill = options?.fill ?? "#000000";
    const fontWeight = options?.fontWeight ?? 700;
    const svg = `<svg width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="transparent"/>
  <text
    x="50%"
    y="50%"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    fill="${fill}"
  >${safeCode}</text>
</svg>`;
    return Buffer.from(svg);
  }

  const fill = options?.fill ?? "#FFFFFF";
  const fontWeight = options?.fontWeight ?? 900;
  const centerX = box.width / 2;
  const centerY = box.height / 2 + fontSize * 0.35;

  const svg = `<svg width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${centerX}"
    y="${centerY}"
    font-family="'Montserrat', 'Helvetica', 'Arial', sans-serif"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    fill="${fill}"
    text-anchor="middle"
    letter-spacing="1.5px"
  >${safeCode}</text>
</svg>`;

  return Buffer.from(svg);
}

async function buildQrPng(qrUrl: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(qrUrl, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export async function composeTicketPng(
  templateBuffer: Buffer,
  layout: TicketLayoutConfig,
  ticketCode: string,
  qrToken: string,
  options?: {
    codeFill?: string;
    codeFontWeight?: number;
    codeRenderMode?: CodeTextRenderMode;
    qrDark?: string;
  },
): Promise<Buffer> {
  const qrUrl = buildTicketQrUrl(qrToken);
  const composites: sharp.OverlayOptions[] = [];

  if (layout.qrBoxes.length > 0) {
    const maxQrSize = Math.max(...layout.qrBoxes.map((box) => Math.max(box.width, box.height)));
    const qrBase = await buildQrPng(qrUrl, maxQrSize);

    for (const box of layout.qrBoxes) {
      const qrBuffer =
        box.width === maxQrSize && box.height === maxQrSize
          ? qrBase
          : await sharp(qrBase).resize(box.width, box.height, { fit: "fill" }).png().toBuffer();

      composites.push({ input: qrBuffer, top: box.y, left: box.x });
    }
  }

  const renderMode = options?.codeRenderMode ?? "physical";

  for (const box of layout.codeBoxes) {
    composites.push({
      input: buildCodeTextSvg(ticketCode, box, layout.codeFontSize, {
        fill: options?.codeFill,
        fontWeight: options?.codeFontWeight,
        renderMode,
      }),
      top: box.y,
      left: box.x,
    });
  }

  return sharp(templateBuffer).composite(composites).png().toBuffer();
}
