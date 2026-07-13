import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import { buildCanvaTicketUrl, PINK_FLOYD_CANVA_EVENT_SLUG } from "./canva-export.ts";
import {
  DEFAULT_TEST_PRINT_FROM,
  DEFAULT_TEST_PRINT_TO,
  FULL_PRINT_FROM,
  FULL_PRINT_TO,
  isDebugPrintLayout,
  MAX_PRINT_TICKETS_PER_REQUEST,
  QR_RENDER_SCALE,
} from "./ticket-print-config.ts";
import { readTicketLayoutConfig, loadPhysicalTemplateBytes } from "./ticket-layout-config.ts";
import type { TicketLayoutConfig } from "./ticket-layouts/types.ts";
import { QR_HEIGHT_POINTS, QR_WIDTH_POINTS } from "./ticket-print-measurements.ts";
import {
  ensureTicketTemplateExists,
  loadTicketTemplateBytes,
  resolveTicketTemplateUrl,
  TICKET_TEMPLATE_PATH,
} from "./ticket-print-template.ts";
import {
  codeTextBaselineInBox,
  drawPhysicalLayoutDebugBoxes,
  overlayBoxToPdfRect,
} from "./ticket-print-layout.ts";
import { isTicketCode, normalizeTicketCode, parseTicketSequence } from "../services/ticket-code.ts";

export {
  DEFAULT_TEST_PRINT_FROM,
  DEFAULT_TEST_PRINT_TO,
  FULL_PRINT_FROM,
  FULL_PRINT_TO,
  isDebugPrintLayout,
  MAX_PRINT_TICKETS_PER_REQUEST,
  QR_HEIGHT_POINTS,
  QR_RENDER_SCALE,
  QR_WIDTH_POINTS,
  resolveTicketTemplateUrl,
  TICKET_TEMPLATE_PATH,
};

export interface TicketPrintRow {
  ticket_code: string;
  qr_token: string;
}

export function buildPrintPdfFilename(fromCode: string, toCode: string): string {
  return `farecoh-pink-floyd-${fromCode}-${toCode}.pdf`;
}

export function parsePrintRange(fromRaw: string, toRaw: string): { from: string; to: string } {
  const from = normalizeTicketCode(fromRaw);
  const to = normalizeTicketCode(toRaw);

  if (!isTicketCode(from) || !isTicketCode(to)) {
    throw new Error("Use códigos válidos, por ejemplo PF-000001.");
  }

  const fromSeq = parseTicketSequence(from);
  const toSeq = parseTicketSequence(to);
  if (fromSeq === null || toSeq === null || fromSeq > toSeq) {
    throw new Error("El rango de boletos es inválido.");
  }

  const count = toSeq - fromSeq + 1;
  if (count > MAX_PRINT_TICKETS_PER_REQUEST) {
    throw new Error(`Máximo ${MAX_PRINT_TICKETS_PER_REQUEST} boletos por PDF.`);
  }

  return { from, to };
}

export function filterTicketsByRange(tickets: TicketPrintRow[], fromCode: string, toCode: string): TicketPrintRow[] {
  const fromSeq = parseTicketSequence(fromCode);
  const toSeq = parseTicketSequence(toCode);
  if (fromSeq === null || toSeq === null || fromSeq > toSeq) {
    throw new Error(`Invalid ticket range: ${fromCode} to ${toCode}`);
  }

  return tickets
    .filter((ticket) => {
      const seq = parseTicketSequence(ticket.ticket_code);
      return seq !== null && seq >= fromSeq && seq <= toSeq;
    })
    .sort((a, b) => a.ticket_code.localeCompare(b.ticket_code));
}

const CODE_COLOR = rgb(0.93, 0.91, 0.98);

export async function loadPinkFloydPrintTickets(
  supabase: SupabaseClient,
  fromCode: string,
  toCode: string,
): Promise<TicketPrintRow[]> {
  const { from, to } = parsePrintRange(fromCode, toCode);

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", PINK_FLOYD_CANVA_EVENT_SLUG)
    .single();

  if (eventError || !event) {
    throw new Error(`Evento Pink Floyd no encontrado: ${eventError?.message ?? "sin fila"}`);
  }

  const { data: tickets = [], error: ticketsError } = await supabase
    .from("tickets")
    .select("ticket_code, qr_token")
    .eq("event_id", event.id)
    .order("ticket_code", { ascending: true });

  if (ticketsError) {
    throw new Error(`Error al cargar boletos: ${ticketsError.message}`);
  }

  const filtered = filterTicketsByRange(tickets, from, to);
  if (!filtered.length) {
    throw new Error(`No hay boletos en el rango ${from} – ${to}.`);
  }

  return filtered;
}

