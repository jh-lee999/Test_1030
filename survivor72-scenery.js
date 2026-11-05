// Generated storybook artwork is separate from unchanged original Trickcal art.
import {seedNumber,pathTo,WORLD,SPAWN,blocked} from './survivor71-world.js';
import {PALETTES} from './survivor72-art.js';
const TILE=256,LIMIT=48,tiles=new Map(),layouts=new Map();
const hash=(x,y,s=0)=>{let n=Math.imul(x+71,374761393)^Math.imul(y+37,668265263)^s;n=Math.imul(n^n>>>13,1274126177);return (n>>>0)/4294967296;};
export const SCENERY={forest:'./assets/storybook72/forest.webp',night:'./assets/storybook72/night.webp',ember:'./assets/storybook72/ember.webp',props:'./assets/storybook72/props.webp',boulder:'./assets/storybook72/boulder.webp'};
const KEYS=['tree','bush','rock','mushroom','stump','flowers','log','fern'];
const FEET=[[236,400],[224.5,386],[219.5,386],[226.5,384],[231,364],[220,361],[218,346],[218.5,363]];
export function sceneLayout(g){
 const geometry=g.world.obstacles.map(o=>[o.x,o.y,o.w,o.h].join(',')).join(';'),key=g.seed+'|'+g.map+'|'+geometry;
 if(layouts.has(key))return layouts.get(key);
 const edges=new Map(),seed=seedNumber(g.seed+':paint72');
 for(const p of g.world.points){const route=pathTo(g.world,SPAWN,p);for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];if(a.x===b.x&&a.y===b.y)continue;edges.set([a.x+','+a.y,b.x+','+b.y].sort().join(':'),{a,b});}}
 // Only little flowers/ferns on walkable terrain. Large props are actual cover.
 const decorations=[];for(let y=160;y<WORLD.height;y+=190)for(let x=140;x<WORLD.width;x+=200){const h=hash(x,y,seed),px=x+hash(y,x,seed)*70,py=y+h*70;
  if(h>.46||blocked(g.world,px,py,40)||g.world.points.some(p=>Math.hypot(p.x-px,p.y-py)<150)||Math.hypot(px-SPAWN.x,py-SPAWN.y)<130)continue;
  decorations.push({x:px,y:py,key:h<.22?'flowers':'fern',width:34+hash(x+2,y,seed)*24});
 }
 const layout={key,seed,roads:[...edges.values()],decorations};layouts.set(key,layout);if(layouts.size>4)layouts.delete(layouts.keys().next().value);return layout;
}
function tile(g,layout,gx,gy,images){
 const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(TILE,TILE):Object.assign(document.createElement('canvas'),{width:TILE,height:TILE}),c=canvas.getContext('2d'),p=PALETTES[g.map],ground=images.scenery?.[g.map];
 c.fillStyle=p.ground;c.fillRect(0,0,TILE,TILE);c.save();c.translate(-gx*TILE,-gy*TILE);
 if(ground?.naturalWidth){
  // Mirrored1024px macro tiles have matching boundary pixels, no hard seams.
  for(let y=Math.floor(gy*TILE/1024);y<=Math.floor((gy*TILE+TILE)/1024);y++)for(let x=Math.floor(gx*TILE/1024);x<=Math.floor((gx*TILE+TILE)/1024);x++){
   c.save();c.translate(x*1024+(x%2?1024:0),y*1024+(y%2?1024:0));c.scale(x%2?-1:1,y%2?-1:1);c.drawImage(ground,0,0,1024,1024);c.restore();
  }
 }
 c.lineCap='round';c.lineJoin='round';
 // Draw each connected path once per pass. Repeated segment strokes create
 // dark pipe joints; these lightly worn paths stay beneath the painted grass.
 for(const [width,color]of [[44,g.map==='night'?'#a29baa24':'#d7bf8a24'],[25,g.map==='night'?'#b0a6b42b':'#e3cfa32b']]){
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();for(const {a,b}of layout.roads){c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}c.stroke();
 }
 for(const {a,b}of layout.roads){
  const n=Math.max(1,Math.floor(Math.hypot(b.x-a.x,b.y-a.y)/110));
  for(let i=0;i<n;i++){const t=(i+.5)/n,h=hash(a.x+i,a.y,layout.seed),x=a.x+(b.x-a.x)*t+(h-.5)*15,y=a.y+(b.y-a.y)*t+(hash(i,a.x,layout.seed)-.5)*15;
   c.save();c.translate(x,y);c.rotate(h*.9);c.fillStyle='#554b3826';c.beginPath();c.ellipse(1,3,10+h*5,6+h*2,0,0,Math.PI*2);c.fill();c.fillStyle=g.map==='night'?'#b5b9c0':g.map==='ember'?'#e9cfac':'#d3cfad';c.strokeStyle='#6d72544a';c.lineWidth=1;c.beginPath();c.moveTo(-10,-3);c.lineTo(-5,-8);c.lineTo(8,-6);c.lineTo(13,0);c.lineTo(6,7);c.lineTo(-8,5);c.closePath();c.fill();c.stroke();c.strokeStyle='#fff4cf68';c.beginPath();c.moveTo(-5,-5);c.lineTo(6,-4);c.stroke();c.restore();
  }
 }
 c.restore();return canvas;
}
export function drawPaintedProp(c,images,key,x,y,width=110){
 const image=images.scenery?.props;if(!image?.naturalWidth)return false;
 const i=KEYS.indexOf(key);if(i<0)return false;const col=i%4,row=Math.floor(i/4),sx=Math.floor(col*image.naturalWidth/4),sy=Math.floor(row*image.naturalHeight/2),sw=Math.floor((col+1)*image.naturalWidth/4)-sx,sh=Math.floor((row+1)*image.naturalHeight/2)-sy;
 const height=width*sh/sw,foot=FEET[i];c.drawImage(image,sx,sy,sw,sh,x-foot[0]*width/sw,y-foot[1]*height/sh,width,height);return true;
}
export function drawTerrain(c,g,view,images={}){
 const layout=sceneLayout(g),{left,top,viewWidth,viewHeight}=view,ready=images.scenery?.[g.map]?.naturalWidth||0;
 for(let y=Math.floor(top/TILE);y<=Math.floor((top+viewHeight)/TILE);y++)for(let x=Math.floor(left/TILE);x<=Math.floor((left+viewWidth)/TILE);x++){
  const key=layout.key+':'+ready+':'+x+','+y;let image=tiles.get(key);if(!image){image=tile(g,layout,x,y,images);tiles.set(key,image);if(tiles.size>LIMIT)tiles.delete(tiles.keys().next().value);}else{tiles.delete(key);tiles.set(key,image);}c.drawImage(image,x*TILE,y*TILE);
 }
 for(const d of layout.decorations)if(d.x>left-80&&d.x<left+viewWidth+80&&d.y>top-80&&d.y<top+viewHeight+80)drawPaintedProp(c,images,d.key,d.x,d.y,d.width);
 const p=PALETTES[g.map],margin=1600;c.fillStyle=p.shade+'88';c.fillRect(left-margin,top-margin,viewWidth+margin*2,Math.max(0,45-top+margin));c.fillRect(left-margin,WORLD.height-45,viewWidth+margin*2,margin+viewHeight);c.fillRect(left-margin,45,Math.max(0,45-left+margin),WORLD.height-90);c.fillRect(WORLD.width-45,45,margin+viewWidth,WORLD.height-90);
 // Little timber boundary, not a solid bright rectangle over the scenery.
 c.strokeStyle='#8d725f';c.lineWidth=5;c.strokeRect(45,45,WORLD.width-90,WORLD.height-90);
 for(let x=Math.max(45,Math.floor(left/110)*110+45);x<Math.min(WORLD.width,left+viewWidth+110);x+=110)for(const y of [45,WORLD.height-45])post(c,x,y);
 for(let y=Math.max(45,Math.floor(top/110)*110+45);y<Math.min(WORLD.height,top+viewHeight+110);y+=110)for(const x of [45,WORLD.width-45])post(c,x,y);
}
function post(c,x,y){c.fillStyle='#c7a276';c.strokeStyle='#87684e';c.lineWidth=2;c.beginPath();c.roundRect(x-6,y-18,12,28,4);c.fill();c.stroke();c.fillStyle='#edcea0';c.beginPath();c.ellipse(x,y-17,6,3,0,0,Math.PI*2);c.fill();}
export function drawCoverBase(c,g,o){c.fillStyle='#4f603529';c.beginPath();c.ellipse(o.x+o.w/2,o.y+o.h*.68,o.w*.53,o.h*.38,0,0,Math.PI*2);c.fill();}
export function drawCover(c,g,o,images){
 c.save();if(g.player.y<o.y+o.h&&g.player.y>o.y-110&&g.player.x>o.x-35&&g.player.x<o.x+o.w+35)c.globalAlpha=.5;
 const keys=o.style%3===0?['tree','bush']:o.style%3===1?['rock','log']:['mushroom','stump'],count=o.w>100?2:1;
 for(let i=0;i<count;i++){const key=keys[i%keys.length],x=o.x+o.w/count*(i+.5),y=o.y+o.h-4,width=key==='tree'?142:118;
  if(!drawPaintedProp(c,images,key,x,y,width)){c.fillStyle=PALETTES[g.map].leaf;c.beginPath();c.ellipse(x,y-30,38,43,0,0,Math.PI*2);c.fill();}
 }
 c.restore();
}
export function cacheInfo(){return {tiles:tiles.size,limit:LIMIT,layouts:layouts.size,bytes:tiles.size*TILE*TILE*4};}
export function clearSceneCache(){tiles.clear();layouts.clear();}
