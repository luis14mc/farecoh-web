const DEFAULT_CANVA_SITE_URL = "https://www.farecoh.org";

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