async function buildQrPng(qrUrl: string, size: number): Promise<Buffer> {
  const renderSize = Math.ceil(size * QR_RENDER_SCALE);
  return QRCode.toBuffer(qrUrl, {
    type: "png",
    width: renderSize,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1033", light: "#ffffff" },
  });
}

function drawTicketCodeInBox(
  page: PDFPage,
  font: PDFFont,
  pageHeight: number,
  box: TicketLayoutConfig["codeBoxes"][number],
  fontSize: number,
  ticketCode: string,
) {
  const textWidth = font.widthOfTextAtSize(ticketCode, fontSize);
  const rect = overlayBoxToPdfRect(pageHeight, box);

  page.drawText(ticketCode, {
    x: rect.x + box.width / 2 - textWidth / 2,
    y: codeTextBaselineInBox(pageHeight, box, fontSize),
    size: fontSize,
    font,
    color: CODE_COLOR,
  });
}

async function prepareTemplate() {
  await ensureTicketTemplateExists();

  const templateBytes = await loadTicketTemplateBytes();
  const normalizedTemplate = await sharp(templateBytes).png().toBuffer();
  const metadata = await sharp(normalizedTemplate).metadata();
  const pageWidth = metadata.width;
  const pageHeight = metadata.height;

  if (!pageWidth || !pageHeight) {
    throw new Error("No se pudieron leer las dimensiones de la plantilla.");
  }

  return {
    normalizedTemplate,
    template: { width: pageWidth, height: pageHeight },
  };
}

export async function buildTicketCalibrationPdf(layoutInput?: TicketLayoutConfig): Promise<Uint8Array> {
  const { config } = layoutInput
    ? { config: layoutInput }
    : await readTicketLayoutConfig("physical");
  const layout = layoutInput ?? config;

  const templateBytes = await loadPhysicalTemplateBytes();
  const normalizedTemplate = await sharp(templateBytes).png().toBuffer();
  const metadata = await sharp(normalizedTemplate).metadata();
  const pageWidth = metadata.width;
  const pageHeight = metadata.height;

  if (!pageWidth || !pageHeight) {
    throw new Error("No se pudieron leer las dimensiones de la plantilla.");
  }

  const pdfDoc = await PDFDocument.create();
  const background = await pdfDoc.embedPng(normalizedTemplate);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  page.drawImage(background, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  drawPhysicalLayoutDebugBoxes(page, layout, pageHeight);

  return pdfDoc.save();
}

export async function buildTicketPrintPdf(tickets: TicketPrintRow[]): Promise<Uint8Array> {
  const { config: layout } = await readTicketLayoutConfig("physical");

  if (isDebugPrintLayout()) {
    return buildTicketCalibrationPdf(layout);
  }

  const { normalizedTemplate, template } = await prepareTemplate();
  const pdfDoc = await PDFDocument.create();
  const background = await pdfDoc.embedPng(normalizedTemplate);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const maxQrSize = Math.max(...layout.qrBoxes.map((box) => Math.max(box.width, box.height)));

  for (const ticket of tickets) {
    const page = pdfDoc.addPage([template.width, template.height]);
    page.drawImage(background, { x: 0, y: 0, width: template.width, height: template.height });

    const qrUrl = buildCanvaTicketUrl(ticket.qr_token);
    const qrPng = await buildQrPng(qrUrl, maxQrSize);
    const embeddedQr = await pdfDoc.embedPng(qrPng);

    for (const box of layout.qrBoxes) {
      const rect = overlayBoxToPdfRect(template.height, box);
      page.drawImage(embeddedQr, rect);
    }

    for (const box of layout.codeBoxes) {
      drawTicketCodeInBox(page, font, template.height, box, layout.codeFontSize, ticket.ticket_code);
    }
  }

  return pdfDoc.save();
}
