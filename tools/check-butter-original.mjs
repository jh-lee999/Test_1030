import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {BUTTER_ORIGINAL as meta} from '../assets/butter-original36/atlas.js';
let frames=0,minGutter=Infinity;
for(const [key,c]of Object.entries(meta.clips)){
  const path=fileURLToPath(new URL('../'+c.image,import.meta.url));
  const dims=execFileSync('identify',['-format','%w %h',path],{encoding:'utf8'}).trim().split(' ').map(Number);
  const width=c.width*c.columns,height=c.height*c.rows;assert.deepEqual(dims,[width,height],key);
  // Only alpha is needed, keeping memory bounded even for the large skill sheet.
  const alpha=execFileSync('convert',[path,'-alpha','extract','-depth','8','gray:-'],{maxBuffer:width*height+1024});assert.equal(alpha.length,width*height);
  for(let f=0;f<c.count;f++){
    const sx=f%c.columns*c.width,sy=Math.floor(f/c.columns)*c.height;let visible=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      if(alpha[(sy+y)*width+sx+x]<24)continue;visible++;
      const g=Math.min(x,y,c.width-1-x,c.height-1-y);minGutter=Math.min(g,minGutter);assert.ok(g>=5,`${key}/${f}: clipped cell`);
    }
    assert.ok(visible>300,`${key}/${f}: empty frame`);frames++;
  }
}
console.log(`${frames} original-rig whole poses: minimum transparent gutter ${minGutter}px; original direction count ${meta.directions.length}. Aesthetic approval requires playback review.`);
