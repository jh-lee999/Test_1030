import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {STAGE_ART as legacy} from '../assets/trickcal-stage37/atlas.js';
import {ENEMY_ART} from '../assets/trickcal-enemies43/atlas.js';
const meta={...legacy,monsters:{...legacy.monsters,...ENEMY_ART.monsters}};
let frames=0,minGutter=Infinity;
assert.deepEqual(legacy,JSON.parse(readFileSync(new URL('../assets/trickcal-stage37/atlas.json',import.meta.url))));
assert.deepEqual(ENEMY_ART,JSON.parse(readFileSync(new URL('../assets/trickcal-enemies43/atlas.json',import.meta.url))));
for(const [monster,m]of Object.entries(meta.monsters))for(const [key,c]of Object.entries(m.clips)){
  const path=fileURLToPath(new URL('../'+c.image,import.meta.url)),width=c.width*c.columns,height=c.height*c.rows;
  assert.deepEqual(execFileSync('identify',['-format','%w %h',path],{encoding:'utf8'}).trim().split(' ').map(Number),[width,height]);
  const alpha=execFileSync('convert',[path,'-alpha','extract','-depth','8','gray:-'],{maxBuffer:width*height+1024});let nonempty=0;
  for(let f=0;f<c.count;f++){const sx=f%c.columns*c.width,sy=Math.floor(f/c.columns)*c.height;let visible=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(alpha[(sy+y)*width+sx+x]>=24){visible++;const gutter=Math.min(x,y,c.width-1-x,c.height-1-y);minGutter=Math.min(minGutter,gutter);assert.ok(gutter>=5,`${monster}/${key}/${f} clipped`);}
    if(visible>100)nonempty++;else assert.equal(key,'die',`${monster}/${key}/${f} is empty`);frames++;
  }assert.ok(nonempty>=c.count*.6,`${monster}/${key}: missing poses`);
}
for(const bg of Object.values(meta.backgrounds))assert.ok(readFileSync(new URL('../'+bg.image,import.meta.url)).length>10000);
const sources=JSON.parse(readFileSync(new URL('../assets/trickcal-stage37/sources.json',import.meta.url)));assert.equal(sources.length,11);assert.ok(sources.every(s=>s.url.startsWith('https://viewer.dclnslde.com/')&&s.sha256.length===64));
const newSources=JSON.parse(readFileSync(new URL('../assets/trickcal-enemies43/sources.json',import.meta.url)));assert.equal(newSources.length,12);assert.ok(newSources.every(s=>s.url.startsWith('https://viewer.dclnslde.com/')&&s.sha256.length===64));
console.log(`${frames} original monster poses checked; minimum gutter ${minGutter}px; 2 backgrounds, 23 source hashes.`);
