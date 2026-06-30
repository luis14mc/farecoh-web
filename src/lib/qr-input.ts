import { isTicketCode, normalizeTicketCode } from "../services/ticket-code.ts";

export type CheckinInputKind = "qr_token" | "ticket_code";

export interface ParsedCheckinInput {
  kind: CheckinInputKind;
  value: string;
}

const QR_URL_PATTERN = /^https?:\/\/(?:www\.)?farecoh\.org\/t\/([0-9a-f-]+)\/?$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Normalize check-in input from QR URL, UUID token, or PF ticket code. */
export function parseCheckinInput(raw: string): ParsedCheckinInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(QR_URL_PATTERN);
  if (urlMatch?.[1]) {
    return { kind: "qr_token", value: urlMatch[1].toLowerCase() };
  }

  if (UUID_PATTERN.test(trimmed)) {
    return { kind: "qr_token", value: trimmed.toLowerCase() };
  }

  const ticketCode = normalizeTicketCode(trimmed);
  if (isTicketCode(ticketCode)) {
    return { kind: "ticket_code", value: ticketCode };
  }

  return null;
}
