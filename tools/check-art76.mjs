import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {OBJECTS76 as d} from '../assets/sanctuary76/atlas.js';
const root=new URL('../',import.meta.url),sources=JSON.parse(readFileSync(new URL('assets/sanctuary76/sources.json',root)));
for(const [name,hash]of Object.entries(sources.files)){
 const p=new URL(name,root);assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),hash);
 assert.equal(execFileSync('identify',['-format','%w %h',p.pathname],{encoding:'utf8'}),d.width+' '+d.height);
 const a=execFileSync('convert',[p.pathname,'-alpha','extract','-depth','8','gray:-'],{maxBuffer:d.width*d.height+1024});let min=Infinity;
 for(let i=0;i<12;i++){let l=362,t=362,r=-1,b=-1;for(let y=0;y<362;y++)for(let x=0;x<362;x++)if(a[(Math.floor(i/4)*362+y)*d.width+i%4*362+x]>=d.alphaThreshold){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}assert.deepEqual([l,t,r+1,b+1],d.bounds[i]);assert.deepEqual([(l+r+1)/2,b+1],d.feet[i]);min=Math.min(min,l,t,361-r,361-b);}assert.equal(min,d.minimumGutter);
}
console.log('v76 fan atlas: two pinned files,12 whole cells, shared per-cell anchors,5px minimum alpha24 gutter.');
