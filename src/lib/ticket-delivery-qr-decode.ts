import sharp from "sharp";
import jsQR from "jsqr";
import { resolveLayoutForPng } from "./ticket-image-compose.ts";
import { readTicketLayoutConfig } from "./ticket-layout-config.ts";
import type { TicketLayoutConfig } from "./ticket-layouts/types.ts";

/** Dev/CI only — never used to block live ticket delivery. */
async function decodeQrFromRegion(
  pngBuffer: Buffer,
  layout: TicketLayoutConfig,
): Promise<string | null> {
  const box = layout.qrBoxes[0];
  if (!box) return null;

  const metadata = await sharp(pngBuffer).metadata();
  if (!metadata.width || !metadata.height) return null;

  const left = Math.max(0, Math.min(box.x, metadata.width - 1));
  const top = Math.max(0, Math.min(box.y, metadata.height - 1));
  const width = Math.min(box.width, metadata.width - left);
  const height = Math.min(box.height, metadata.height - top);

  const { data, info } = await sharp(pngBuffer)
    .extract({ left, top, width, height })
    .resize(width * 3, height * 3, { kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const clamped = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  const decoded = jsQR(clamped, info.width, info.height);
  return decoded?.data ?? null;
}

/** Dev/CI only — decode QR region from a generated PNG. */
export async function decodeDigitalTicketQrUrl(
  pngBuffer: Buffer,
  layout?: TicketLayoutConfig,
): Promise<string | null> {
  const config = layout ?? (await readTicketLayoutConfig("digital")).config;
  const scaled = await resolveLayoutForPng(config, pngBuffer);
  return decodeQrFromRegion(pngBuffer, scaled);
}
