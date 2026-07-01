import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import { buildCanvaTicketUrl, PINK_FLOYD_CANVA_EVENT_SLUG } from "./canva-export.ts";
import {
  CODE_FONT_SIZE,
  DEFAULT_TEST_PRINT_FROM,
  DEFAULT_TEST_PRINT_TO,
  FULL_PRINT_FROM,
  FULL_PRINT_TO,
  isDebugPrintLayout,
  MAX_PRINT_TICKETS_PER_REQUEST,
  QR_RENDER_SCALE,
} from "./ticket-print-config.ts";
import { readTicketPrintLayout, sanitizeTicketPrintLayout } from "./ticket-print-layout-config.ts";
import { QR_HEIGHT_POINTS, QR_WIDTH_POINTS } from "./ticket-print-measurements.ts";
import {
  ensureTicketTemplateExists,
  loadTicketTemplateBytes,
  resolveTicketTemplateUrl,
  TICKET_TEMPLATE_PATH,
} from "./ticket-print-template.ts";
import {
  codeTextBaselineY,
  drawPrintLayoutDebugBoxes,
  layoutCenterToPagePoint,
  qrImageRect,
} from "./ticket-print-layout.ts";
import { isTicketCode, normalizeTicketCode, parseTicketSequence } from "../services/ticket-code.ts";
import type { TicketPrintLayout, TicketTemplateDimensions } from "../types/ticket-print-layout.ts";

export {
  CODE_FONT_SIZE,
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
    throw new Error("Use cÃƒÆ’Ã‚Â³digos vÃƒÆ’Ã‚Â¡lidos, por ejemplo PF-000001.");
  }

  const fromSeq = parseTicketSequence(from);
  const toSeq = parseTicketSequence(to);
  if (fromSeq === null || toSeq === null || fromSeq > toSeq) {
    throw new Error("El rango de boletos es invÃƒÆ’Ã‚Â¡lido.");
  }

  const count = toSeq - fromSeq + 1;
  if (count > MAX_PRINT_TICKETS_PER_REQUEST) {
    throw new Error(`MÃƒÆ’Ã‚Â¡ximo ${MAX_PRINT_TICKETS_PER_REQUEST} boletos por PDF.`);
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
    throw new Error(`No hay boletos en el rango ${from} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ ${to}.`);
  }

  return filtered;
}

async function buildQrPng(qrUrl: string): Promise<Buffer> {
  const renderSize = Math.ceil(Math.max(QR_WIDTH_POINTS, QR_HEIGHT_POINTS) * QR_RENDER_SCALE);
  return QRCode.toBuffer(qrUrl, {
    type: "png",
    width: renderSize,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1033", light: "#ffffff" },
  });
}

function drawTicketCode(
  page: PDFPage,
  font: PDFFont,
  layout: TicketPrintLayout,
  template: TicketTemplateDimensions,
  ticketCode: string,
) {
  const center = layoutCenterToPagePoint(layout, template, "code");
  const textWidth = font.widthOfTextAtSize(ticketCode, CODE_FONT_SIZE);

  page.drawText(ticketCode, {
    x: center.x - textWidth / 2,
    y: codeTextBaselineY(layout, template),
    size: CODE_FONT_SIZE,
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

  console.log(`Template:\nwidth = ${pageWidth}\nheight = ${pageHeight}`);

  return {
    normalizedTemplate,
    template: { width: pageWidth, height: pageHeight },
  };
}

export async function buildTicketCalibrationPdf(layoutInput?: Partial<TicketPrintLayout>): Promise<Uint8Array> {
  const { normalizedTemplate, template } = await prepareTemplate();
  const layout = sanitizeTicketPrintLayout(layoutInput ?? (await readTicketPrintLayout()));
  const pdfDoc = await PDFDocument.create();
  const background = await pdfDoc.embedPng(normalizedTemplate);
  const page = pdfDoc.addPage([template.width, template.height]);

  page.drawImage(background, { x: 0, y: 0, width: template.width, height: template.height });
  drawPrintLayoutDebugBoxes(page, layout, template);

  return pdfDoc.save();
}

export async function buildTicketPrintPdf(tickets: TicketPrintRow[]): Promise<Uint8Array> {
  const layout = await readTicketPrintLayout();

  if (isDebugPrintLayout()) {
    return buildTicketCalibrationPdf(layout);
  }

  const { normalizedTemplate, template } = await prepareTemplate();
  const pdfDoc = await PDFDocument.create();
  const background = await pdfDoc.embedPng(normalizedTemplate);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const ticket of tickets) {
    const page = pdfDoc.addPage([template.width, template.height]);
    page.drawImage(background, { x: 0, y: 0, width: template.width, height: template.height });

    const qrUrl = buildCanvaTicketUrl(ticket.qr_token);
    const qrPng = await buildQrPng(qrUrl);
    const embeddedQr = await pdfDoc.embedPng(qrPng);
    page.drawImage(embeddedQr, qrImageRect(layout, template));

    drawTicketCode(page, font, layout, template, ticket.ticket_code);
  }

  return pdfDoc.save();
}