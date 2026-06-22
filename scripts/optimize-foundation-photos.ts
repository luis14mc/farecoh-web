import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INPUT_DIR = path.join(process.cwd(), "public", "images", "fotografias");
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 82;

async function optimizeFoundationPhotos() {
  const entries = (await readdir(INPUT_DIR))
    .filter((file) => /\.(jpe?g|png)$/i.test(file))
    .sort();

  if (!entries.length) {
    console.log("No source images found in public/images/fotografias/");
    return;
  }

  let inputBytes = 0;
  let outputBytes = 0;

  for (const file of entries) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(INPUT_DIR, file.replace(/\.(jpe?g|png)$/i, ".webp"));
    const inputStat = await stat(inputPath);
    inputBytes += inputStat.size;

    const image = sharp(inputPath).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? MAX_WIDTH;

    await image
      .resize(width > MAX_WIDTH ? { width: MAX_WIDTH, withoutEnlargement: true } : undefined)
      .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
      .toFile(outputPath);

    const outputStat = await stat(outputPath);
    outputBytes += outputStat.size;

    const saved = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);
    console.log(`${file} → ${path.basename(outputPath)} (${formatBytes(inputStat.size)} → ${formatBytes(outputStat.size)}, -${saved}%)`);
  }

  const totalSaved = ((1 - outputBytes / inputBytes) * 100).toFixed(1);
  console.log(`\nTotal: ${formatBytes(inputBytes)} → ${formatBytes(outputBytes)} (-${totalSaved}%)`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

optimizeFoundationPhotos().catch((error) => {
  console.error(error);
  process.exit(1);
});
