import { createClient } from "@supabase/supabase-js";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import { buildCanvaTicketUrl, PINK_FLOYD_CANVA_EVENT_SLUG } from "../src/lib/canva-export.ts";
import { formatTicketCode, normalizeTicketCode, parseTicketSequence } from "../src/services/ticket-code.ts";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "ticket-pink-floyd.png");
const EXPORT_DIR = path.join(process.cwd(), "exports", "print");
const FULL_OUTPUT = path.join(EXPORT_DIR, "farecoh-pink-floyd-tickets.pdf");
const TEST_OUTPUT = path.join(EXPORT_DIR, "test-5-tickets.pdf");

/** Horizontal center of the ticket code box (pixels, top-left origin). */
const CODE_X = 1180;
/** Vertical center of the ticket code box (pixels, top-left origin). */
const CODE_Y = 520;
const CODE_FONT_SIZE = 42;

/** Top-left X of the QR frame (pixels, top-left origin). */
const QR_X = 180;
/** Top-left Y of the QR frame (pixels, top-left origin). */
const QR_Y = 900;
const QR_SIZE = 320;
const QR_PADDING = 24;
const QR_RENDER_SCALE = 3;

const CODE_COLOR = rgb(0.93, 0.91, 0.98);

interface TicketRow {
  ticket_code: string;
  qr_token: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseCliArgs(argv: string[]) {
  let from = formatTicketCode(1);
  let to = formatTicketCode(500);
  let test = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--test") {
      test = true;
      continue;
    }
    if (arg === "--from" && argv[i + 1]) {
      from = normalizeTicketCode(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--to" && argv[i + 1]) {
      to = normalizeTicketCode(argv[i + 1]);
      i += 1;
    }
  }

  if (test) {
    from = formatTicketCode(1);
    to = formatTicketCode(5);
  }

  return { from, to, test };
}

function filterTicketsByRange(tickets: TicketRow[], fromCode: string, toCode: string): TicketRow[] {
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

async function ensureTemplateExists(): Promise<void> {
  try {
    await access(TEMPLATE_PATH);
  } catch {
    throw new Error(
      `Ticket template not found at ${TEMPLATE_PATH}. Export the Canva PNG to public/templates/ticket-pink-floyd.png (see public/templates/README.md).`,
    );
  }
}

async function loadTickets(fromCode: string, toCode: string): Promise<TicketRow[]> {
  const supabase = createClient(requireEnv("PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", PINK_FLOYD_CANVA_EVENT_SLUG)
    .single();

  if (eventError || !event) {
    throw new Error(`Pink Floyd event not found: ${eventError?.message ?? "missing row"}`);
  }

  const { data: tickets = [], error: ticketsError } = await supabase
    .from("tickets")
    .select("ticket_code, qr_token")
    .eq("event_id", event.id)
    .order("ticket_code", { ascending: true });

  if (ticketsError) {
    throw new Error(`Failed to load tickets: ${ticketsError.message}`);
  }

  const filtered = filterTicketsByRange(tickets, fromCode, toCode);
  if (!filtered.length) {
    throw new Error(`No tickets found in range ${fromCode} to ${toCode}.`);
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

async function buildTicketPdf(tickets: TicketRow[]): Promise<Uint8Array> {
  const templateBytes = await sharp(TEMPLATE_PATH).png().toBuffer();
  const metadata = await sharp(templateBytes).metadata();
  const pageWidth = metadata.width;
  const pageHeight = metadata.height;

  if (!pageWidth || !pageHeight) {
    throw new Error("Could not read ticket template dimensions.");
  }

  const pdfDoc = await PDFDocument.create();
  const background = await pdfDoc.embedPng(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const qrCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedPng>>>();

  for (const ticket of tickets) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(background, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    drawTicketCode(page, font, pageHeight, ticket.ticket_code);

    const qrUrl = buildCanvaTicketUrl(ticket.qr_token);
    let embeddedQr = qrCache.get(qrUrl);
    if (!embeddedQr) {
      const qrPng = await buildQrPng(qrUrl);
      embeddedQr = await pdfDoc.embedPng(qrPng);
      qrCache.set(qrUrl, embeddedQr);
    }

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

async function main() {
  const { from, to, test } = parseCliArgs(process.argv);
  await ensureTemplateExists();

  const tickets = await loadTickets(from, to);
  const outputPath = test ? TEST_OUTPUT : FULL_OUTPUT;

  await mkdir(EXPORT_DIR, { recursive: true });
  const pdfBytes = await buildTicketPdf(tickets);
  await writeFile(outputPath, pdfBytes);

  console.log(`Generated ${tickets.length} ticket page(s): ${outputPath}`);
  console.log(`Range: ${tickets[0]?.ticket_code} – ${tickets[tickets.length - 1]?.ticket_code}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
