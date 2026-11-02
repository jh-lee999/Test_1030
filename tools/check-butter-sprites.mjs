import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BUTTER_SPRITE_LAYOUT, butterFrameRect } from "../sprite-layout.js";
import {BUTTER_MUZZLES} from "../assets/butter-model-anchors.js";
import {BUTTER_MODEL_LAYOUT} from "../butter-motion.js";

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

// Current game atlas: one physical Blender model, independently sampled gait
// and attack phases, true four-view capture. Nothing may touch a cell boundary.
const model=JSON.parse(readFileSync(new URL("butter-model.json",assets),"utf8"));
for(const key of ["cell","columns","rows","viewStride"])assert.equal(model[key],BUTTER_MODEL_LAYOUT[key]);
assert.deepEqual(model.anchor,[BUTTER_MODEL_LAYOUT.anchorX,BUTTER_MODEL_LAYOUT.anchorY]);
const modelFile=fileURLToPath(new URL(model.file,assets));
const modelWidth=model.cell*model.columns,modelHeight=model.cell*model.rows;
assert.equal(execFileSync("identify",["-format","%w %h",modelFile],{encoding:"utf8"}),`${modelWidth} ${modelHeight}`);
assert.equal(model.frames.length,500);
assert.equal(BUTTER_MUZZLES.length,512,"Missing generated camera-space muzzle anchors");
assert.deepEqual(model.views,["down","left","right","up"]);
assert.equal(model.holdingHand,"hand.R");assert.equal(model.drawingHand,"hand.L");
assert.equal(model.weaponBone,"slingshot.R");
const modelRGBA=execFileSync("convert",[modelFile,"-depth","8","rgba:-"],{maxBuffer:40e6});
const poseByKey=new Map(),indices=new Set();
for(const frame of model.frames){
  const layout=model.clips[frame.clip];
  assert.deepEqual(BUTTER_MUZZLES[frame.index],frame.muzzle);
  assert.ok(frame.muzzle.every(Number.isFinite));
  assert.equal(frame.index,model.views.indexOf(frame.view)*model.viewStride+layout.offset+frame.gait*layout.attackFrames+frame.attack);
  assert.ok(!indices.has(frame.index));indices.add(frame.index);
  const key=`${frame.clip}/${frame.gait}/${frame.attack}`;
  const pose={rightHand:frame.rightHand,leftHand:frame.leftHand,bandEnds:frame.bandEnds};
  if(poseByKey.has(key))assert.deepEqual(pose,poseByKey.get(key),`${key}: camera view changed the physical hands`);
  else poseByKey.set(key,pose);
  const sx=frame.index%model.columns*model.cell,sy=Math.floor(frame.index/model.columns)*model.cell;
  let visible=0;
  for(let y=0;y<model.cell;y++)for(let x=0;x<model.cell;x++){
    if(modelRGBA[((sy+y)*modelWidth+sx+x)*4+3]<4)continue;
    visible++;
    assert.ok(x>=model.padding&&y>=model.padding&&x<model.cell-model.padding&&y<model.cell-model.padding,
      `model/${frame.index}: visible pixel at cell boundary ${x},${y}`);
  }
  assert.ok(visible>2000,`model/${frame.index}: incomplete silhouette`);
}
// Different attack phases of the SAME gait must visibly animate the arms while
// leaving feet unchanged. Compare the actual exported pixels, not just indices.
function region(a,b,top,bottom){
  let different=0;
  for(let y=top;y<bottom;y++)for(let x=0;x<128;x++){
    const ai=((Math.floor(a/16)*128+y)*modelWidth+(a%16)*128+x)*4;
    const bi=((Math.floor(b/16)*128+y)*modelWidth+(b%16)*128+x)*4;
    // WebP may discard RGB under alpha=0; invisible colors aren't movement.
    if(modelRGBA[ai+3]<4&&modelRGBA[bi+3]<4)continue;
    if(!modelRGBA.subarray(ai,ai+4).equals(modelRGBA.subarray(bi,bi+4)))different++;
  }
  return different;
}
for(const [vi,view] of model.views.entries()){
  const a=vi*128+21+3*8+2,b=vi*128+21+3*8+5;
  assert.ok(region(a,b,35,90)>10,`${view}: moving-shot hand animation is missing`);
  assert.equal(region(a,b,102,120),0,`${view}: a shot restarted the feet`);
}
console.log("500 Blender frames: unclipped silhouettes, fixed physical hands, independent moving-shot arms/feet verified");
