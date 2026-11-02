// Pack the measured silhouettes, not imaginary equal-sized cells in the source art.
// ImageMagick handles only decoding/resampling/encoding; this preserves the source drawing.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const WIDTH = 1440;
const HEIGHT = 720;
const CELL = 320;
const PADDING = 24;
const BASELINE = 280;
const configs = [
  { id: "walk", file: "butter-walk.webp", rows: [0, 261, 484, 720] },
  { id: "side", file: "butter-actions.webp", rows: [0, 274, 494, 720], splits: [[1, 724], [2, 724]] },
  // The original stone in frames 15/16 runs off the image. Use complete poses from
  // the same sequence; the actual released boulder is rendered by the game.
  { id: "down", file: "butter-actions-down.webp", rows: [0, 266, 476, 720], substitutes: { 15: 14, 16: 13 } },
  { id: "up", file: "butter-actions-up.webp", rows: [0, 265, 501, 720] }
];

function components(rgba) {
  const labels = new Int32Array(WIDTH * HEIGHT);
  const queue = new Int32Array(labels.length);
  const groups = [null];
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || rgba[start * 4 + 3] < 115) continue;
    const id = groups.length;
    const group = { id, pixels: [], sumX: 0, sumY: 0 };
    let head = 0;
    let tail = 1;
    queue[0] = start;
    labels[start] = id;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % WIDTH;
      const y = Math.floor(pixel / WIDTH);
      group.pixels.push(pixel);
      group.sumX += x;
      group.sumY += y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
        const next = ny * WIDTH + nx;
        if (labels[next] || rgba[next * 4 + 3] < 115) continue;
        labels[next] = id;
        queue[tail++] = next;
      }
    }
    group.x = group.sumX / group.pixels.length;
    group.y = group.sumY / group.pixels.length;
    groups.push(group);
  }
  return { labels, groups: groups.slice(1) };
}

function bounds(pixels) {
  let left = WIDTH, top = HEIGHT, right = 0, bottom = 0;
  for (const p of pixels) {
    const x = p % WIDTH;
    const y = Math.floor(p / WIDTH);
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

const manifest = { cell: CELL, columns: 6, rows: 3, baseline: BASELINE, padding: PADDING, atlases: {} };
for (const config of configs) {
  const source = path.join(root, "tools/sprite-sources", config.file);
  const rgba = execFileSync("convert", [source, "-depth", "8", "rgba:-"], { maxBuffer: 8e6 });
  if (rgba.length !== WIDTH * HEIGHT * 4) throw new Error(`Unexpected source size: ${source}`);
  const { groups } = components(rgba);
  const owner = new Int16Array(WIDTH * HEIGHT).fill(-1);
  const framePixels = Array.from({ length: 18 }, () => []);
  for (const group of groups) {
    if (group.pixels.length < 16) continue;
    // The three painted rows have different heights. Main silhouettes determine row ownership,
    // so a shoe extending over a nominal row boundary cannot become the next frame's debris.
    let row = config.rows.findIndex((value, i) => i < 3 && group.y >= value && group.y < config.rows[i + 1]);
    if (row < 0) throw new Error(`Unassigned component in ${config.id}`);
    const box = bounds(group.pixels);
    const merged = group.pixels.length > 45000;
    const split = config.splits?.find(([splitRow, x]) => splitRow === row && x > box.x && x < box.x + box.width)?.[1];
    for (const pixel of group.pixels) {
      const x = pixel % WIDTH;
      let column = Math.min(5, Math.floor(group.x / 240));
      if (merged && split) column = x < split ? 2 : 3;
      const index = row * 6 + column;
      owner[pixel] = index;
    }
  }
  // Restore anti-aliased edges from the original alpha, without bringing a neighboring silhouette.
  let edge = [];
  for (let p = 0; p < owner.length; p++) if (owner[p] >= 0) edge.push(p);
  for (let ring = 0; ring < 4; ring++) {
    const nextEdge = [];
    for (const p of edge) {
      const x = p % WIDTH, y = Math.floor(p / WIDTH);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
        const n = ny * WIDTH + nx;
        if (owner[n] >= 0 || rgba[n * 4 + 3] < 8) continue;
        owner[n] = owner[p];
        nextEdge.push(n);
      }
    }
    edge = nextEdge;
  }
  for (let p = 0; p < owner.length; p++) if (owner[p] >= 0) framePixels[owner[p]].push(p);
  for (const [index, replacement] of Object.entries(config.substitutes ?? {})) {
    framePixels[index] = framePixels[replacement];
  }
  const boxes = framePixels.map((pixels, index) => {
    if (pixels.length < 15000) throw new Error(`Incomplete frame: ${config.id}/${index}`);
    return bounds(pixels);
  });
  const extracted = boxes.map((box, index) => {
    const pixels = Buffer.alloc(box.width * box.height * 4);
    for (const p of framePixels[index]) {
      const sourceOffset = p * 4;
      const targetOffset = ((Math.floor(p / WIDTH) - box.y) * box.width + p % WIDTH - box.x) * 4;
      rgba.copy(pixels, targetOffset, sourceOffset, sourceOffset + 4);
    }
    return { pixels, box };
  });
  if (config.id === "side") {
    const repair = path.join(root, "tools/sprite-sources/repairs/side-low-release.webp");
    const [width, height] = execFileSync("identify", ["-format", "%w %h", repair], { encoding: "utf8" }).split(" ").map(Number);
    extracted[8] = { pixels: execFileSync("convert", [repair, "-depth", "8", "rgba:-"]), box: { x: 0, y: 0, width, height } };
  }
  // A single scale for all frames in a painted row prevents per-frame size pumping.
  const scales = [0, 1, 2].map(row => Math.min(...extracted.slice(row * 6, row * 6 + 6).map(({ box }) =>
    Math.min((CELL - PADDING * 2) / box.width, (BASELINE - PADDING) / box.height)
  )));
  const packed = Buffer.alloc(CELL * 6 * CELL * 3 * 4);
  const frames = [];
  for (let index = 0; index < 18; index++) {
    const { pixels, box } = extracted[index];
    const row = Math.floor(index / 6);
    const scale = scales[row];
    const width = Math.round(box.width * scale);
    const height = Math.round(box.height * scale);
    const resized = execFileSync("convert", ["-size", `${box.width}x${box.height}`, "-depth", "8", "rgba:-", "-resize", `${width}x${height}!`, "-depth", "8", "rgba:-"], { input: pixels, maxBuffer: 2e6 });
    const offsetX = Math.floor((CELL - width) / 2);
    const offsetY = BASELINE - height;
    for (let y = 0; y < height; y++) {
      const start = ((row * CELL + offsetY + y) * CELL * 6 + index % 6 * CELL + offsetX) * 4;
      resized.copy(packed, start, y * width * 4, (y + 1) * width * 4);
    }
    frames.push({ source: box, content: [offsetX, offsetY, width, height], pixels: framePixels[index].length, substitute: config.substitutes?.[index] ?? null });
  }
  execFileSync("convert", ["-size", `${CELL * 6}x${CELL * 3}`, "-depth", "8", "rgba:-", "-define", "webp:lossless=true", path.join(root, "assets", config.file)], { input: packed, maxBuffer: 8e6 });
  manifest.atlases[config.id] = { file: config.file, width: CELL * 6, height: CELL * 3, frames };
  console.log(`${config.id}: 18 complete silhouettes, ${CELL}px cells, ${PADDING}px minimum padding`);
}
writeFileSync(path.join(root, "assets/butter-sprites.json"), JSON.stringify(manifest, null, 2) + "\n");
