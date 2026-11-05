import {drawButterMotion} from './butter-gun-motion71.js';
import {STAGE_ART} from './platformer-art.js';
import {ELITE_ART} from './assets/trickcal-elites71/atlas.js';
import {EFFECT_REGIONS} from './dice-effects.js';
import {FLOOR,VIEW,DIRECTIONS,visibleRooms} from './dungeon73-world.js';
import {current,links,nearby,stats} from './dungeon73-engine.js';
import {ITEMS,ROOM_NAMES} from './dungeon73-content.js';
import {drawPaintedProp} from './survivor72-scenery.js';
const TAU=Math.PI*2;
const FEET=[[222.5,406],[222.5,406],[222.5,406],[222.5,406],[219.5,354],[223,369],[221,398],[226,390]];
export const ASSETS={room:'./assets/sanctuary73/room.webp',objects:'./assets/sanctuary73/objects.webp'};
export function viewport(width,height){const zoom=Math.min(width/VIEW.width,height/VIEW.height);return {zoom,x:(width-VIEW.width*zoom)/2,y:(height-VIEW.height*zoom)/2};}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function label(c,t,x,y,size=15,color='#fff1d5'){c.save();c.font=size+'px Jua70, sans-serif';c.textAlign='center';c.lineJoin='round';c.strokeStyle='#193a37df';c.lineWidth=5;c.strokeText(t,x,y);c.fillStyle=color;c.fillText(t,x,y);c.restore();}
function fx(c,im,key,x,y,size,angle=0,alpha=1){if(!im?.naturalWidth)return false;c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);c.drawImage(im,...EFFECT_REGIONS[key],-size/2,-size/2,size,size);c.restore();return true;}
export function object(c,images,index,x,y,width=120,height=width){const im=images.objects;if(!im?.naturalWidth)return false;const col=index%4,row=Math.floor(index/4),sx=Math.floor(col*im.naturalWidth/4),sy=Math.floor(row*im.naturalHeight/2),sw=Math.floor((col+1)*im.naturalWidth/4)-sx,sh=Math.floor((row+1)*im.naturalHeight/2)-sy;c.drawImage(im,sx,sy,sw,sh,x-FEET[index][0]*width/sw,y-FEET[index][1]*height/sh,width,height);return true;}
function ring(c,x,y,r,color,fill='#e8abb821',dashed=false){c.save();c.strokeStyle=color;c.fillStyle=fill;c.lineWidth=3;c.setLineDash(dashed?[7,7]:[]);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.stroke();c.restore();}
function drawDoor(c,g,l,images){const to=g.rooms[l.to],r=current(g),secret=to.type==='secret'&&!to.unlocked;
 let index=secret?7:!r.cleared?1:to.type==='treasure'&&!to.unlocked?2:to.type==='boss'&&!to.visited?3:0;
 c.save();const pos=l.dir==='n'?{x:640,y:205}:l.dir==='s'?{x:640,y:740}:l.dir==='w'?{x:104,y:475}:{x:1176,y:475};c.translate(pos.x,pos.y);
 // Door frame is one complete isolated sprite. Side doors keep a legible arch
 // rather than rotating its baked directional lighting and botanical ornament.
 const w=['e','w'].includes(l.dir)?135:155,h=['e','w'].includes(l.dir)?180:180;
 if(!object(c,images,index,0,0,w,h)){c.fillStyle=secret?'#60714f':index===0?'#162c35':'#685849';c.beginPath();c.roundRect(-w*.34,-h*.7,w*.68,h*.7,35);c.fill();}
 if(!secret&&r.cleared){const name=to.type==='treasure'&&!to.unlocked?'열쇠 1개':to.type==='boss'?'셰이디':to.visited?'지나온 길':to.type==='shop'?'잡화점':'미지의 방';label(c,name,0,13,13,to.type==='treasure'?'#f9d98f':'#ddedcf');}
 if(!secret&&!r.cleared){c.strokeStyle='#bf9565';c.lineWidth=5;c.beginPath();c.moveTo(-w*.25,-h*.55);c.lineTo(w*.25,-h*.25);c.moveTo(w*.25,-h*.55);c.lineTo(-w*.25,-h*.25);c.stroke();}c.restore();
}
function drawEnemy(c,g,e,images,reduced){c.save();c.translate(e.x,e.y);c.fillStyle='#14292366';c.beginPath();c.ellipse(0,5,e.radius*1.2,9,0,0,TAU);c.fill();
 if(e.appear>0){ring(c,0,0,28,'#c9b1e9','#be94d828');c.restore();return;}
 const facing=g.player.x>e.x?-1:1;let art,key,clip,im,index,scale;
 if(e.role==='shady'){
  art=ELITE_ART.heroes.shady;key=e.action?'skill':'walk';let t=e.age;
  if(e.action){const a=e.action.time;if(a<1.05)t=a/1.05*1.966667;else{key='strike';t=a<2.25?.4+(a-1.05)/1.2*.833333:1.233333+(a-2.25)/1.3*.433334;}}
  clip=art.clips[key];im=images.elites?.shady?.[key]||images.elites?.shady?.idle;index=clip.loop?Math.floor(t%clip.duration/clip.duration*clip.count):Math.min(clip.count-1,Math.round(t/clip.duration*(clip.count-1)));scale=1.2;
 }else{art=STAGE_ART.monsters[e.role];key=['tell','recover','dash'].includes(e.state)?'attack':'walk';clip=art.clips[key];im=images.monsters[e.role]?.[key];index=reduced?0:clip.loop?Math.floor(e.age%clip.duration/clip.duration*clip.count):Math.min(clip.count-1,Math.floor((e.attackClock||0)/(e.role==='rusher'?2.22:e.role==='fan'?1.45:1.8)*clip.count));scale=e.role==='rusher'?.45:e.role==='caster'?.4:.43;}
 if(e.role==='shady'&&!im?.naturalWidth&&images.elites?.shady?.idle?.naturalWidth){im=images.elites.shady.idle;clip=ELITE_ART.heroes.shady.clips.idle;index=0;}if(reduced)index=0;c.save();c.scale(facing,1);if(im?.naturalWidth){if(im===images.elites?.shady?.idle&&key!=='idle'){clip=ELITE_ART.heroes.shady.clips.idle;index=0;}c.drawImage(im,index%clip.columns*clip.width,Math.floor(index/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);}else circle(c,0,-22,e.radius,e.role==='shady'?'#ac87cc':'#c8ae9f');c.restore();
 if(e.flash>0&&!reduced)ring(c,0,-25,e.radius+6,'#fff3bf','#fff2be12');if(e.hp<e.maxHp&&e.role!=='shady'){c.fillStyle='#142c2b';c.fillRect(-26,-74,52,5);c.fillStyle='#edc291';c.fillRect(-26,-74,52*e.hp/e.maxHp,5);}c.restore();}
function drawPickup(c,g,q,images,reduced){const t=reduced?0:Math.sin(g.time*3+q.id)*3;c.save();c.translate(q.x,q.y+t);c.fillStyle='#253d3044';c.beginPath();c.ellipse(0,9,13,4,0,0,TAU);c.fill();c.strokeStyle='#6a4e3b';c.lineWidth=2;
 if(q.kind==='coin'){circle(c,0,0,11,'#f1c76e');c.stroke();circle(c,0,0,7,'#dfaa46');c.strokeStyle='#fff0b5';c.beginPath();c.moveTo(0,-5);c.lineTo(0,5);c.stroke();}
 if(q.kind==='key'){c.strokeStyle='#ffe1a2';c.lineWidth=5;c.beginPath();c.arc(-5,-5,6,0,TAU);c.moveTo(0,0);c.lineTo(10,10);c.lineTo(14,6);c.moveTo(6,6);c.lineTo(10,2);c.stroke();}
 if(q.kind==='bomb'){circle(c,0,2,11,'#58615e');c.stroke();c.strokeStyle='#e2be77';c.lineWidth=3;c.beginPath();c.moveTo(2,-8);c.quadraticCurveTo(10,-15,6,-17);c.stroke();circle(c,6,-17,3,'#ffdf9c');}
 if(q.kind==='heart'){c.fillStyle='#ea9aa8';c.beginPath();c.moveTo(0,11);c.bezierCurveTo(-26,-3,-8,-20,0,-9);c.bezierCurveTo(8,-20,26,-3,0,11);c.fill();c.stroke();}c.restore();}
export function drawMinimap(c,g,width=160,height=110,full=false){c.clearRect(0,0,width,height);const rs=visibleRooms(g),xs=rs.map(r=>r.x),ys=rs.map(r=>r.y),minX=Math.min(...xs),minY=Math.min(...ys),cols=Math.max(...xs)-minX+1,rows=Math.max(...ys)-minY+1,size=Math.min(full?55:25,(width-16)/cols,(height-16)/rows),ox=(width-cols*size)/2,oy=(height-rows*size)/2;
 for(const r of rs){const x=ox+(r.x-minX)*size,y=oy+(r.y-minY)*size;c.fillStyle=r.id===g.room?'#f4d893':r.visited?'#8eaf9c':'#5b777044';c.strokeStyle=r.id===g.room?'#fff2c7':'#b2c3a166';c.lineWidth=r.id===g.room?2:1;c.beginPath();c.roundRect(x+3,y+3,size-6,size-6,3);c.fill();c.stroke();if(r.visited||r.type!=='combat'){c.font=(size*.4)+'px Jua70,sans-serif';c.textAlign='center';c.fillStyle=r.id===g.room?'#604a3d':'#e2dec7';c.fillText({start:'⌂',treasure:'◆',shop:'$',secret:'?',boss:'☾',combat:r.cleared?'·':''}[r.type],x+size/2,y+size*.66);}}
}
export function render(c,g,images,{width,height,reduced=false}={}){
 c.clearRect(0,0,width,height);c.fillStyle='#142b2c';c.fillRect(0,0,width,height);const v=viewport(width,height);c.save();c.translate(v.x,v.y);c.scale(v.zoom,v.zoom);
 if(images.room?.naturalWidth)c.drawImage(images.room,0,0,VIEW.width,VIEW.height);else{c.fillStyle='#445e4e';c.fillRect(75,150,1130,560);c.strokeStyle='#8b9874';c.lineWidth=34;c.strokeRect(90,165,1100,540);}
 const r=current(g),p=g.player;
 if(r.type==='treasure'||r.type==='shop'||r.type==='secret'){const gradient=c.createRadialGradient(640,420,20,640,420,350);gradient.addColorStop(0,r.type==='secret'?'#bd8de526':'#fff2bd27');gradient.addColorStop(1,'#fff0b000');c.fillStyle=gradient;c.fillRect(180,230,920,430);}
 for(const l of links(g))drawDoor(c,g,l,images);
 for(const z of g.zones){if(z.kind==='fire'){ring(c,z.x,z.y,z.radius,'#e2a76888','#eaa2563b');if(!reduced)for(let i=0;i<3;i++)fx(c,images.effects,'flare',z.x+Math.cos(i*2)*15,z.y+Math.sin(i*2)*15,16);}if(z.kind==='danger')ring(c,z.x,z.y,z.radius,z.triggered?'#f0a5ab':'#f3c4b2',z.triggered?'#e0658055':'#eeb7c422',!z.triggered);if(z.kind==='bomb')drawPickup(c,g,{...z,id:0,kind:'bomb'},images,reduced);}
 for(const e of r.enemies)if(e.state==='tell'){const a=e.role==='shady'?{x:e.aimX,y:e.aimY,r:82}:e.role==='caster'?{x:e.aimX,y:e.aimY,r:65}:null;if(a)ring(c,a.x,a.y,a.r,'#f5aeb8','#cf78992a',true);else{c.save();c.strokeStyle='#e8a4ac';c.lineWidth=e.role==='rusher'?8:2;c.setLineDash([9,8]);c.beginPath();c.moveTo(e.x,e.y-25);c.lineTo(e.aimX,e.aimY-25);c.stroke();c.restore();}if(e.role==='shady')label(c,'순간이동 · 이 원에서 벗어나세요',e.aimX,e.aimY-98,15,'#f4c5e7');}
 for(const q of r.pickups)drawPickup(c,g,q,images,reduced);
 if(r.type==='shop'){object(c,images,6,310,355,240,176);for(const s of r.stock){object(c,images,5,s.x,s.y+22,105,74);if(!s.sold){if(images.icons[s.id]?.naturalWidth)c.drawImage(images.icons[s.id],s.x-25,s.y-48,50,50);else drawPickup(c,g,{...s,id:0,kind:s.id==='heal'?'heart':'key'},images,true);label(c,s.price+' 닢',s.x,s.y+38,16,'#ffe2a3');}else label(c,'품절',s.x,s.y,14,'#aec1ac');}}
 if(r.pedestal){const q=r.pedestal;object(c,images,5,q.x,q.y+25,135,90);if(!q.taken){const id=q.offers[0];ring(c,q.x,q.y-12,39,'#edd68c66','#f5d67c13');if(images.icons[id]?.naturalWidth)c.drawImage(images.icons[id],q.x-32,q.y-58+(reduced?0:Math.sin(g.time*2)*4),64,64);label(c,'세 가지 선물 중 하나',q.x,q.y+58,15);}}
 if(r.type==='boss'&&r.cleared){object(c,images,0,640,475,155,180);label(c,'F · 탈출하기',640,500,20,'#ffe2a3');}
 const actors=[...r.obstacles.filter(o=>o.hp!==0).map(o=>({y:o.y+o.h,o})),...r.enemies.map(e=>({y:e.y,e})),{y:p.y,p:true}].sort((a,b)=>a.y-b.y);
 for(const a of actors){if(a.o){const o=a.o;if(o.kind==='pot'&&object(c,images,4,o.x+o.w/2,o.y+o.h,82,82))continue;const key=o.kind==='pot'?'mushroom':o.kind,w=key==='log'?o.w+45:100;if(!drawPaintedProp(c,images,key,o.x+o.w/2,o.y+o.h,w)){circle(c,o.x+o.w/2,o.y+o.h/2,o.w/2,'#829470');}continue;}if(a.e){drawEnemy(c,g,a.e,images,reduced);continue;}
  c.save();c.translate(p.x,p.y);c.fillStyle='#19352a66';c.beginPath();c.ellipse(0,5,27,9,0,0,TAU);c.fill();if(p.invuln>0)ring(c,0,-20,42,'#ffe4ac99','#fff0b90a');c.save();c.scale(p.action?.facing||p.facing,1);c.translate(0,-22.4);drawButterMotion(c,images.butter,{size:80,gait:reduced?{phase:0,amount:0,clock:0}:p.gait,action:reduced?null:p.action,time:reduced?0:g.time});c.restore();c.restore();
 }
 if(hasItem(g,'komi')){const x=p.x+Math.cos(g.time*2.8)*72,y=p.y-22+Math.sin(g.time*2.8)*45;if(images.icons.komi?.naturalWidth)c.drawImage(images.icons.komi,x-20,y-20,40,40);}
 for(const b of g.bullets){if(b.kind==='boulder'){const im=images.boulder;ring(c,b.x,b.y,40,'#f7daa988','#ffe09d08');c.save();c.globalAlpha=Math.min(1,b.life/.5);c.translate(b.x,b.y);if(!reduced)c.rotate(b.age*4);if(im?.naturalWidth)c.drawImage(im,-50,-50,100,100);else fx(c,images.effects,'rock',0,0,74);c.restore();continue;}const a=Math.atan2(b.vy,b.vx);if(!reduced)fx(c,images.effects,'trace',b.x-b.vx*.025,b.y-b.vy*.025,b.kind==='chain'?34:24,a,.45);if(!fx(c,images.effects,b.kind==='chain'?'star':'rock',b.x,b.y,b.kind==='chain'?27:b.kind==='gun'?15:19,reduced?0:g.time*7))circle(c,b.x,b.y,7,'#f7e0b1');}
 for(const b of g.hostile){ring(c,b.x,b.y,b.radius+2,'#fff0d9','#d86a9b');circle(c,b.x-2,b.y-2,3,'#ffe5d8');}
 for(const e of g.effects){const t=e.age/e.life;c.save();c.globalAlpha=1-t;if(e.kind==='bolt'){c.strokeStyle='#e3f8ff';c.lineWidth=3;c.beginPath();c.moveTo(e.x,e.y);c.lineTo((e.x+e.x2)/2+10,(e.y+e.y2)/2-12);c.lineTo((e.x+e.x2)/2-8,(e.y+e.y2)/2+8);c.lineTo(e.x2,e.y2);c.stroke();}else if(e.kind==='pulse'||e.kind==='explosion'||e.kind==='slash'){ring(c,e.x,e.y,(e.radius||40)*(reduced?1:.4+t*.6),e.kind==='slash'?'#dec6f7':'#ffe1aa','#fff0d60a');}else if(e.kind==='clear')label(c,'방 정리 완료',e.x,e.y-20,25,'#f7dfa1');else{const id=e.kind==='muzzle'?'muzzle':e.kind==='defeat'?'dust':e.kind==='charge'?'ring':e.kind==='hurt'?'ring':'star';fx(c,images.effects,id,e.x,e.y,(e.kind==='defeat'?65:40)*(reduced?1:1+t*.5));}c.restore();}
 for(const n of g.numbers)label(c,String(n.value),n.x,n.y-(reduced?0:n.age*33),17,'#fff1ce');
 const aim=p.aim;if(g.phase==='playing'){const x=p.x+aim.x*95,y=p.y-45+aim.y*95;c.save();c.strokeStyle='#fff1bdad';c.lineWidth=2;c.beginPath();c.arc(x,y,6,0,TAU);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(x+dx*9,y+dy*9);c.lineTo(x+dx*14,y+dy*14);}c.stroke();c.restore();}
 const n=nearby(g);if(n&&g.phase==='playing')label(c,'F · '+n.text,n.x,n.y+85,16,'#ffe4b3');
 if(g.roomBanner>0){c.save();c.globalAlpha=Math.min(1,g.roomBanner);label(c,ROOM_NAMES[r.type],640,265,26,'#f6e3b4');c.restore();}
 c.restore();
}
const hasItem=(g,id)=>g.items.includes(id);
