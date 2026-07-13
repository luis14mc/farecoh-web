import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TICKET_CODE_FONT_FAMILY = "TicketCodeDejaVu";

const FONT_FILENAME = "DejaVuSans-Bold.ttf";

let cachedFontBase64: string | null = null;

function resolveFontPath(): string {
  const candidates = [
    path.join(process.cwd(), "public/fonts", FONT_FILENAME),
    fileURLToPath(new URL("../../public/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(`No se encontró la fuente embebida del número de boleto (${FONT_FILENAME}).`);
}

export function getTicketCodeFontBase64(): string {
  if (!cachedFontBase64) {
    cachedFontBase64 = readFileSync(resolveFontPath()).toString("base64");
  }
  return cachedFontBase64;
}

export function buildEmbeddedTicketCodeFontFace(): string {
  const base64 = getTicketCodeFontBase64();
  return `@font-face{font-family:'${TICKET_CODE_FONT_FAMILY}';src:url(data:font/truetype;base64,${base64}) format('truetype');font-weight:700;font-style:normal;}`;
}
