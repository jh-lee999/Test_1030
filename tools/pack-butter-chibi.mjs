// Isolate complete drawn poses. No runtime bones, mesh deformation or limb scaling.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
const input=path.join(root,"tools/sprite-sources/butter-chibi-source.webp");
const [width,height]=execFileSync("identify",["-format","%w %h",input],{encoding:"utf8"}).split(" ").map(Number);
const rgba=execFileSync("convert",[input,"-depth","8","rgba:-"],{maxBuffer:12e6});
const labels=new Int32Array(width*height),queue=new Int32Array(width*height),groups=[];
let id=0;
for(let start=0;start<labels.length;start++){
  if(labels[start]||rgba[start*4+3]<100)continue;
  const group={id:++id,pixels:[],sumX:0,sumY:0};let head=0,tail=1;queue[0]=start;labels[start]=id;
  while(head<tail){
    const p=queue[head++],x=p%width,y=Math.floor(p/width);group.pixels.push(p);group.sumX+=x;group.sumY+=y;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
      const n=ny*width+nx;if(labels[n]||rgba[n*4+3]<100)continue;labels[n]=id;queue[tail++]=n;
    }
  }
  if(group.pixels.length>10000){group.x=group.sumX/group.pixels.length;group.y=group.sumY/group.pixels.length;groups.push(group);}
}
if(groups.length!==21)throw new Error(`Expected 21 complete sprites; found ${groups.length}`);
groups.sort((a,b)=>a.y-b.y);
const ordered=[];
for(let row=0;row<3;row++)ordered.push(...groups.slice(row*7,row*7+7).sort((a,b)=>a.x-b.x));
const CELL=160,BASELINE=136,SCALE=.51;
const packed=Buffer.alloc(CELL*7*CELL*3*4),frames=[];
for(let index=0;index<21;index++){
  const group=ordered[index],keep=new Set(group.pixels);let edge=group.pixels;
  for(let ring=0;ring<3;ring++){
    const next=[];for(const p of edge){const x=p%width,y=Math.floor(p/width);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const n=ny*width+nx;if(keep.has(n)||rgba[n*4+3]<8)continue;
        if(labels[n]&&labels[n]!==group.id)continue;keep.add(n);next.push(n);
      }
    }edge=next;
  }
  let left=width,top=height,right=0,bottom=0;
  for(const p of keep){const x=p%width,y=Math.floor(p/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const w=right-left+1,h=bottom-top+1,isolated=Buffer.alloc(w*h*4);
  for(const p of keep){const to=((Math.floor(p/width)-top)*w+p%width-left)*4;rgba.copy(isolated,to,p*4,p*4+4);}
  // Align by the upper head silhouette: weapon and tail do not shift the character.
  let headLeft=width,headRight=0;
  for(const p of group.pixels){const y=Math.floor(p/width);if(y<top+45||y>top+120)continue;headLeft=Math.min(headLeft,p%width);headRight=Math.max(headRight,p%width);}
  const center=(headLeft+headRight)/2;
  const targetWidth=Math.round(w*SCALE),targetHeight=Math.round(h*SCALE);
  const resized=execFileSync("convert",["-size",`${w}x${h}`,"-depth","8","rgba:-","-resize",`${targetWidth}x${targetHeight}!`,"-depth","8","rgba:-"],{input:isolated,maxBuffer:1e6});
  const x=80-Math.round((center-left)*SCALE),y=BASELINE-targetHeight;
  if(x<12||x+targetWidth>CELL-12||y<12)throw new Error(`Sprite ${index} needs more padding`);
  for(let line=0;line<targetHeight;line++){
    const to=(((Math.floor(index/7)*CELL+y+line)*CELL*7)+index%7*CELL+x)*4;
    resized.copy(packed,to,line*targetWidth*4,(line+1)*targetWidth*4);
  }
  frames.push({row:Math.floor(index/7),frame:index%7,source:[left,top,w,h],content:[x,y,targetWidth,targetHeight],pixels:group.pixels.length});
}
execFileSync("convert",["-size",`${CELL*7}x${CELL*3}`,"-depth","8","rgba:-","-define","webp:lossless=true",path.join(root,"assets/butter-chibi.webp")],{input:packed,maxBuffer:8e6});
writeFileSync(path.join(root,"assets/butter-chibi.json"),JSON.stringify({file:"butter-chibi.webp",cell:CELL,columns:7,rows:3,anchor:[80,BASELINE],padding:12,walk:[1,2,3,4],frames},null,2)+"\n");
console.log("21 complete chibi poses packed; 4-step walk for front, side and back");
