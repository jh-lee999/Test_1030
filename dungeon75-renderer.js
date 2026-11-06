import {CRATE} from './assets/sanctuary75/atlas.js';
import {drawButterMotion} from './butter-gun-motion71.js';
import {STAGE_ART} from './platformer-art.js';
import {ELITE_ART} from './assets/trickcal-elites71/atlas.js';
import {EFFECT_REGIONS} from './dice-effects.js';
import {FLOOR,VIEW,DIRECTIONS,visibleRooms} from './dungeon74-world.js';
import {current,links,nearby,stats} from './dungeon75-engine.js';
import {ITEMS,ROOM_NAMES,FLOORS} from './dungeon75-content.js';
import {drawPaintedProp} from './survivor72-scenery.js';
const TAU=Math.PI*2;
const FEET=[[222.5,406],[222.5,406],[222.5,406],[222.5,406],[219.5,354],[223,369],[221,398],[226,390]];
export const ASSETS={room:'./assets/sanctuary73/room.webp',objects:'./assets/sanctuary73/objects.webp',library:'./assets/sanctuary74/library.webp',moon:'./assets/sanctuary74/moon.webp',additions:'./assets/sanctuary74/objects.webp',crate:'./assets/sanctuary75/crate.webp'};
export function viewport(width,height){const zoom=Math.min(width/VIEW.width,height/VIEW.height);return {zoom,x:(width-VIEW.width*zoom)/2,y:(height-VIEW.height*zoom)/2};}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function label(c,t,x,y,size=15,color='#fff1d5'){c.save();c.font=size+'px Jua70, sans-serif';c.textAlign='center';c.lineJoin='round';c.strokeStyle='#193a37df';c.lineWidth=5;c.strokeText(t,x,y);c.fillStyle=color;c.fillText(t,x,y);c.restore();}
function fx(c,im,key,x,y,size,angle=0,alpha=1){if(!im?.naturalWidth)return false;c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);c.drawImage(im,...EFFECT_REGIONS[key],-size/2,-size/2,size,size);c.restore();return true;}
export function object(c,images,index,x,y,width=120,height=width){const im=images.objects;if(!im?.naturalWidth)return false;const col=index%4,row=Math.floor(index/4),sx=Math.floor(col*im.naturalWidth/4),sy=Math.floor(row*im.naturalHeight/2),sw=Math.floor((col+1)*im.naturalWidth/4)-sx,sh=Math.floor((row+1)*im.naturalHeight/2)-sy;c.drawImage(im,sx,sy,sw,sh,x-FEET[index][0]*width/sw,y-FEET[index][1]*height/sh,width,height);return true;}
const NEW_FEET=[[183,335],[182.5,335],[182,335],[180.5,328],[182,333],[182,333],[182,333],[180.5,321],[181.5,332],[180.5,259],[178.5,308],[180.5,312]];
export function addition(c,images,index,x,y,width=120,height=width){const im=images.additions;if(!im?.naturalWidth)return false;const sw=im.naturalWidth/4,sh=im.naturalHeight/3,f=NEW_FEET[index];c.drawImage(im,index%4*sw,Math.floor(index/4)*sh,sw,sh,x-f[0]*width/sw,y-f[1]*height/sh,width,height);return true;}
export function drawCrate(c,images,o){
 const im=images.crate,w=(o.w+8)*CRATE.width/(CRATE.bounds[2]-CRATE.bounds[0]),z=w/CRATE.width,x=o.x+o.w/2,y=o.y+o.h;
 if(im?.naturalWidth){c.drawImage(im,x-CRATE.foot[0]*z,y-CRATE.foot[1]*z,CRATE.width*z,CRATE.height*z);return;}
 // Nonblocking fallback is still a plain nailed wooden box, never a gold chest.
 c.fillStyle='#a66e40';c.strokeStyle='#573c2b';c.lineWidth=3;c.fillRect(o.x,o.y-12,o.w,o.h+12);c.strokeRect(o.x,o.y-12,o.w,o.h+12);
 c.beginPath();c.moveTo(o.x+6,o.y-6);c.lineTo(o.x+o.w-6,y-6);c.moveTo(o.x+o.w-6,o.y-6);c.lineTo(o.x+6,y-6);c.stroke();
}
export function drawItem(c,images,id,x,y,size){const d=ITEMS[id];if(!d)return false;if(d.fan!==undefined){const im=images.additions;if(!im?.naturalWidth)return false;const sw=im.naturalWidth/4,sh=im.naturalHeight/3;c.drawImage(im,d.fan%4*sw,Math.floor(d.fan/4)*sh,sw,sh,x,y,size,size);return true;}const im=images.icons[id];if(!im?.naturalWidth)return false;c.drawImage(im,x,y,size,size);return true;}
function doorObject(c,g,images,index,x,y,w,h){if(!g.floorIndex)return object(c,images,index,x,y,w,h);if(index===7){c.fillStyle=g.floorIndex===1?'#775239':'#4c4260';c.strokeStyle='#d6be9c66';c.lineWidth=2;c.beginPath();c.roundRect(x-w*.42,y-h*.8,w*.84,h*.8,13);c.fill();c.stroke();c.strokeStyle='#1a1c2a';c.lineWidth=2;c.beginPath();c.moveTo(x-13,y-h*.7);c.lineTo(x+8,y-h*.5);c.lineTo(x-3,y-h*.3);c.lineTo(x+14,y-h*.1);c.stroke();return true;}return addition(c,images,(g.floorIndex===1?0:4)+(index===0?0:index===2?2:1),x,y,w,h);}
function terrain(c,g){const r=current(g);for(const t of r.terrain){c.save();c.fillStyle=g.floorIndex===0?'#294c4288':g.floorIndex===1?'#bd7c3b88':'#6d68a388';c.strokeStyle=g.floorIndex===0?'#9aaa6f88':g.floorIndex===1?'#e0b76a88':'#c5bbe888';c.lineWidth=2;c.beginPath();c.roundRect(t.x,t.y,t.w,t.h,17);c.fill();c.stroke();c.strokeStyle='#d5ddb24d';for(let i=0;i<5;i++){const x=t.x+12+(i*.19*t.w),y=t.y+t.h*.5+Math.sin(i*2)*t.h*.2;c.beginPath();c.ellipse(x,y,6,2.5,.2,0,TAU);c.stroke();}c.restore();} }
function ring(c,x,y,r,color,fill='#e8abb821',dashed=false){c.save();c.strokeStyle=color;c.fillStyle=fill;c.lineWidth=3;c.setLineDash(dashed?[7,7]:[]);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.stroke();c.restore();}
function drawDoor(c,g,l,images){const to=g.rooms[l.to],r=current(g),secret=to.type==='secret'&&!to.unlocked;
 let index=secret?7:!r.cleared?1:to.type==='treasure'&&!to.unlocked?2:to.type==='boss'&&!to.visited?3:0;
 c.save();const pos=l.dir==='n'?{x:640,y:205}:l.dir==='s'?{x:640,y:740}:l.dir==='w'?{x:104,y:475}:{x:1176,y:475};c.translate(pos.x,pos.y);
 // Door frame is one complete isolated sprite. Side doors keep a legible arch
 // rather than rotating its baked directional lighting and botanical ornament.
 const w=['e','w'].includes(l.dir)?135:155,h=['e','w'].includes(l.dir)?180:180;
 if(!doorObject(c,g,images,index,0,0,w,h)){c.fillStyle=secret?'#60714f':index===0?'#162c35':'#685849';c.beginPath();c.roundRect(-w*.34,-h*.7,w*.68,h*.7,35);c.fill();}
 if(!secret&&r.cleared){const name=to.type==='treasure'&&!to.unlocked?'열쇠 1개':to.type==='boss'?FLOORS[g.floorIndex].bossName:to.type==='challenge'?'도전 · 선택':to.visited?'지나온 길':to.type==='shop'?'잡화점':'미지의 방';label(c,name,0,13,13,to.type==='treasure'?'#f9d98f':'#ddedcf');}
 if(!secret&&!r.cleared){c.strokeStyle='#bf9565';c.lineWidth=5;c.beginPath();c.moveTo(-w*.25,-h*.55);c.lineTo(w*.25,-h*.25);c.moveTo(w*.25,-h*.55);c.lineTo(-w*.25,-h*.25);c.stroke();}c.restore();
}
function drawEnemy(c,g,e,images,reduced){
 c.save();c.translate(e.x,e.y);c.fillStyle='#14292366';c.beginPath();c.ellipse(0,5,e.radius*1.2,9,0,0,TAU);c.fill();
 if(e.appear>0){ring(c,0,0,28,'#c9b1e9','#be94d828');c.restore();return;}
 const facing=g.player.x>e.x?-1:1;let art,key,clip,im,index,scale;
 if(e.boss){
  art=ELITE_ART.heroes[e.role];key='walk';let t=e.age;
  if(e.action){const a=e.action.time,w=e.role==='erpin'?.95:1.05;key=e.role==='velvet'?'high':'skill';
   if(e.role==='shady'){if(a<w)t=a/w*1.966667;else{key='strike';t=a<w+1.2?.4+(a-w)/1.2*.833333:1.233333+(a-w-1.2)/1.3*.433334;}}
   if(e.role==='velvet')t=a<w?a/w*.733333:a<w+1.8?.733333+(a-w)/1.8*(2.666667-.733333):2.666667+(a-w-1.8)/1.4*(4.1-2.666667);
   if(e.role==='erpin'){const knots=[[0,0],[w,.833333],[w+.17,1.7],[w+.34,1.8],[w+.51,1.966667],[w+.7,2.133333],[2.9,2.833333]];t=2.833333;for(let i=1;i<knots.length;i++)if(a<=knots[i][0]){const [x,y]=knots[i-1],[x2,y2]=knots[i];t=y+(a-x)/(x2-x)*(y2-y);break;}}
  }
  clip=art.clips[key];im=images.elites?.[e.role]?.[key];index=clip.loop?Math.floor(t%clip.duration/clip.duration*clip.count):Math.max(0,Math.min(clip.count-1,Math.round(t/clip.duration*(clip.count-1))));scale=1.2;
  if(!im?.naturalWidth&&images.elites?.[e.role]?.idle?.naturalWidth){im=images.elites[e.role].idle;clip=art.clips.idle;index=0;}
 }else{art=STAGE_ART.monsters[e.role];key=['tell','recover','dash'].includes(e.state)?'attack':'walk';clip=art.clips[key];im=images.monsters[e.role]?.[key];index=reduced?0:clip.loop?Math.floor(e.age%clip.duration/clip.duration*clip.count):Math.min(clip.count-1,Math.floor((e.attackClock||0)/(e.role==='rusher'?2.22:e.role==='fan'?1.45:1.8)*clip.count));scale=e.role==='rusher'?.45:e.role==='caster'?.4:.43;}
 if(reduced)index=0;c.save();c.scale(facing,1);if(im?.naturalWidth)c.drawImage(im,index%clip.columns*clip.width,Math.floor(index/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);else circle(c,0,-22,e.radius,e.boss?'#ac87cc':'#c8ae9f');c.restore();
 if((e.freezeUntil||0)>g.time){ring(c,0,-26,e.radius+10,'#bde7ff','#a5dbe02b');label(c,'❄',0,-70,15,'#d8f2ff');}
 if(e.flash>0&&!reduced)ring(c,0,-25,e.radius+6,'#fff3bf','#fff2be12');if(e.hp<e.maxHp&&!e.boss){c.fillStyle='#142c2b';c.fillRect(-26,-74,52,5);c.fillStyle='#edc291';c.fillRect(-26,-74,52*e.hp/e.maxHp,5);}c.restore();
}
function drawPickup(c,g,q,images,reduced){const t=reduced?0:Math.sin(g.time*3+q.id)*3;c.save();c.translate(q.x,q.y+t);c.fillStyle='#253d3044';c.beginPath();c.ellipse(0,9,13,4,0,0,TAU);c.fill();c.strokeStyle='#6a4e3b';c.lineWidth=2;
 if(q.kind==='coin'){circle(c,0,0,11,'#f1c76e');c.stroke();circle(c,0,0,7,'#dfaa46');c.strokeStyle='#fff0b5';c.beginPath();c.moveTo(0,-5);c.lineTo(0,5);c.stroke();}
 if(q.kind==='key'){c.strokeStyle='#ffe1a2';c.lineWidth=5;c.beginPath();c.arc(-5,-5,6,0,TAU);c.moveTo(0,0);c.lineTo(10,10);c.lineTo(14,6);c.moveTo(6,6);c.lineTo(10,2);c.stroke();}
 if(q.kind==='bomb'){circle(c,0,2,11,'#58615e');c.stroke();c.strokeStyle='#e2be77';c.lineWidth=3;c.beginPath();c.moveTo(2,-8);c.quadraticCurveTo(10,-15,6,-17);c.stroke();circle(c,6,-17,3,'#ffdf9c');}
 if(q.kind==='heart'){c.fillStyle='#ea9aa8';c.beginPath();c.moveTo(0,11);c.bezierCurveTo(-26,-3,-8,-20,0,-9);c.bezierCurveTo(8,-20,26,-3,0,11);c.fill();c.stroke();}c.restore();}
export function drawMinimap(c,g,width=160,height=110,full=false){c.clearRect(0,0,width,height);const rs=visibleRooms(g),xs=rs.map(r=>r.x),ys=rs.map(r=>r.y),minX=Math.min(...xs),minY=Math.min(...ys),cols=Math.max(...xs)-minX+1,rows=Math.max(...ys)-minY+1,size=Math.min(full?55:25,(width-16)/cols,(height-16)/rows),ox=(width-cols*size)/2,oy=(height-rows*size)/2;
 for(const r of rs){const x=ox+(r.x-minX)*size,y=oy+(r.y-minY)*size;c.fillStyle=r.id===g.room?'#f4d893':r.visited?'#8eaf9c':'#5b777044';c.strokeStyle=r.id===g.room?'#fff2c7':'#b2c3a166';c.lineWidth=r.id===g.room?2:1;c.beginPath();c.roundRect(x+3,y+3,size-6,size-6,3);c.fill();c.stroke();if(r.visited||r.type!=='combat'){c.font=(size*.4)+'px Jua70,sans-serif';c.textAlign='center';c.fillStyle=r.id===g.room?'#604a3d':'#e2dec7';c.fillText({start:'⌂',treasure:'◆',shop:'$',secret:'?',boss:'☾',challenge:'!',combat:r.cleared?'·':''}[r.type],x+size/2,y+size*.66);}}
}
export function render(c,g,images,{width,height,reduced=false}={}){
 c.clearRect(0,0,width,height);c.fillStyle='#142b2c';c.fillRect(0,0,width,height);const v=viewport(width,height);c.save();c.translate(v.x,v.y);c.scale(v.zoom,v.zoom);
 const background=images[FLOORS[g.floorIndex].id]||images.room;if(background?.naturalWidth)c.drawImage(background,0,0,VIEW.width,VIEW.height);else{c.fillStyle='#445e4e';c.fillRect(75,150,1130,560);c.strokeStyle='#8b9874';c.lineWidth=34;c.strokeRect(90,165,1100,540);}
 const r=current(g),p=g.player;
 if(r.type==='treasure'||r.type==='shop'||r.type==='secret'){const gradient=c.createRadialGradient(640,420,20,640,420,350);gradient.addColorStop(0,r.type==='secret'?'#bd8de526':'#fff2bd27');gradient.addColorStop(1,'#fff0b000');c.fillStyle=gradient;c.fillRect(180,230,920,430);}
 terrain(c,g);for(const l of links(g))drawDoor(c,g,l,images);
 for(const z of g.zones){if(z.kind==='fire'){ring(c,z.x,z.y,z.radius,'#e2a76888','#eaa2563b');if(!reduced)for(let i=0;i<3;i++)fx(c,images.effects,'flare',z.x+Math.cos(i*2)*15,z.y+Math.sin(i*2)*15,16);}if(z.kind==='danger')ring(c,z.x,z.y,z.radius,z.triggered?'#f0a5ab':'#f3c4b2',z.triggered?'#e0658055':'#eeb7c422',!z.triggered);if(z.kind==='bomb')drawPickup(c,g,{...z,id:0,kind:'bomb'},images,reduced);}
 for(const e of r.enemies)if(['tell','spin'].includes(e.state)){
  if(e.role==='velvet'){ring(c,e.x,e.y,132,'#efb7bb',e.state==='spin'?'#e681a73b':'#cf789920',e.state==='tell');if(e.state==='tell')label(c,'회전 예고 · 바깥으로',e.x,e.y-145,15,'#f3c8d4');}
  else if(e.role==='erpin'){const a=Math.atan2(e.aimY-(e.y-25),e.aimX-e.x);c.save();c.strokeStyle='#f0c5a6';c.lineWidth=2;c.setLineDash([8,8]);for(const offset of [-.15,-.05,.05,.15]){c.beginPath();c.moveTo(e.x,e.y-25);c.lineTo(e.x+Math.cos(a+offset)*550,e.y-25+Math.sin(a+offset)*550);c.stroke();}c.restore();}
  else{const a=e.role==='shady'?{x:e.aimX,y:e.aimY,r:82}:e.role==='caster'?{x:e.aimX,y:e.aimY,r:65}:null;if(a)ring(c,a.x,a.y,a.r,'#f5aeb8','#cf78992a',true);else{c.save();c.strokeStyle='#e8a4ac';c.lineWidth=e.role==='rusher'?8:2;c.setLineDash([9,8]);c.beginPath();c.moveTo(e.x,e.y-25);c.lineTo(e.aimX,e.aimY-25);c.stroke();c.restore();}if(e.role==='shady')label(c,'순간이동 · 이 원에서 벗어나세요',e.aimX,e.aimY-98,15,'#f4c5e7');}
 }
 for(const q of r.pickups)drawPickup(c,g,q,images,reduced);
 if(r.type==='shop'){object(c,images,6,310,355,240,176);for(const s of r.stock){object(c,images,5,s.x,s.y+22,105,74);if(!s.sold){if(drawItem(c,images,s.id,s.x-25,s.y-48,50)){}else drawPickup(c,g,{...s,id:0,kind:s.id==='heal'?'heart':'key'},images,true);label(c,s.price+' 닢',s.x,s.y+38,16,'#ffe2a3');}else label(c,'품절',s.x,s.y,14,'#aec1ac');}}
 if(r.pedestal){const q=r.pedestal;object(c,images,5,q.x,q.y+25,135,90);if(!q.taken){const id=q.item&&!g.items.includes(q.item)?q.item:null;ring(c,q.x,q.y,32,'#edd68c66','#f5d67c13');if(id)drawItem(c,images,id,q.x-28,q.y-70+(reduced?0:Math.sin(g.time*2)*4),56);else label(c,'4 닢',q.x,q.y-23,22,'#f6d58d');label(c,id?ITEMS[id].name:'동전 4닢',q.x,q.y-86,16);if(Math.hypot(p.x-q.x,p.y-q.y)<145)label(c,'다가가면 자동 획득',q.x,q.y+77,13,'#ead99e');}}
 if(r.type==='challenge'&&r.challenge.state==='ready'){object(c,images,5,640,445,135,90);drawItem(c,images,'bell',605,355,70);label(c,'선택형 도전 · 두 무리',640,495,18,'#e0c3ee');}if(r.type==='challenge'&&r.challenge.state==='active')label(c,'도전 '+r.challenge.wave+' / 2',640,287,20,'#edd2f2');
 if(r.type==='boss'&&r.cleared&&(g.floorIndex===2||r.augment?.taken)){object(c,images,0,640,475,155,180);label(c,g.floorIndex<2?'F · 다음 층으로':'F · 탈출하기',640,500,20,'#ffe2a3');}
 const actors=[...r.obstacles.filter(o=>o.hp!==0).map(o=>({y:o.y+o.h,o})),...r.enemies.map(e=>({y:e.y,e})),{y:p.y,p:true}].sort((a,b)=>a.y-b.y);
 for(const a of actors){if(a.o){const o=a.o;if(o.kind==='gap'){c.fillStyle='#303548';c.strokeStyle='#b7a17c';c.lineWidth=7;c.beginPath();c.roundRect(o.x+2,o.y+2,o.w-4,o.h-4,6);c.fill();c.stroke();c.strokeStyle='#191b2a';c.lineWidth=4;c.stroke();continue;}if((o.kind==='shelf'||o.kind==='crystal')&&addition(c,images,o.kind==='shelf'?3:7,o.x+o.w/2,o.y+o.h,o.w+25,o.kind==='shelf'?100:120))continue;if(o.kind==='pot'){drawCrate(c,images,o);continue;}const key=o.kind==='pot'?'mushroom':o.kind,w=key==='log'?o.w+45:100;if(!drawPaintedProp(c,images,key,o.x+o.w/2,o.y+o.h,w)){circle(c,o.x+o.w/2,o.y+o.h/2,o.w/2,'#829470');}continue;}if(a.e){drawEnemy(c,g,a.e,images,reduced);continue;}
  c.save();c.translate(p.x,p.y);c.fillStyle='#19352a66';c.beginPath();c.ellipse(0,5,27,9,0,0,TAU);c.fill();if(p.invuln>0)ring(c,0,-20,42,'#ffe4ac99','#fff0b90a');c.save();c.scale(p.action?.facing||p.facing,1);c.translate(0,-22.4);drawButterMotion(c,images.butter,{size:80,gait:reduced?{phase:0,amount:0,clock:0}:p.gait,action:reduced?null:p.action,time:reduced?0:g.time});c.restore();c.restore();
 }
 if(hasItem(g,'komi')){const x=p.x+Math.cos(g.time*2.8)*72,y=p.y-22+Math.sin(g.time*2.8)*45;if(images.icons.komi?.naturalWidth)c.drawImage(images.icons.komi,x-20,y-20,40,40);}
 for(const b of g.bullets){if(b.kind==='boulder'){const im=images.boulder;ring(c,b.x,b.y,40,'#f7daa988','#ffe09d08');c.save();c.globalAlpha=Math.min(1,b.life/.5);c.translate(b.x,b.y);if(!reduced)c.rotate(b.age*4);if(im?.naturalWidth)c.drawImage(im,-50,-50,100,100);else fx(c,images.effects,'rock',0,0,74);c.restore();continue;}const a=Math.atan2(b.vy,b.vx);if(!reduced)fx(c,images.effects,'trace',b.x-b.vx*.025,b.y-b.vy*.025,b.kind==='chain'?34:24,a,.45);if(!fx(c,images.effects,b.kind==='chain'?'star':'rock',b.x,b.y,b.kind==='chain'?27:b.kind==='gun'?15:19,reduced?0:g.time*7))circle(c,b.x,b.y,7,'#f7e0b1');}
 for(const b of g.hostile){ring(c,b.x,b.y,b.radius+2,'#fff0d9','#d86a9b');circle(c,b.x-2,b.y-2,3,'#ffe5d8');}
 for(const e of g.effects){const t=e.age/e.life;c.save();c.globalAlpha=1-t;if(e.kind==='bolt'){c.strokeStyle='#e3f8ff';c.lineWidth=3;c.beginPath();c.moveTo(e.x,e.y);c.lineTo((e.x+e.x2)/2+10,(e.y+e.y2)/2-12);c.lineTo((e.x+e.x2)/2-8,(e.y+e.y2)/2+8);c.lineTo(e.x2,e.y2);c.stroke();}else if(e.kind==='pulse'||e.kind==='explosion'||e.kind==='slash'){ring(c,e.x,e.y,(e.radius||40)*(reduced?1:.4+t*.6),e.kind==='slash'?'#dec6f7':'#ffe1aa','#fff0d60a');}else if(e.kind==='clear')label(c,'방 정리 완료',e.x,e.y-20,25,'#f7dfa1');else{const id=e.kind==='muzzle'?'muzzle':e.kind==='defeat'?'dust':e.kind==='charge'?'ring':e.kind==='hurt'?'ring':'star';fx(c,images.effects,id,e.x,e.y,(e.kind==='defeat'?65:40)*(reduced?1:1+t*.5));}c.restore();}
 for(const n of g.numbers)label(c,String(n.value),n.x,n.y-(reduced?0:n.age*33),17,'#fff1ce');
 const aim=p.aim;if(g.phase==='playing'){const x=p.x+aim.x*95,y=p.y-45+aim.y*95;c.save();c.strokeStyle='#fff1bdad';c.lineWidth=2;c.beginPath();c.arc(x,y,6,0,TAU);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(x+dx*9,y+dy*9);c.lineTo(x+dx*14,y+dy*14);}c.stroke();c.restore();}
 const n=nearby(g);if(n&&g.phase==='playing')label(c,'F · '+n.text,n.x,n.y+85,16,'#ffe4b3');
 if(g.roomBanner>0){c.save();c.globalAlpha=Math.min(1,g.roomBanner);label(c,r.type==='boss'?FLOORS[g.floorIndex].bossName+'의 무대':ROOM_NAMES[r.type],640,265,26,'#f6e3b4');c.restore();}
 c.restore();
}
const hasItem=(g,id)=>g.items.includes(id);
