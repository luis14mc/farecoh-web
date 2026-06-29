import { createHash } from "node:crypto";
import { formatTicketCode } from "@/services/ticket-code";

export const PRINT_TICKET_COUNT = 500;
export const QR_TOKEN_NAMESPACE = "farecoh:pink-floyd";

export function createTicketQrToken(code: string): string {
  return createHash("sha256").update(`${QR_TOKEN_NAMESPACE}:${code}`).digest("hex");
}

export function createTicketQrUrl(siteUrl: string, qrToken: string): string {
  return `${siteUrl.replace(/\/$/, "")}/t/${qrToken}`;
}

export function getPrintableTicketTokenMap(siteUrl = "https://farecoh.org") {
  return Array.from({ length: PRINT_TICKET_COUNT }, (_, index) => {
    const code = formatTicketCode(index + 1);
    const qrToken = createTicketQrToken(code);
    return {
      code,
      qr_token: qrToken,
      qr_url: createTicketQrUrl(siteUrl, qrToken),
    };
  });
}