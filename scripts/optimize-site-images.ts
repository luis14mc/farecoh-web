import { readdir, rename, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WEBP_QUALITY = 82;

interface ImageJob {
  label: string;
  inputDir: string;
  maxWidth: number;
  /** When true, remove jpg/jpeg/png sources after a successful webp write. */
  removeSources?: boolean;
  /** When true, recompress existing webp files that have no raster source left. */
  recompressWebpOnly?: boolean;
}

const JOBS: ImageJob[] = [
  {
    label: "artists",
    inputDir: path.join(process.cwd(), "public", "images", "artists"),
    maxWidth: 960,
    removeSources: true,
    recompressWebpOnly: true,
  },
  {
    label: "evento",
    inputDir: path.join(process.cwd(), "public", "images", "evento"),
    maxWidth: 1600,
    removeSources: true,
  },
  {
    label: "site-root",
    inputDir: path.join(process.cwd(), "public", "images"),
    maxWidth: 1600,
    removeSources: true,
  },
];

const RASTER_PATTERN = /\.(jpe?g|png)$/i;
const WEBP_PATTERN = /\.webp$/i;

async function optimizeRaster(inputPath: string, outputPath: string, maxWidth: number) {
  const image = sharp(inputPath).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? maxWidth;

  await image
    .resize(width > maxWidth ? { width: maxWidth, withoutEnlargement: true } : undefined)
    .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
    .toFile(outputPath);
}

async function recompressWebp(inputPath: string, maxWidth: number) {
  const tempPath = `${inputPath}.tmp.webp`;
  await optimizeRaster(inputPath, tempPath, maxWidth);
  await rm(inputPath);
  await rename(tempPath, inputPath);
}

async function processDirectory(job: ImageJob) {
  let entries: string[];
  try {
    entries = await readdir(job.inputDir);
  } catch {
    console.log(`[${job.label}] skip — directory not found`);
    return { inputBytes: 0, outputBytes: 0, count: 0 };
  }

  let inputBytes = 0;
  let outputBytes = 0;
  let count = 0;

  const rasterFiles = entries.filter((file) => RASTER_PATTERN.test(file)).sort();
  const webpOnlyFiles =
    job.recompressWebpOnly && job.label === "artists"
      ? entries.filter((file) => WEBP_PATTERN.test(file) && file !== "placeholder.webp").sort()
      : [];

  for (const file of rasterFiles) {
    if (job.label === "site-root" && !["farecoh-hero-orchestra.png"].includes(file)) {
      continue;
    }

    const inputPath = path.join(job.inputDir, file);
    const outputPath = path.join(job.inputDir, file.replace(RASTER_PATTERN, ".webp"));
    const inputStat = await stat(inputPath);
    inputBytes += inputStat.size;

    await optimizeRaster(inputPath, outputPath, job.maxWidth);
    const outputStat = await stat(outputPath);
    outputBytes += outputStat.size;
    count += 1;

    const saved = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);
    console.log(
      `[${job.label}] ${file} → ${path.basename(outputPath)} (${formatBytes(inputStat.size)} → ${formatBytes(outputStat.size)}, -${saved}%)`,
    );

    if (job.removeSources) {
      await unlink(inputPath);
    }
  }

  for (const file of webpOnlyFiles) {
    const basename = file.replace(WEBP_PATTERN, "");
    const hasRasterSource = rasterFiles.some((raster) => raster.replace(RASTER_PATTERN, "") === basename);
    if (hasRasterSource) continue;

    const inputPath = path.join(job.inputDir, file);
    const inputStat = await stat(inputPath);
    inputBytes += inputStat.size;

    await recompressWebp(inputPath, job.maxWidth);
    const outputStat = await stat(inputPath);
    outputBytes += outputStat.size;
    count += 1;

    const saved = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);
    console.log(
      `[${job.label}] ${file} recompressed (${formatBytes(inputStat.size)} → ${formatBytes(outputStat.size)}, -${saved}%)`,
    );
  }

  return { inputBytes, outputBytes, count };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function removeUnusedLineupPhotos() {
  const lineupDir = path.join(process.cwd(), "public", "images", "lineup");
  try {
    const entries = await readdir(lineupDir);
    for (const file of entries) {
      await rm(path.join(lineupDir, file));
    }
    await rm(lineupDir);
    console.log(`[cleanup] removed unused public/images/lineup/ (${entries.length} files)`);
  } catch {
    // directory already gone
  }
}

async function main() {
  let totalInput = 0;
  let totalOutput = 0;
  let totalCount = 0;

  for (const job of JOBS) {
    const result = await processDirectory(job);
    totalInput += result.inputBytes;
    totalOutput += result.outputBytes;
    totalCount += result.count;
  }

  await removeUnusedLineupPhotos();

  if (!totalCount) {
    console.log("No images optimized.");
    return;
  }

  const totalSaved = ((1 - totalOutput / totalInput) * 100).toFixed(1);
  console.log(`\nOptimized ${totalCount} image(s): ${formatBytes(totalInput)} → ${formatBytes(totalOutput)} (-${totalSaved}%)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
