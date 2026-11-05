import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),data=JSON.parse(readFileSync(new URL('assets/sanctuary73/sources.json',root)));
for(const [name,d]of Object.entries(data.files)){const p=fileURLToPath(new URL(name,root));assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),d.sha256,name);assert.equal(execFileSync('identify',['-format','%w %h',p],{encoding:'utf8'}),d.width+' '+d.height,name);}
const w=1774,h=887,p=fileURLToPath(new URL('assets/sanctuary73/objects.webp',root)),alpha=execFileSync('convert',[p,'-alpha','extract','-depth','8','gray:-'],{maxBuffer:w*h+1024});let min=Infinity;
for(let i=0;i<8;i++){const x0=Math.floor(i%4*w/4),x1=Math.floor((i%4+1)*w/4),y0=Math.floor(Math.floor(i/4)*h/2),y1=Math.floor((Math.floor(i/4)+1)*h/2);let l=x1,r=x0,b=y0,n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(alpha[y*w+x]>=24){n++;l=Math.min(l,x);r=Math.max(r,x);b=Math.max(b,y);min=Math.min(min,x-x0,x1-1-x,y-y0,y1-1-y);}assert(n>1000);assert(min>=16,'object cell overlap');assert.deepEqual(data.props.feet[i],[(l+r+1)/2-x0,b+1-y0]);}
console.log(JSON.stringify({hashes:4,objects:8,minGutter:min,sharedFootAnchors:true},null,2));
