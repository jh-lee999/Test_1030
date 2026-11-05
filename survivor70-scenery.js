import {seedNumber,pathTo,WORLD} from './survivor69-world.js';
import {PALETTES} from './survivor70-art.js';
const TILE=256,LIMIT=48,tiles=new Map(),layouts=new Map();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const unit=(n)=>{n=Math.imul(n^n>>>16,2246822507);n=Math.imul(n^n>>>13,3266489909);return ((n^n>>>16)>>>0)/4294967296;};
export function sceneLayout(g){
 const geometry=g.world.obstacles.map(o=>[o.x,o.y,o.w,o.h].join(',')).join(';'),key=g.seed+'|'+g.map+'|'+geometry;
 if(layouts.has(key))return layouts.get(key);
 const edges=new Map();
 for(const p of g.world.points){const route=pathTo(g.world,{x:1300,y:1000},p);for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];if(a.x===b.x&&a.y===b.y)continue;const k=[a.x+','+a.y,b.x+','+b.y].sort().join(':');edges.set(k,{a,b});}}
 const layout={key,seed:seedNumber(g.seed+':art70'),roads:[...edges.values()]};layouts.set(key,layout);if(layouts.size>4)layouts.delete(layouts.keys().next().value);return layout;
}
function flower(c,x,y,size,color){c.save();c.translate(x,y);c.strokeStyle='#81966b66';c.lineWidth=.8;c.beginPath();c.moveTo(0,0);c.lineTo(1,6);c.stroke();c.fillStyle=color;for(let i=0;i<5;i++){const a=i*Math.PI*.4;c.beginPath();c.ellipse(Math.cos(a)*size,Math.sin(a)*size,size*.7,size*.65,a,0,Math.PI*2);c.fill();}c.fillStyle='#e3bc6c';c.beginPath();c.arc(0,0,size*.65,0,Math.PI*2);c.fill();c.restore();}
function bake(g,layout,gx,gy){
 const image=typeof OffscreenCanvas==='function'?new OffscreenCanvas(TILE,TILE):Object.assign(document.createElement('canvas'),{width:TILE,height:TILE}),c=image.getContext('2d'),p=PALETTES[g.map];
 let value=seedNumber(layout.key+':'+gx+','+gy);const rand=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 c.fillStyle=p.ground;c.fillRect(0,0,TILE,TILE);
 for(let i=0;i<85;i++){const x=rand()*TILE,y=rand()*TILE,r=10+rand()*34;c.globalAlpha=.025+rand()*.035;c.fillStyle=i%3?p.wash:p.shade;c.beginPath();c.ellipse(x,y,r,r*(.25+rand()*.55),rand()*2,0,Math.PI*2);c.fill();}c.globalAlpha=1;
 c.save();c.translate(-gx*TILE,-gy*TILE);c.lineCap='round';c.lineJoin='round';
 for(const {a,b}of layout.roads){c.strokeStyle=p.path+'32';c.lineWidth=34;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  const distance=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.floor(distance/65));
  for(let i=0;i<count;i++){const t=(i+.5)/count,h=unit(layout.seed+Math.imul(a.x+27*a.y,31)+i),x=a.x+(b.x-a.x)*t+(h-.5)*8,y=a.y+(b.y-a.y)*t+(unit(i+layout.seed)-.5)*7;c.fillStyle=h>.5?p.paper+'7b':p.path+'9c';c.strokeStyle=p.edge+'16';c.lineWidth=1;c.beginPath();c.ellipse(x,y,6+h*5,4+h*3,h*.6,0,Math.PI*2);c.fill();c.stroke();}
 }c.restore();
 for(let i=0;i<55;i++){const x=6+rand()*(TILE-12),y=6+rand()*(TILE-12),h=rand();c.strokeStyle=h>.5?p.shade+'6c':p.wash+'bc';c.lineWidth=1.2;c.lineCap='round';c.beginPath();c.moveTo(x-3,y+2);c.quadraticCurveTo(x-2,y-3,x-5,y-5);c.moveTo(x,y+2);c.quadraticCurveTo(x+1,y-4,x+4,y-7);c.stroke();}
 for(let i=0;i<6;i++)flower(c,10+rand()*(TILE-20),10+rand()*(TILE-20),1.5+rand()*1.4,i%3===0?'#fff2ce':p.flower);
 for(let i=0;i<110;i++){c.globalAlpha=.09;c.fillStyle=i%2?p.paper:p.shade;c.fillRect(rand()*TILE,rand()*TILE,.8,.8);}c.globalAlpha=1;
 return image;
}
export function drawTerrain(c,g,{left,top,viewWidth,viewHeight}){
 const layout=sceneLayout(g),x0=Math.floor(left/TILE),x1=Math.floor((left+viewWidth)/TILE),y0=Math.floor(top/TILE),y1=Math.floor((top+viewHeight)/TILE);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const key=layout.key+':'+x+','+y;let tile=tiles.get(key);if(!tile){tile=bake(g,layout,x,y);tiles.set(key,tile);if(tiles.size>LIMIT)tiles.delete(tiles.keys().next().value);}else{tiles.delete(key);tiles.set(key,tile);}c.drawImage(tile,x*TILE,y*TILE);}
 const p=PALETTES[g.map];c.fillStyle=p.shade+'55';const margin=1500;c.fillRect(-margin,-margin,WORLD.width+margin*2,margin+45);c.fillRect(-margin,WORLD.height-45,WORLD.width+margin*2,margin+45);c.fillRect(-margin,45,margin+45,WORLD.height-90);c.fillRect(WORLD.width-45,45,margin+45,WORLD.height-90);
 c.strokeStyle=p.edge+'85';c.lineWidth=5;c.lineCap='round';c.strokeRect(45,45,WORLD.width-90,WORLD.height-90);
 for(let x=Math.max(45,Math.floor(left/90)*90+45);x<Math.min(WORLD.width,left+viewWidth+90);x+=90)for(const y of [45,WORLD.height-45])post(c,x,y,p);
 for(let y=Math.max(45,Math.floor(top/90)*90+45);y<Math.min(WORLD.height,top+viewHeight+90);y+=90)for(const x of [45,WORLD.width-45])post(c,x,y,p);
}
function post(c,x,y,p){c.fillStyle=p.path;c.strokeStyle=p.edge;c.lineWidth=2;c.beginPath();c.roundRect(x-5,y-14,10,21,4);c.fill();c.stroke();c.fillStyle=p.paper;c.beginPath();c.ellipse(x,y-12,5,3,0,0,Math.PI*2);c.fill();}
export function drawCoverBase(c,g,o){const p=PALETTES[g.map];c.fillStyle='#594d3d1a';c.fillRect(o.x+3,o.y+7,o.w,o.h);c.fillStyle=p.shade;c.strokeStyle=p.edge;c.lineWidth=2;c.beginPath();c.roundRect(o.x,o.y,o.w,o.h,8);c.fill();c.stroke();c.strokeStyle=p.path+'88';c.lineWidth=3;c.strokeRect(o.x+5,o.y+5,o.w-10,o.h-10);}
export function drawCover(c,g,o,images){
 const kind=['bush','rock','mushroom'][o.style%3],image=images.props?.[g.map+':'+kind]||images.props?.[kind],count=o.w>100?2:1;
 for(let i=0;i<count;i++){const x=o.x+o.w/count*(i+.5),y=o.y+o.h-5;if(image?.naturalWidth)c.drawImage(image,x-55,y-94,110,117);else{c.fillStyle=PALETTES[g.map].leaf;c.beginPath();c.ellipse(x,y-20,38,42,0,0,Math.PI*2);c.fill();}}
}
export function cacheInfo(){return {tiles:tiles.size,limit:LIMIT,layouts:layouts.size,bytes:tiles.size*TILE*TILE*4};}
export function clearSceneCache(){tiles.clear();layouts.clear();}
