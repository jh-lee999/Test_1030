import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BUTTER_GUN} from '../assets/butter-gun71/atlas.js';
import {ELITE_ART} from '../assets/trickcal-elites71/atlas.js';
const root=new URL('../',import.meta.url),integrity=JSON.parse(readFileSync(new URL('assets/trickcal-elites71/integrity.json',root)));
for(const [p,sha]of Object.entries(integrity.files))assert.equal(createHash('sha256').update(readFileSync(new URL(p,root))).digest('hex'),sha,p);
let count=0,gutter=Infinity;const transparentSource={'./assets/trickcal-elites71/shady-skill.webp':[47],'./assets/trickcal-elites71/shady-high.webp':[57,58,59],'./assets/trickcal-elites71/shady-strike.webp':[0]};
for(const clip of [...Object.values(BUTTER_GUN.clips),...Object.values(ELITE_ART.heroes).flatMap(d=>Object.values(d.clips))]){
 const p=fileURLToPath(new URL(clip.image,root)),w=clip.width*clip.columns,h=clip.height*clip.rows;
 assert.equal(execFileSync('identify',['-format','%w %h',p],{encoding:'utf8'}),w+' '+h);
 const alpha=execFileSync('convert',[p,'-alpha','extract','-depth','8','gray:-'],{maxBuffer:w*h+1024});assert.equal(alpha.length,w*h);
 for(let f=0;f<clip.count;f++){
  let visible=0;const sx=f%clip.columns*clip.width,sy=Math.floor(f/clip.columns)*clip.height;
  for(let y=0;y<clip.height;y++)for(let x=0;x<clip.width;x++)if(alpha[(sy+y)*w+sx+x]>=24){visible++;const g=Math.min(x,y,clip.width-1-x,clip.height-1-y);gutter=Math.min(gutter,g);assert(g>=5,clip.image+'/'+f+' clipped');}
  if(transparentSource[clip.image]?.includes(f))assert.equal(visible,0,clip.image+'/'+f+' source teleport transition');else assert(visible>200,clip.image+'/'+f+' unexpected empty');count++;
 }
}
const c=BUTTER_GUN.clips.walkGun;assert.equal(c.count,c.gaitFrames*c.shotFrames);for(let gait=0;gait<c.gaitFrames;gait++)for(let shot=1;shot<c.shotFrames;shot++)assert.deepEqual(c.lowerChecks[gait*c.shotFrames],c.lowerChecks[gait*c.shotFrames+shot],'moving-shot lower rig changed with gun phase');
assert.equal(BUTTER_GUN.renderScale,.18);assert.equal(c.start,1.2);assert.equal(c.end,1.85);assert(Math.abs(c.release-(1.4333334-1.2)/.65)<1e-9);for(const d of Object.values(ELITE_ART.heroes))assert.equal(d.scale,.14);
console.log(JSON.stringify({wholeSourcePoses:count,minGutter:gutter,hashes:Object.keys(integrity.files).length,independentMovingGun:true,limits:'Technical bounds/source identity only, not aesthetic approval or verified game-art licensing.'},null,2));
