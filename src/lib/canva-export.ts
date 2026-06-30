import type { SupabaseClient } from "@supabase/supabase-js";

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
  // Dynamic import avoided — use inline to keep canva-export usable from node script without circular deps
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

export async function loadPinkFloydCanvaTicketRows(supabase: SupabaseClient): Promise<CanvaTicketExportRow[]> {
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
    .select("ticket_code, qr_token, status")
    .eq("event_id", event.id)
    .order("ticket_code", { ascending: true });

  if (ticketsError) {
    throw new Error(`Failed to load tickets: ${ticketsError.message}`);
  }

  if (!tickets.length) {
    throw new Error("No tickets found for pink-floyd event.");
  }

  return buildCanvaTicketRows(tickets);
}
