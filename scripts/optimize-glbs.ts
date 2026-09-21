import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { draco, prune, dedup, weld, textureCompress } from "@gltf-transform/functions";
import draco3d from "draco3d";
import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INPUT_DIR = "./public/models";
const OUTPUT_DIR = "./public/models";

async function optimize(file) {
  const input = await readFile(join(INPUT_DIR, file));
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.encoder": await draco3d.createEncoderModule(),
      "draco3d.decoder": await draco3d.createDecoderModule(),
    });
  const doc = await io.readBinary(new Uint8Array(input));

  await doc.transform(
    draco({ method: "edgebreaker", encodeSpeed: 5, decodeSpeed: 5 }),
    weld({ tolerance: 0.0005 }),
    prune(),
    dedup(),
    textureCompress({ resize: [512, 512], targetFormat: "webp", quality: 70 }),
  );

  const binary = await io.writeBinary(doc);
  await writeFile(join(OUTPUT_DIR, file), binary);
  const out = await stat(join(OUTPUT_DIR, file));
  console.log(`${file}: ${(input.length / 1024).toFixed(1)}KB → ${(out.size / 1024).toFixed(1)}KB`);
}

const files = (await readdir(INPUT_DIR)).filter((f) => f.endsWith(".glb"));
for (const f of files) {
  try {
    await optimize(f);
  } catch (e) {
    console.error(`Failed to optimize ${f}:`, e.message);
  }
}

