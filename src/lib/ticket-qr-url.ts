import { getSiteUrl } from "@/lib/seo";

export function buildTicketQrUrl(qrToken: string): string {
  return `${getSiteUrl()}/t/${qrToken}`;
}
