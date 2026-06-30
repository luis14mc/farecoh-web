import { parseTicketSequence } from "../services/ticket-code.ts";

const DEFAULT_CANVA_SITE_URL = "https://www.farecoh.org";

export function getCanvaSiteUrl(): string {
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  const url = env?.PUBLIC_SITE_URL ?? DEFAULT_CANVA_SITE_URL;
  return url.replace(/\/$/, "");
}

export function buildCanvaTicketUrl(qrToken: string): string {
  return `${getCanvaSiteUrl()}/t/${qrToken}`;
}

export function buildCanvaQrImageUrl(qrToken: string): string {
  return `${getCanvaSiteUrl()}/api/qr/${qrToken}`;
}

export function formatCanvaExportFilename(eventSlug: string, startCode: string, endCode: string): string {
  const startSeq = parseTicketSequence(startCode);
  const endSeq = parseTicketSequence(endCode);
  if (startSeq === null || endSeq === null) {
    throw new Error("Invalid ticket code range for export filename.");
  }

  const startLabel = String(startSeq).padStart(3, "0");
  const endLabel = String(endSeq).padStart(3, "0");
  return `farecoh-${eventSlug}-batch-${startLabel}-${endLabel}.csv`;
}

export interface CanvaExportTicketRow {
  ticket_code: string;
  qr_token: string;
  status: string;
  event_name: string;
  batch_name: string | null;
}

export function buildCanvaExportRows(tickets: CanvaExportTicketRow[]) {
  return tickets.map((ticket) => [
    ticket.ticket_code,
    buildCanvaTicketUrl(ticket.qr_token),
    buildCanvaQrImageUrl(ticket.qr_token),
    ticket.status,
    ticket.event_name,
    ticket.batch_name ?? "",
  ]);
}

export const CANVA_EXPORT_HEADERS = [
  "ticket_code",
  "qr_url",
  "qr_image",
  "status",
  "event",
  "batch",
] as const;

export function filterTicketsInRange<
  T extends { ticket_code: string; batch_id?: string | null },
>(tickets: T[], startCode: string, endCode: string, batchId?: string | null): T[] {
  const startSeq = parseTicketSequence(startCode);
  const endSeq = parseTicketSequence(endCode);
  if (startSeq === null || endSeq === null || startSeq > endSeq) {
    return [];
  }

  return tickets
    .filter((ticket) => {
      const seq = parseTicketSequence(ticket.ticket_code);
      if (seq === null || seq < startSeq || seq > endSeq) return false;
      if (batchId && ticket.batch_id !== batchId) return false;
      return true;
    })
    .sort((a, b) => a.ticket_code.localeCompare(b.ticket_code));
}
