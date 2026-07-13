import sharp from "sharp";
import QRCode from "qrcode";
import {
  TICKET_CODE_FONT_FAMILY,
  buildEmbeddedTicketCodeFontFace,
} from "./ticket-code-font.ts";
import type { OverlayBox, TicketLayoutConfig } from "./ticket-layouts/types.ts";

export const TICKET_QR_PUBLIC_BASE_URL = "https://www.farecoh.org";

export type CodeTextRenderMode = "digital" | "physical";

export interface CodeTextStyle {
  fill: string;
  fontWeight: number;
  fontFamily: string;
  letterSpacing?: string;
}

export const DIGITAL_CODE_TEXT_STYLE: CodeTextStyle = {
  fill: "#000000",
  fontWeight: 700,
  fontFamily: TICKET_CODE_FONT_FAMILY,
};

export const PHYSICAL_CODE_TEXT_STYLE: CodeTextStyle = {
  fill: "#EDE8FA",
  fontWeight: 700,
  fontFamily: "'Montserrat', 'Helvetica', 'Arial', sans-serif",
  letterSpacing: "1.5px",
};

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

function scaleBox(box: OverlayBox, scaleX: number, scaleY: number): OverlayBox {
  return {
    x: Math.round(box.x * scaleX),
    y: Math.round(box.y * scaleY),
    width: Math.max(1, Math.round(box.width * scaleX)),
    height: Math.max(1, Math.round(box.height * scaleY)),
    ...(box.id ? { id: box.id } : {}),
    ...(typeof box.fontSize === "number" ? { fontSize: box.fontSize } : {}),
  };
}

/** Scale stored calibration to the rendered PNG dimensions (same helper for compose + verify). */
export async function resolveLayoutForPng(
  layout: TicketLayoutConfig,
  pngBuffer: Buffer,
): Promise<TicketLayoutConfig> {
  const metadata = await sharp(pngBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudieron leer las dimensiones del PNG.");
  }
  return scaleLayoutToTemplate(layout, metadata.width, metadata.height);
}

/** Scale stored calibration coordinates to the actual PNG template dimensions. */
export function scaleLayoutToTemplate(
  layout: TicketLayoutConfig,
  templateWidth: number,
  templateHeight: number,
): TicketLayoutConfig {
  if (layout.templateWidth <= 0 || layout.templateHeight <= 0) {
    return { ...layout, templateWidth, templateHeight };
  }

  const scaleX = templateWidth / layout.templateWidth;
  const scaleY = templateHeight / layout.templateHeight;

  if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) {
    return { ...layout, templateWidth, templateHeight };
  }

  const fontScale = Math.min(scaleX, scaleY);

  return {
    templateWidth,
    templateHeight,
    codeFontSize: Math.max(8, Math.round(layout.codeFontSize * fontScale)),
    codeBoxes: layout.codeBoxes.map((box) => scaleBox(box, scaleX, scaleY)),
    qrBoxes: layout.qrBoxes.map((box) => scaleBox(box, scaleX, scaleY)),
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

function resolveCodeTextStyle(
  renderMode: CodeTextRenderMode,
  overrides?: { fill?: string; fontWeight?: number },
): CodeTextStyle {
  const base = renderMode === "digital" ? DIGITAL_CODE_TEXT_STYLE : PHYSICAL_CODE_TEXT_STYLE;
  return {
    ...base,
    fill: overrides?.fill ?? base.fill,
    fontWeight: overrides?.fontWeight ?? base.fontWeight,
  };
}

/** Same baseline positioning for physical and digital — only color/font differ. */
export function buildCodeTextSvg(
  ticketCode: string,
  box: OverlayBox,
  fontSize: number,
  options?: { fill?: string; fontWeight?: number; renderMode?: CodeTextRenderMode },
): Buffer {
  const renderMode = options?.renderMode ?? "physical";
  const style = resolveCodeTextStyle(renderMode, options);
  const safeCode = escapeXml(ticketCode);
  const centerX = box.width / 2;
  const centerY = box.height / 2 + fontSize * 0.35;
  const letterSpacingAttr = style.letterSpacing ? ` letter-spacing="${style.letterSpacing}"` : "";

  if (renderMode === "digital") {
    const fontFace = buildEmbeddedTicketCodeFontFace();
    const svg = `<svg width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" xmlns="http://www.w3.org/2000/svg">
  <defs><style type="text/css"><![CDATA[${fontFace}]]></style></defs>
  <text
    x="${centerX}"
    y="${centerY}"
    font-family="${TICKET_CODE_FONT_FAMILY}"
    font-size="${fontSize}"
    font-weight="${style.fontWeight}"
    fill="${style.fill}"
    text-anchor="middle"${letterSpacingAttr}
  >${safeCode}</text>
</svg>`;
    return Buffer.from(svg);
  }

  const svg = `<svg width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${centerX}"
    y="${centerY}"
    font-family="${style.fontFamily}"
    font-size="${fontSize}"
    font-weight="${style.fontWeight}"
    fill="${style.fill}"
    text-anchor="middle"${letterSpacingAttr}
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
  const metadata = await sharp(templateBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudieron leer las dimensiones de la plantilla.");
  }

  const scaledLayout = scaleLayoutToTemplate(layout, metadata.width, metadata.height);
  const qrUrl = buildTicketQrUrl(qrToken);
  const composites: sharp.OverlayOptions[] = [];
  const renderMode = options?.codeRenderMode ?? "physical";

  if (scaledLayout.qrBoxes.length > 0) {
    const maxQrSize = Math.max(
      ...scaledLayout.qrBoxes.map((box) => Math.max(box.width, box.height)),
    );
    const qrBase = await buildQrPng(qrUrl, maxQrSize);

    for (const box of scaledLayout.qrBoxes) {
      const qrBuffer =
        box.width === maxQrSize && box.height === maxQrSize
          ? qrBase
          : await sharp(qrBase).resize(box.width, box.height, { fit: "fill" }).png().toBuffer();

      composites.push({ input: qrBuffer, top: box.y, left: box.x });
    }
  }

  for (const box of scaledLayout.codeBoxes) {
    composites.push({
      input: buildCodeTextSvg(ticketCode, box, scaledLayout.codeFontSize, {
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
