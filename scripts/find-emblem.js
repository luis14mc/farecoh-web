import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

async function run() {
  const logoPath = path.join(process.cwd(), "public", "images", "Logos", "logo-horizontal.png");
  const { data, info } = await sharp(logoPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Dimensions: ${width}x${height}, channels: ${channels}`);

  const rowAlphas = [];
  for (let y = 0; y < height; y++) {
    let rowAlphaSum = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const alpha = channels === 4 ? data[idx + 3] : 255;
      rowAlphaSum += alpha;
    }
    rowAlphas.push(rowAlphaSum / width);
  }

  let inVisibleSection = false;
  let sections = [];
  let currentStart = 0;
  const THRESHOLD = 0.5;

  for (let y = 0; y < height; y++) {
    const isRowVisible = rowAlphas[y] > THRESHOLD;
    if (isRowVisible && !inVisibleSection) {
      inVisibleSection = true;
      currentStart = y;
    } else if (!isRowVisible && inVisibleSection) {
      inVisibleSection = false;
      sections.push({ start: currentStart, end: y - 1 });
    }
  }
  if (inVisibleSection) {
    sections.push({ start: currentStart, end: height - 1 });
  }

  let cropLeft, cropTop, cropWidth, cropHeight;

  if (sections.length >= 2) {
    const emblemSection = sections[0];
    const emblemHeight = emblemSection.end - emblemSection.start + 1;
    let minX = width;
    let maxX = 0;
    for (let y = emblemSection.start; y <= emblemSection.end; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const alpha = channels === 4 ? data[idx + 3] : 255;
        if (alpha > 5) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    const emblemWidth = maxX - minX + 1;
    const size = Math.max(emblemWidth, emblemHeight);
    const centerX = minX + emblemWidth / 2;
    const centerY = emblemSection.start + emblemHeight / 2;

    cropLeft = Math.max(0, Math.floor(centerX - size / 2));
    cropTop = Math.max(0, Math.floor(centerY - size / 2));
    cropWidth = Math.min(width - cropLeft, Math.ceil(size));
    cropHeight = Math.min(height - cropTop, Math.ceil(size));
  } else {
    const size = Math.min(width, height);
    cropLeft = Math.floor((width - size) / 2);
    cropTop = 0;
    cropWidth = size;
    cropHeight = size;
  }

  console.log(`Cropping coordinates: left=${cropLeft}, top=${cropTop}, width=${cropWidth}, height=${cropHeight}`);

  // 1. Generate PNG favicon
  const pngBuffer = await sharp(logoPath)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(128, 128)
    .png()
    .toBuffer();

  const pngFaviconPath = path.join(process.cwd(), "public", "favicon.png");
  await fs.writeFile(pngFaviconPath, pngBuffer);
  console.log("Successfully generated public/favicon.png");

  // 2. Generate SVG favicon wrapping the base64 PNG
  const base64Png = pngBuffer.toString("base64");
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <image href="data:image/png;base64,${base64Png}" width="128" height="128" />
</svg>
`;

  const svgFaviconPath = path.join(process.cwd(), "public", "favicon.svg");
  await fs.writeFile(svgFaviconPath, svgContent, "utf-8");
  console.log("Successfully updated public/favicon.svg with base64 embedded logo emblem");
}

run().catch(console.error);
