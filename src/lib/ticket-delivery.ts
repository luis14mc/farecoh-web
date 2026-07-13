import sharp from "sharp";
import QRCode from "qrcode";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

export function isPngBuffer(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

async function readTemplateFromFilesystem(): Promise<Buffer | null> {
  const candidates = [
    path.join(process.cwd(), "public/templates/ticket-digital-pink-floyd.png"),
    path.join(process.cwd(), "public", "templates", "ticket-digital-pink-floyd.png"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return await readFile(candidate);
    } catch {
      // try next path
    }
  }
  return null;
}

async function loadBundledTemplateBytes(): Promise<Buffer | null> {
  try {
    const { loadBundledDigitalTicketTemplateBytes } = await import("./ticket-delivery-bundle.ts");
    return loadBundledDigitalTicketTemplateBytes();
  } catch {
    return null;
  }
}

export async function loadDigitalTemplateBytes(): Promise<Buffer> {
  const fromDisk = await readTemplateFromFilesystem();
  if (fromDisk) {
    if (!isPngBuffer(fromDisk)) {
      throw new Error("La plantilla digital en disco no es un PNG válido.");
    }
    return fromDisk;
  }

  const fromBundle = await loadBundledTemplateBytes();
  if (fromBundle) {
    if (!isPngBuffer(fromBundle)) {
      throw new Error("La plantilla digital empaquetada no es un PNG válido.");
    }
    return fromBundle;
  }

  throw new Error("No se pudo cargar la plantilla digital (ni desde disco ni desde bundle).");
}

export async function generateTicketImage(ticketCode: string, qrToken: string): Promise<Buffer> {
  const templateBuffer = await loadDigitalTemplateBytes();

  // Generate QR code for the specific public verification URL (360x360 px)
  const qrUrl = `https://www.farecoh.org/t/${qrToken}`;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    type: "png",
    width: 360,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" }
  });

  // Generate SVG overlay for the ticket code text (centered vertically/horizontally)
  const svgText = `
    <svg width="400" height="80" viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg">
      <text x="200" y="52" font-family="'Montserrat', 'Helvetica', 'Arial', sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.5px">${ticketCode}</text>
    </svg>
  `;
  const svgTextBuffer = Buffer.from(svgText);

  // Composite the QR and the code text onto the template
  const compositeBuffer = await sharp(templateBuffer)
    .composite([
      { input: qrBuffer, top: 910, left: 360 }, // Center X=360, Y=910
      { input: svgTextBuffer, top: 1400, left: 340 } // Center X=340, Y=1400
    ])
    .png()
    .toBuffer();

  return compositeBuffer;
}
