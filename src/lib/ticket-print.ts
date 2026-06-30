import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import { buildCanvaTicketUrl, getCanvaSiteUrl, PINK_FLOYD_CANVA_EVENT_SLUG } from "@/lib/canva-export";
import {
  CODE_FONT_SIZE,
  CODE_X,
  CODE_Y,
  MAX_PRINT_TICKETS_PER_REQUEST,
  QR_PADDING,
  QR_RENDER_SCALE,
  QR_SIZE,
  QR_X,
  QR_Y,
  TICKET_TEMPLATE_FILENAME,
  TICKET_TEMPLATE_PUBLIC_PATH,
  TICKET_TEMPLATE_RELATIVE_PATH,
} from "@/lib/ticket-print-config";
import { isTicketCode, normalizeTicketCode, parseTicketSequence } from "@/services/ticket-code";

export {
  CODE_FONT_SIZE,
  CODE_X,
  CODE_Y,
  DEFAULT_TEST_PRINT_FROM,
  DEFAULT_TEST_PRINT_TO,
  FULL_PRINT_FROM,
  FULL_PRINT_TO,
  MAX_PRINT_TICKETS_PER_REQUEST,
  QR_PADDING,
  QR_RENDER_SCALE,
  QR_SIZE,
  QR_X,
  QR_Y,
} from "@/lib/ticket-print-config";

export const TICKET_TEMPLATE_PATH = path.join(process.cwd(), TICKET_TEMPLATE_RELATIVE_PATH);

export function resolveTicketTemplateUrl(): string {
  const vercelUrl = typeof process !== "undefined" ? process.env.VERCEL_URL?.replace(/\/$/, "") : undefined;
  if (vercelUrl) {
    return `https://${vercelUrl}${TICKET_TEMPLATE_PUBLIC_PATH}`;
  }
  return `${getCanvaSiteUrl()}${TICKET_TEMPLATE_PUBLIC_PATH}`;
}

async function readTemplateFromFilesystem(): Promise<Buffer | null> {
  const candidates = [
    TICKET_TEMPLATE_PATH,
    path.join(process.cwd(), TICKET_TEMPLATE_PUBLIC_PATH.replace(/^\//, "")),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return readFile(candidate);
    } catch {
      // try next path
    }
  }

  return null;
}

export async function loadTicketTemplateBytes(): Promise<Buffer> {
  const fromDisk = await readTemplateFromFilesystem();
  if (fromDisk) {
    return fromDisk;
  }

  const templateUrl = resolveTicketTemplateUrl();
  const response = await fetch(templateUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Plantilla no encontrada. Verifique ${TICKET_TEMPLATE_PUBLIC_PATH} (${response.status} desde ${templateUrl}).`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function ensureTicketTemplateExists(): Promise<void> {
  const fromDisk = await readTemplateFromFilesystem();
  if (fromDisk) {
    return;
  }

  const templateUrl = resolveTicketTemplateUrl();
  const response = await fetch(templateUrl, { method: "HEAD", cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Plantilla no encontrada. Coloque el PNG de Canva en public/templates/${TICKET_TEMPLATE_FILENAME}.`,
    );
  }
}

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

async function buildQrPng(qrUrl: string): Promise<Buffer> {
  const renderSize = QR_SIZE * QR_RENDER_SCALE;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    type: "png",
    width: renderSize,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1033", light: "#ffffff" },
  });

  return sharp(qrBuffer)
    .extend({
      top: QR_PADDING * QR_RENDER_SCALE,
      bottom: QR_PADDING * QR_RENDER_SCALE,
      left: QR_PADDING * QR_RENDER_SCALE,
      right: QR_PADDING * QR_RENDER_SCALE,
      background: "#ffffff",
    })
    .png()
    .toBuffer();
}

function drawTicketCode(page: PDFPage, font: PDFFont, pageHeight: number, ticketCode: string) {
  const textWidth = font.widthOfTextAtSize(ticketCode, CODE_FONT_SIZE);
  page.drawText(ticketCode, {
    x: CODE_X - textWidth / 2,
    y: pageHeight - CODE_Y - CODE_FONT_SIZE / 3,
    size: CODE_FONT_SIZE,
    font,
    color: CODE_COLOR,
  });
}

export async function buildTicketPrintPdf(tickets: TicketPrintRow[]): Promise<Uint8Array> {
  await ensureTicketTemplateExists();

  const templateBytes = await loadTicketTemplateBytes();
  const normalizedTemplate = await sharp(templateBytes).png().toBuffer();
  const metadata = await sharp(normalizedTemplate).metadata();
  const pageWidth = metadata.width;
  const pageHeight = metadata.height;

  if (!pageWidth || !pageHeight) {
    throw new Error("No se pudieron leer las dimensiones de la plantilla.");
  }

  const pdfDoc = await PDFDocument.create();
  const background = await pdfDoc.embedPng(normalizedTemplate);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const ticket of tickets) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(background, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    drawTicketCode(page, font, pageHeight, ticket.ticket_code);

    const qrUrl = buildCanvaTicketUrl(ticket.qr_token);
    const qrPng = await buildQrPng(qrUrl);
    const embeddedQr = await pdfDoc.embedPng(qrPng);
    const qrDrawSize = QR_SIZE + QR_PADDING * 2;

    page.drawImage(embeddedQr, {
      x: QR_X,
      y: pageHeight - QR_Y - qrDrawSize,
      width: qrDrawSize,
      height: qrDrawSize,
    });
  }

  return pdfDoc.save();
}
