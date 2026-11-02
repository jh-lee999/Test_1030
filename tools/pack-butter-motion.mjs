// Build independently anchored torso and leg layers for continuous locomotion.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = file => {
  const filename = path.join(root, "tools/sprite-sources", file);
  const [width, height] = execFileSync("identify", ["-format", "%w %h", filename], { encoding: "utf8" }).split(" ").map(Number);
  return { width, height, pixels: execFileSync("convert", [filename, "-depth", "8", "rgba:-"], { maxBuffer: 12e6 }) };
};
const crop = (source, [x, y, width, height], keep = () => true) => {
  const pixels = Buffer.alloc(width * height * 4);
  for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) {
    const from = ((y + dy) * source.width + x + dx) * 4;
    if (source.pixels[from + 3] < 8 || !keep(x + dx, y + dy)) continue;
    source.pixels.copy(pixels, (dy * width + dx) * 4, from, from + 4);
  }
  return { width, height, pixels };
};
const resize = (source, width, height) => execFileSync("convert", ["-size", `${source.width}x${source.height}`, "-depth", "8", "rgba:-", "-resize", `${width}x${height}!`, "-depth", "8", "rgba:-"], { input: source.pixels, maxBuffer: 4e6 });
const paste = (target, targetWidth, pixels, width, height, x, y) => {
  for (let row = 0; row < height; row++) {
    if (x < 0 || y + row < 0 || x + width > targetWidth) throw new Error("Layer outside atlas");
    pixels.copy(target, ((y + row) * targetWidth + x) * 4, row * width * 4, (row + 1) * width * 4);
  }
};
const encode = (name, pixels, width, height) => execFileSync("convert", ["-size", `${width}x${height}`, "-depth", "8", "rgba:-", "-define", "webp:lossless=true", path.join(root, "assets", name)], { input: pixels, maxBuffer: 12e6 });

const upper = read("butter-motion-upper.webp");
const body = Buffer.alloc(960 * 960 * 4);
// Exact root anchors at the center of the pink garment, not bounding-box centers.
const views = [
  { boxes: [[120, 10, 360, 320], [590, 10, 360, 320], [1045, 10, 365, 320]], roots: [[298, 327], [770, 327], [1231, 327]] },
  { boxes: [[147, 333, 350, 329], [613, 333, 352, 329], [1076, 333, 380, 329]], roots: [[282, 652], [756, 653], [1234, 653]] },
  { boxes: [[118, 662, 375, 325], [588, 662, 380, 325], [1064, 662, 385, 325]], roots: [[298, 983], [770, 983], [1246, 983]] }
];
for (let row = 0; row < 3; row++) for (let frame = 0; frame < 3; frame++) {
  const box = views[row].boxes[frame];
  const [rootX, rootY] = views[row].roots[frame];
  const layer = crop(upper, box);
  const scale = 0.58;
  const width = Math.round(layer.width * scale), height = Math.round(layer.height * scale);
  const x = frame * 320 + 160 - Math.round((rootX - box[0]) * scale);
  const y = row * 320 + 224 - Math.round((rootY - box[1]) * scale);
  paste(body, 960, resize(layer, width, height), width, height, x, y);
}
encode("butter-motion-upper.webp", body, 960, 960);

const neutral = read("butter-motion-neutral.webp");
const legs = Buffer.alloc(192 * 288 * 4);
const legRects = [
  [[307, 520, 79, 154], [386, 520, 79, 154]],
  [[949, 520, 128, 154], [949, 520, 128, 154]],
  [[1706, 520, 81, 154], [1787, 520, 82, 154]]
];
for (let row = 0; row < 3; row++) for (let leg = 0; leg < 2; leg++) {
  // Isolate the near side-view boot; the original far boot is partially occluded.
  const keep = row === 1 ? (x, y) => x >= (y < 632 ? 988 : y < 651 ? 988 - (y - 632) * 1.4 : 961) : undefined;
  const layer = crop(neutral, legRects[row][leg], keep);
  const width = row === 1 ? 43 : 31;
  const height = 60;
  const pixels = resize(layer, width, height);
  paste(legs, 192, pixels, width, height, leg * 96 + 48 - Math.floor(width / 2), row * 96 + 12);
}
encode("butter-motion-legs.webp", legs, 192, 288);
writeFileSync(path.join(root, "assets/butter-motion.json"), JSON.stringify({ body: { file: "butter-motion-upper.webp", cell: 320, columns: 3, rows: 3, hip: [160, 224] }, legs: { file: "butter-motion-legs.webp", cell: 96, columns: 2, rows: 3, pivot: [48, 12], length: 60 }, feet: 280 }, null, 2) + "\n");
console.log("9 anchored upper-body poses + 6 independent legs packed with transparent gutters");
