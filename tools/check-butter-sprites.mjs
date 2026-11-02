import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BUTTER_SPRITE_LAYOUT, butterFrameRect } from "../sprite-layout.js";

const assets = new URL("../assets/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("butter-sprites.json", assets), "utf8"));
const { cell, columns, rows, anchorY } = BUTTER_SPRITE_LAYOUT;
assert.equal(manifest.cell, cell);
assert.equal(manifest.baseline, anchorY);
let checked = 0;
for (const atlas of Object.values(manifest.atlases)) {
  const file = fileURLToPath(new URL(atlas.file, assets));
  const dimensions = execFileSync("identify", ["-format", "%w %h", file], { encoding: "utf8" });
  assert.equal(dimensions, `${cell * columns} ${cell * rows}`, `${atlas.file}: unexpected dimensions`);
  const alpha = execFileSync("convert", [file, "-alpha", "extract", "-depth", "8", "gray:-"], { maxBuffer: 3e6 });
  assert.equal(atlas.frames.length, columns * rows);
  for (let index = 0; index < atlas.frames.length; index++) {
    const [sx, sy] = butterFrameRect(Math.floor(index / columns), index % columns);
    let visible = 0;
    let bottom = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const a = alpha[(sy + y) * atlas.width + sx + x];
      if (!a) continue;
      visible++;
      bottom = Math.max(bottom, y);
      assert.ok(x >= manifest.padding && x < cell - manifest.padding && y >= manifest.padding && y < cell - manifest.padding,
        `${atlas.file}/${index}: visible pixel on a frame boundary at ${x},${y}`);
    }
    assert.ok(visible > 10000, `${atlas.file}/${index}: missing silhouette`);
    assert.ok(bottom <= anchorY && bottom >= anchorY - 3, `${atlas.file}/${index}: incorrect foot baseline`);
    checked++;
  }
}
console.log(`${checked} sprite frames: complete silhouettes, transparent gutters and foot baselines verified`);

const motion = JSON.parse(readFileSync(new URL("butter-motion.json", assets), "utf8"));
let layers = 0;
for (const [part, layout] of Object.entries({ upper: motion.body, legs: motion.legs })) {
  const file = fileURLToPath(new URL(layout.file, assets));
  const width = layout.cell * layout.columns, height = layout.cell * layout.rows;
  const dimensions = execFileSync("identify", ["-format", "%w %h", file], { encoding: "utf8" });
  assert.equal(dimensions, `${width} ${height}`);
  const alpha = execFileSync("convert", [file, "-alpha", "extract", "-depth", "8", "gray:-"], { maxBuffer: 4e6 });
  for (let row = 0; row < layout.rows; row++) for (let col = 0; col < layout.columns; col++) {
    let visible = 0;
    for (let y = 0; y < layout.cell; y++) for (let x = 0; x < layout.cell; x++) {
      if (alpha[(row * layout.cell + y) * width + col * layout.cell + x] < 8) continue;
      visible++;
      const padding = part === "upper" ? 24 : 8;
      assert.ok(x >= padding && y >= padding && x < layout.cell - padding && y < layout.cell - padding,
        `${part}/${row}/${col}: layer touches cell boundary`);
    }
    assert.ok(visible > (part === "upper" ? 10000 : 800), `${part}: missing motion layer`);
    layers++;
  }
}
console.log(`${layers} motion layers: complete bodies and independent boots, transparent gutters verified`);
