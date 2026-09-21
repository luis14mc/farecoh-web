import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune } from "@gltf-transform/functions";
import draco3d from "draco3d";
import { readFile, writeFile } from "node:fs/promises";

async function main() {
  const input = await readFile(`/tmp/violin-orig.glb`);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.encoder": await draco3d.createEncoderModule(),
      "draco3d.decoder": await draco3d.createDecoderModule(),
    });
  const doc = await io.readBinary(new Uint8Array(input));

  const bboxMin = [Infinity, Infinity, Infinity];
  const bboxMax = [-Infinity, -Infinity, -Infinity];

  doc.getRoot().listNodes().forEach((node) => {
    const mesh = node.getMesh();
    if (!mesh) return;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const arr = pos.getArray();
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const z = arr[i + 2];
        if (x < bboxMin[0]) bboxMin[0] = x;
        if (y < bboxMin[1]) bboxMin[1] = y;
        if (z < bboxMin[2]) bboxMin[2] = z;
        if (x > bboxMax[0]) bboxMax[0] = x;
        if (y > bboxMax[1]) bboxMax[1] = y;
        if (z > bboxMax[2]) bboxMax[2] = z;
      }
    }
  });

  console.log(`bbox min: ${bboxMin.map((v) => v.toFixed(3))}`);
  console.log(`bbox max: ${bboxMax.map((v) => v.toFixed(3))}`);

  const center = [
    (bboxMin[0] + bboxMax[0]) / 2,
    (bboxMin[1] + bboxMax[1]) / 2,
    (bboxMin[2] + bboxMax[2]) / 2,
  ];
  console.log(`center: ${center.map((v) => v.toFixed(3))}`);

  const size = [
    bboxMax[0] - bboxMin[0],
    bboxMax[1] - bboxMin[1],
    bboxMax[2] - bboxMin[2],
  ];
  console.log(`size: ${size.map((v) => v.toFixed(3))}`);

  const maxDim = Math.max(...size);
  const targetMax = 1.5;
  const scale = maxDim > 0 ? targetMax / maxDim : 1;
  console.log(`scale: ${scale.toExponential(4)}`);

  doc.getRoot().listNodes().forEach((node) => {
    const mesh = node.getMesh();
    if (!mesh) return;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const arr = pos.getArray();
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = (arr[i] - center[0]) * scale;
        arr[i + 1] = (arr[i + 1] - center[1]) * scale;
        arr[i + 2] = (arr[i + 2] - center[2]) * scale;
      }
    }
  });

  await doc.transform(dedup(), prune());

  const binary = await io.writeBinary(doc);
  await writeFile(`public/models/violin.glb`, binary);
  console.log(`wrote public/models/violin.glb`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
