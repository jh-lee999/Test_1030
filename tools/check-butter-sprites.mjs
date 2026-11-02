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

const chibi=JSON.parse(readFileSync(new URL("butter-chibi.json",assets),"utf8"));
const chibiFile=fileURLToPath(new URL(chibi.file,assets));
const chibiWidth=chibi.cell*chibi.columns,chibiHeight=chibi.cell*chibi.rows;
assert.equal(execFileSync("identify",["-format","%w %h",chibiFile],{encoding:"utf8"}),`${chibiWidth} ${chibiHeight}`);
const chibiAlpha=execFileSync("convert",[chibiFile,"-alpha","extract","-depth","8","gray:-"],{maxBuffer:3e6});
assert.equal(chibi.frames.length,21);
for(const frame of chibi.frames){
  let visible=0,bottom=0;
  for(let y=0;y<chibi.cell;y++)for(let x=0;x<chibi.cell;x++){
    if(!chibiAlpha[(frame.row*chibi.cell+y)*chibiWidth+frame.frame*chibi.cell+x])continue;
    visible++;bottom=Math.max(bottom,y);
    assert.ok(x>=chibi.padding&&y>=chibi.padding&&x<chibi.cell-chibi.padding&&y<chibi.cell-chibi.padding,
      `chibi/${frame.row}/${frame.frame}: sprite touches frame boundary`);
  }
  assert.ok(visible>5000,"Incomplete chibi silhouette");
  assert.ok(bottom>=chibi.anchor[1]-3&&bottom<=chibi.anchor[1],"Incorrect chibi foot baseline");
}
console.log("21 complete chibi poses: transparent gutters and foot baselines verified");

// Check the artwork itself, not just the playback indices: the lower foot must
// actually switch sides in the front/back contact drawings.
for(const row of [0,2])for(const frame of [1,3]){
  const lowest=[0,0];
  for(let y=119;y<137;y++)for(let x=64;x<96;x++){
    if(chibiAlpha[(row*160+y)*chibiWidth+frame*160+x]<128)continue;
    const foot=x<80?0:1;lowest[foot]=Math.max(lowest[foot],y);
  }
  assert.ok(frame===1?lowest[0]>lowest[1]:lowest[1]>lowest[0],
    `chibi/${row}/${frame}: contact artwork does not alternate feet`);
}
console.log("Front/back contact artwork: opposite feet verified in the actual pixels");
