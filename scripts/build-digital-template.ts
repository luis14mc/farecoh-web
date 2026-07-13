import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

async function buildTemplate() {
  const bgPath = path.join(process.cwd(), "public", "templates", "ticket-digital-pink-floyd-bg.png");
  const logoPath = path.join(process.cwd(), "public", "images", "Logos", "logo_blanco.png");
  const outputPath = path.join(process.cwd(), "public", "templates", "ticket-digital-pink-floyd.png");

  console.log("Loading background and logo...");
  const bgBuffer = await fs.readFile(bgPath);
  const logoBuffer = await fs.readFile(logoPath);

  // 1. Create a blank 1080x1920 base canvas with dark/black background
  console.log("Creating base 1080x1920 canvas...");
  const baseCanvas = await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 5, g: 7, b: 12, alpha: 1 } // very dark space blue
    }
  })
  .png()
  .toBuffer();

  // 2. Resize generated bg graphic (1024x1024) to fit 1080x1080
  console.log("Resizing background graphic...");
  const resizedBgGraphic = await sharp(bgBuffer)
    .resize(1080, 1080, { fit: "cover" })
    .png()
    .toBuffer();

  // 3. Resize logo
  console.log("Resizing logo...");
  const resizedLogo = await sharp(logoBuffer)
    .resize(150, 150)
    .png()
    .toBuffer();

  // 4. Create SVG overlay with clean styles and layout
  const svgOverlay = `
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .title-main { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 800; font-size: 54px; fill: #FFFFFF; text-anchor: middle; letter-spacing: 3px; }
          .title-sub { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 500; font-size: 30px; fill: #FFA726; text-anchor: middle; letter-spacing: 1px; }
          .category { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 800; font-size: 38px; fill: #000000; text-anchor: middle; letter-spacing: 2px; }
          .details-label { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 500; font-size: 22px; fill: #FFA726; text-anchor: middle; letter-spacing: 2px; }
          .details-value { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 600; font-size: 28px; fill: #FFFFFF; text-anchor: middle; }
          .warning-title { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 800; font-size: 28px; fill: #FF5252; text-anchor: middle; letter-spacing: 1px; }
          .warning-text { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 600; font-size: 22px; fill: #FFFFFF; text-anchor: middle; }
          .label-code { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 500; font-size: 24px; fill: #B0BEC5; text-anchor: middle; letter-spacing: 1px; }
        </style>
      </defs>

      <!-- Glassmorphic border card -->
      <rect x="60" y="60" width="960" height="1800" rx="40" fill="#000000" fill-opacity="0.68" stroke="#FFA726" stroke-width="3" />

      <!-- Event Branding -->
      <text x="540" y="320" class="title-main">TRIBUTO A PINK FLOYD</text>
      <text x="540" y="375" class="title-sub">Parroquia El Salvador del Mundo</text>

      <!-- Divider -->
      <line x1="160" y1="420" x2="920" y2="420" stroke="#37474F" stroke-width="2" />

      <!-- Event Details -->
      <text x="540" y="470" class="details-label">FECHA Y HORA</text>
      <text x="540" y="515" class="details-value">Sábado, 27 de Junio de 2026 — 7:00 PM</text>

      <text x="540" y="600" class="details-label">LUGAR</text>
      <text x="540" y="645" class="details-value">Anfiteatro del Salvador, Tegucigalpa</text>

      <!-- Divider -->
      <line x1="160" y1="700" x2="920" y2="700" stroke="#37474F" stroke-width="2" />

      <!-- Category Tag -->
      <rect x="315" y="740" width="450" height="80" rx="20" fill="#FFA726" />
      <text x="540" y="793" class="category">ENTRADA GENERAL</text>

      <!-- QR Frame (Aperture area for overlays) -->
      <rect x="340" y="890" width="400" height="400" rx="30" fill="none" stroke="#FFA726" stroke-width="4" stroke-dasharray="12,6" />
      <text x="540" y="1080" font-family="Montserrat, Helvetica" font-size="24" font-weight="700" fill="#FFA726" fill-opacity="0.6" text-anchor="middle">ÁREA DEL CÓDIGO QR</text>

      <!-- Code Frame (Aperture area for overlays) -->
      <text x="540" y="1370" class="label-code">CÓDIGO DE BOLETO</text>
      <rect x="340" y="1400" width="400" height="80" rx="15" fill="#1C313A" />
      <text x="540" y="1452" font-family="Montserrat, Helvetica" font-size="30" font-weight="800" fill="#FFFFFF" fill-opacity="0.5" text-anchor="middle">[ DYNAMIC CODE ]</text>

      <!-- Warning Box -->
      <rect x="110" y="1540" width="860" height="240" rx="25" fill="#FF5252" fill-opacity="0.08" stroke="#FF5252" stroke-width="2" />
      <text x="540" y="1600" class="warning-title">⚠️ QR PERSONAL E INTRANSFERIBLE</text>
      <text x="540" y="1660" class="warning-text">NO COMPARTIR, REENVIAR NI PUBLICAR ESTE BOLETO</text>
      <text x="540" y="1720" class="warning-text">VÁLIDO PARA UN SOLO INGRESO AL EVENTO</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgOverlay);

  console.log("Compositing template elements...");
  await sharp(baseCanvas)
    .composite([
      { input: resizedBgGraphic, top: 400, left: 0, blend: "screen" }, // Overlay graphic inside dark background
      { input: svgBuffer, top: 0, left: 0 },
      { input: resizedLogo, top: 110, left: 465 } // Center logo
    ])
    .png()
    .toFile(outputPath);

  console.log(`Successfully generated digital ticket template at: ${outputPath}`);
}

buildTemplate().catch((err) => {
  console.error("Error building digital ticket template:", err);
  process.exit(1);
});
