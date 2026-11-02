// Preserve camera registration: no trimming, per-frame scaling or mirroring.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
const manifestPath=path.join(root,"assets/butter-model.json");
const model=JSON.parse(readFileSync(manifestPath,"utf8"));
const {cell,columns,rows,padding}=model;
// Camera-space muzzle coordinates are baked from the actual fork endpoints,
// so shots leave the model's slingshot rather than the player's body center.
assert.ok(model.camera,"Regenerate model metadata before packing");
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>a.map(v=>v/Math.hypot(...a));
const muzzles=Array(columns*rows).fill(null);
assert.equal(model.frames.length,500,"Render all four directions before packing");
const width=cell*columns,height=cell*rows,packed=Buffer.alloc(width*height*4);
for(const frame of model.frames){
  const input=path.join(root,"build/butter-model-frames",frame.file);
  const pixels=execFileSync("convert",[input,"-depth","8","rgba:-"],{maxBuffer:cell*cell*4+1000});
  assert.equal(pixels.length,cell*cell*4);
  const bounds=[cell,cell,0,0];let visible=0;
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
    if(pixels[(y*cell+x)*4+3]<4)continue;
    visible++;bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);
    bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);
  }
  assert.ok(visible>2000,`${frame.index}: missing model silhouette`);
  assert.ok(bounds[0]>=padding&&bounds[1]>=padding&&bounds[2]<cell-padding&&bounds[3]<cell-padding,
    `${frame.index}/${frame.view}/${frame.clip}: clipped silhouette ${bounds}`);
  frame.bounds=bounds;
  const point=frame.bandEnds[0].map((v,i)=>(v+frame.bandEnds[1][i])/2);
  const forward=normalize(subtract(model.camera.target,model.camera.positions[frame.view]));
  const right=normalize(cross(forward,[0,0,1])),up=cross(right,forward);
  const relative=subtract(point,model.camera.target);
  frame.muzzle=[cell*(.5+dot(relative,right)/model.camera.orthoScale),cell*(.5-dot(relative,up)/model.camera.orthoScale)].map(v=>Math.round(v*1000)/1000);
  muzzles[frame.index]=frame.muzzle;
  const left=frame.index%columns*cell,top=Math.floor(frame.index/columns)*cell;
  for(let y=0;y<cell;y++)pixels.copy(packed,((top+y)*width+left)*4,y*cell*4,(y+1)*cell*4);
}
execFileSync("convert",["-size",`${width}x${height}`,"-depth","8","rgba:-","-define","webp:lossless=true",path.join(root,"assets/butter-model.webp")],{input:packed,maxBuffer:40e6});
model.file="butter-model.webp";
writeFileSync(manifestPath,JSON.stringify(model,null,2)+"\n");
writeFileSync(path.join(root,"assets/butter-model-anchors.js"),"// Generated from Blender camera and actual fork endpoints. npm run pack:model\nexport const BUTTER_MUZZLES = Object.freeze("+JSON.stringify(muzzles)+");\n");
console.log(`500 real model renders packed into ${width}×${height}; four physical views, complete silhouettes`);
