import opentype from "opentype.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cachedFont: opentype.Font | null = null;

async function loadTicketFont(): Promise<opentype.Font> {
  if (cachedFont) return cachedFont;

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, "../assets/fonts/Inter-Bold.ttf"),
    path.join(process.cwd(), "src/assets/fonts/Inter-Bold.ttf"),
  ];

  let buffer: Buffer | null = null;
  for (const fontPath of candidates) {
    try {
      buffer = await fs.readFile(fontPath);
      break;
    } catch {
      // try next path
    }
  }

  if (!buffer) {
    throw new Error("Inter-Bold.ttf not found in src/assets/fonts.");
  }

  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );

  cachedFont = opentype.parse(arrayBuffer);
  return cachedFont;
}

function buildCenteredPathData(
  font: opentype.Font,
  ticketCode: string,
  width: number,
  height: number,
  fontSize: number,
): string {
  let advanceWidth = 0;
  for (const char of ticketCode) {
    advanceWidth += font.getAdvanceWidth(char, fontSize);
  }

  let x = Math.max(0, (width - advanceWidth) / 2);
  const firstPath = font.charToGlyph(ticketCode[0] ?? "0").getPath(x, 0, fontSize);
  const metrics = firstPath.getBoundingBox();
  let minY = metrics.y1;
  let maxY = metrics.y2;

  for (const char of ticketCode.slice(1)) {
    const glyphPath = font.charToGlyph(char).getPath(x, 0, fontSize);
    const box = glyphPath.getBoundingBox();
    minY = Math.min(minY, box.y1);
    maxY = Math.max(maxY, box.y2);
  }

  const textHeight = maxY - minY;
  const baselineY = (height - textHeight) / 2 - minY;

  const pathParts: string[] = [];
  x = Math.max(0, (width - advanceWidth) / 2);

  for (const char of ticketCode) {
    const glyphPath = font.charToGlyph(char).getPath(x, baselineY, fontSize);
    pathParts.push(glyphPath.toPathData(2));
    x += font.getAdvanceWidth(char, fontSize);
  }

  return pathParts.join(" ");
}

export async function renderTicketCodeAsPath(params: {
  ticketCode: string;
  width: number;
  height: number;
  fontSize: number;
  fill?: string;
}): Promise<Buffer> {
  const font = await loadTicketFont();

  const width = Math.max(1, Math.round(params.width));
  const height = Math.max(1, Math.round(params.height));
  const fontSize = Math.max(12, Math.round(params.fontSize));
  const fill = params.fill ?? "#000000";

  const pathData = buildCenteredPathData(font, params.ticketCode, width, height, fontSize);

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
    >
      <path d="${pathData}" fill="${fill}" />
    </svg>
  `;

  return Buffer.from(svg);
}

/** Reset cached font — test helper only. */
export function resetTicketCodeFontCacheForTests(): void {
  cachedFont = null;
}
