import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CRATE} from '../assets/sanctuary75/atlas.js';
const root=new URL('../',import.meta.url),d=JSON.parse(readFileSync(new URL('assets/sanctuary75/sources.json',root)));
assert.deepEqual(CRATE,d.crate);
for(const [name,v]of Object.entries(d.files)){const p=new URL(name,root),buf=readFileSync(p);assert.equal(createHash('sha256').update(buf).digest('hex'),v.sha256,name);assert.equal(buf.length,v.bytes);assert.equal(execFileSync('identify',['-format','%w %h',p.pathname],{encoding:'utf8'}),CRATE.width+' '+CRATE.height);const a=execFileSync('convert',[p.pathname,'-alpha','extract','-depth','8','gray:-'],{maxBuffer:CRATE.width*CRATE.height+1024});let l=CRATE.width,t=CRATE.height,r=0,b=0;for(let y=0;y<CRATE.height;y++)for(let x=0;x<CRATE.width;x++)if(a[y*CRATE.width+x]>=d.alphaThreshold){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}assert.deepEqual([l,t,r+1,b+1],CRATE.bounds);assert.deepEqual([(l+r+1)/2,b+1],CRATE.foot);assert.equal(Math.min(l,t,CRATE.width-r-1,CRATE.height-b-1),CRATE.minimumGutter);}
console.log(JSON.stringify({hashes:2,plainCrate:true,minGutter:CRATE.minimumGutter,sharedFoot:true}));
