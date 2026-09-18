import { queryOne, queryRows } from "./db.ts";

const DEFAULT_CANVA_SITE_URL = "https://www.farecoh.org";
export const PINK_FLOYD_CANVA_EVENT_SLUG = "pink-floyd";
export const CANVA_TICKETS_FILENAME = "canva-tickets-pink-floyd.csv";
export const CANVA_EXPORT_HEADERS = ["ticket_code", "qr_url", "qr_image", "status"] as const;

export interface CanvaTicketExportRow {
  ticket_code: string;
  qr_url: string;
  qr_image: string;
  status: string;
}

export function getCanvaSiteUrl(): string {
  const fromProcess = typeof process !== "undefined" ? process.env.PUBLIC_SITE_URL : undefined;
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  const url = fromProcess ?? env?.PUBLIC_SITE_URL ?? DEFAULT_CANVA_SITE_URL;
  return url.replace(/\/$/, "");
}

export function buildCanvaTicketUrl(qrToken: string): string {
  return `${getCanvaSiteUrl()}/t/${qrToken}`;
}

export function buildCanvaQrImageUrl(qrToken: string): string {
  return `${getCanvaSiteUrl()}/api/qr/${qrToken}`;
}

export function buildCanvaTicketRows(
  tickets: { ticket_code: string; qr_token: string; status: string }[],
): CanvaTicketExportRow[] {
  return tickets.map((ticket) => ({
    ticket_code: ticket.ticket_code,
    qr_url: buildCanvaTicketUrl(ticket.qr_token),
    qr_image: buildCanvaQrImageUrl(ticket.qr_token),
    status: ticket.status,
  }));
}

export function buildCanvaTicketsCsv(rows: CanvaTicketExportRow[]): string {
  const csvEscape = (value: string) => {
    if ([",", "\n", '"'].some((char) => value.includes(char))) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  };

  const lines = [
    CANVA_EXPORT_HEADERS.join(","),
    ...rows.map((row) =>
      [row.ticket_code, row.qr_url, row.qr_image, row.status].map(csvEscape).join(","),
    ),
  ];

  return `\uFEFF${lines.join("\n")}\n`;
}

export async function loadPinkFloydCanvaTicketRows(_client?: any): Promise<CanvaTicketExportRow[]> {
  const event = await queryOne<{ id: string }>(
    "SELECT id FROM events WHERE slug = $1 LIMIT 1;",
    [PINK_FLOYD_CANVA_EVENT_SLUG]
  );

  if (!event) {
    throw new Error(`Pink Floyd event not found`);
  }

  const tickets = await queryRows<{ ticket_code: string; qr_token: string; status: string }>(
    "SELECT ticket_code, qr_token, status FROM tickets WHERE event_id = $1 ORDER BY ticket_code ASC;",
    [event.id]
  );

  if (!tickets.length) {
    throw new Error("No tickets found for pink-floyd event.");
  }

  return buildCanvaTicketRows(tickets);
}
