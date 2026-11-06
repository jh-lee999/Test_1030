import {cachedContext,cachedLabel} from './dungeon85-cache.js';
import {doorState,drawOpenings} from './dungeon85-doors.js';
function drawPit(c,o,level){
 const rim=['#8d9960','#947b69','#837d9e'][level],edge=['#52663e','#685047','#57536c'][level];
 c.fillStyle='#0a20234d';c.beginPath();c.roundRect(o.x-3,o.y+4,o.w+6,o.h+3,10);c.fill();
 c.fillStyle=rim;c.beginPath();c.roundRect(o.x,o.y,o.w,o.h,8);c.fill();
 c.fillStyle=edge;c.beginPath();c.roundRect(o.x+3,o.y+3,o.w-6,o.h-6,6);c.fill();
 const dark=c.createLinearGradient(0,o.y,0,o.y+o.h);dark.addColorStop(0,'#0a2023');dark.addColorStop(1,'#203831');c.fillStyle=dark;c.beginPath();c.roundRect(o.x+6,o.y+10,o.w-12,o.h-16,4);c.fill();
 c.strokeStyle='#d5d7a14d';c.lineWidth=2;c.beginPath();c.moveTo(o.x+10,o.y+3);c.lineTo(o.x+o.w*.48,o.y+3);c.moveTo(o.x+o.w-3,o.y+o.h*.35);c.lineTo(o.x+o.w-3,o.y+o.h-12);c.stroke();
 c.strokeStyle=edge;c.lineWidth=3;for(const t of [.25,.74]){c.beginPath();c.moveTo(o.x+o.w*t,o.y);c.lineTo(o.x+o.w*t-3,o.y+8);c.moveTo(o.x+o.w*(1-t),o.y+o.h);c.lineTo(o.x+o.w*(1-t)+3,o.y+o.h-7);c.stroke();}
}
import {roomMemory,knownRoute} from './dungeon84-exploration.js';
import {shotBounds} from './dungeon84-collision.js';
import {viewFor,doorsFor} from './dungeon84-world.js';
import {ROUTES,CURSES} from './dungeon84-content.js';
import {availableArtifacts} from './dungeon84-loot.js';
import {drawCastHints,drawGroundThreat,enemyFacing} from './dungeon80-hints.js';
import {CRATE} from './assets/sanctuary75/atlas.js';
import {drawButterMotion} from './butter-gun-motion71.js';
import {STAGE_ART} from './platformer-art.js';
import {ELITE_ART} from './assets/trickcal-elites71/atlas.js';
import {EFFECT_REGIONS} from './dice-effects.js';
import {FLOOR,VIEW,DIRECTIONS,visibleRooms} from './dungeon84-world.js';
import {current,links,nearby,stats,shopPrice} from './dungeon84-engine.js';
import {ITEMS,ROOM_NAMES,FLOORS,rarityOf} from './dungeon84-content.js';
import {drawPaintedProp} from './survivor72-scenery.js';
import {bossFrameTime} from './dungeon80-bosses.js';
import {biomeView} from './dungeon84-biome.js';
import {drawVelvet} from './dungeon76-hero.js';
import {hurtPoint,PLAYER_HURT_RADIUS} from './dungeon84-build.js';
import {OBJECTS76} from './assets/sanctuary76/atlas.js';
const TAU=Math.PI*2;
const FEET=[[222.5,406],[222.5,406],[222.5,406],[222.5,406],[219.5,354],[223,369],[221,398],[226,390]];
export const ASSETS={itemIcons:'./assets/items77/icons.svg',extras:'./assets/sanctuary76/objects.webp',room:'./assets/sanctuary73/room.webp',objects:'./assets/sanctuary73/objects.webp',library:'./assets/sanctuary74/library.webp',moon:'./assets/sanctuary74/moon.webp',additions:'./assets/sanctuary74/objects.webp',crate:'./assets/sanctuary75/crate.webp'};
export function viewport(width,height,g){const view=g?viewFor(g.rooms[g.room]):VIEW,zoom=Math.min(width/view.width,height/view.height);return {zoom,x:(width-view.width*zoom)/2,y:(height-view.height*zoom)/2};}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function label(c,t,x,y,size=15,color='#fff1d5'){if(cachedLabel(c,t,x,y,size,color))return;c.save();c.font=size+'px Jua70, sans-serif';c.textAlign='center';c.lineJoin='round';c.strokeStyle='#193a37df';c.lineWidth=5;c.strokeText(t,x,y);c.fillStyle=color;c.fillText(t,x,y);c.restore();}
function fx(c,im,key,x,y,size,angle=0,alpha=1){if(!im?.naturalWidth)return false;c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);c.drawImage(im,...EFFECT_REGIONS[key],-size/2,-size/2,size,size);c.restore();return true;}
export function object(c,images,index,x,y,width=120,height=width){const im=images.objects;if(!im?.naturalWidth)return false;const col=index%4,row=Math.floor(index/4),sx=Math.floor(col*im.naturalWidth/4),sy=Math.floor(row*im.naturalHeight/2),sw=Math.floor((col+1)*im.naturalWidth/4)-sx,sh=Math.floor((row+1)*im.naturalHeight/2)-sy;c.drawImage(im,sx,sy,sw,sh,x-FEET[index][0]*width/sw,y-FEET[index][1]*height/sh,width,height);return true;}
const NEW_FEET=[[183,335],[182.5,335],[182,335],[180.5,328],[182,333],[182,333],[182,333],[180.5,321],[181.5,332],[180.5,259],[178.5,308],[180.5,312]];
export function addition(c,images,index,x,y,width=120,height=width){const im=images.additions;if(!im?.naturalWidth)return false;const sw=im.naturalWidth/4,sh=im.naturalHeight/3,f=NEW_FEET[index];c.drawImage(im,index%4*sw,Math.floor(index/4)*sh,sw,sh,x-f[0]*width/sw,y-f[1]*height/sh,width,height);return true;}
export function drawCrate(c,images,o){
 const im=images.crate,w=(o.w+8)*CRATE.width/(CRATE.bounds[2]-CRATE.bounds[0]),z=w/CRATE.width,x=o.x+o.w/2,y=o.y+o.h;
 if(im?.naturalWidth){c.drawImage(im,x-CRATE.foot[0]*z,y-CRATE.foot[1]*z,CRATE.width*z,CRATE.height*z);return;}
 // Nonblocking fallback is still a plain nailed wooden box, never a gold chest.
 const box=shotBounds(o);c.fillStyle='#a66e40';c.strokeStyle='#573c2b';c.lineWidth=3;c.fillRect(box.left,box.top,box.right-box.left,box.bottom-box.top);c.strokeRect(box.left,box.top,box.right-box.left,box.bottom-box.top);
 c.beginPath();c.moveTo(box.left+6,box.top+6);c.lineTo(box.right-6,box.bottom-6);c.moveTo(box.right-6,box.top+6);c.lineTo(box.left+6,box.bottom-6);c.stroke();
}
export function drawItem(c,images,id,x,y,size){const d=ITEMS[id];if(!d)return false;if(d.icon77!==undefined){const im=images.itemIcons;if(!im?.naturalWidth)return false;c.drawImage(im,d.icon77%6*96,Math.floor(d.icon77/6)*96,96,96,x,y,size,size);return true;}if(d.icon76!==undefined){const im=images.extras;if(!im?.naturalWidth)return false;const w=im.naturalWidth/4,h=im.naturalHeight/3;c.drawImage(im,d.icon76%4*w,Math.floor(d.icon76/4)*h,w,h,x,y,size,size);return true;}if(d.fan!==undefined){const im=images.additions;if(!im?.naturalWidth)return false;const sw=im.naturalWidth/4,sh=im.naturalHeight/3;c.drawImage(im,d.fan%4*sw,Math.floor(d.fan/4)*sh,sw,sh,x,y,size,size);return true;}const im=images.icons[id];if(!im?.naturalWidth)return false;c.drawImage(im,x,y,size,size);return true;}
function doorObject(c,g,images,index,x,y,w,h){if(!g.floorIndex)return object(c,images,index,x,y,w,h);if(index===7){c.fillStyle=g.floorIndex===1?'#775239':'#4c4260';c.strokeStyle='#d6be9c66';c.lineWidth=2;c.beginPath();c.roundRect(x-w*.42,y-h*.8,w*.84,h*.8,13);c.fill();c.stroke();c.strokeStyle='#1a1c2a';c.lineWidth=2;c.beginPath();c.moveTo(x-13,y-h*.7);c.lineTo(x+8,y-h*.5);c.lineTo(x-3,y-h*.3);c.lineTo(x+14,y-h*.1);c.stroke();return true;}return addition(c,images,(g.floorIndex===1?0:4)+(index===0?0:index===2?2:1),x,y,w,h);}
function terrain(c,g){const r=current(g);for(const t of r.terrain){c.save();c.fillStyle=g.floorIndex===0?'#294c4288':g.floorIndex===1?'#bd7c3b88':'#6d68a388';c.strokeStyle=g.floorIndex===0?'#9aaa6f88':g.floorIndex===1?'#e0b76a88':'#c5bbe888';c.lineWidth=2;c.beginPath();c.roundRect(t.x,t.y,t.w,t.h,17);c.fill();c.stroke();c.strokeStyle='#d5ddb24d';for(let i=0;i<5;i++){const x=t.x+12+(i*.19*t.w),y=t.y+t.h*.5+Math.sin(i*2)*t.h*.2;c.beginPath();c.ellipse(x,y,6,2.5,.2,0,TAU);c.stroke();}c.restore();} }
function ring(c,x,y,r,color,fill='#e8abb821',dashed=false){c.save();c.strokeStyle=color;c.fillStyle=fill;c.lineWidth=3;c.setLineDash(dashed?[7,7]:[]);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.stroke();c.restore();}
function drawDoor(c,g,l,images,routeDir){const to=g.rooms[l.to],r=current(g),{secret,index}=doorState(g,l);
 c.save();const d=doorsFor(r)[l.dir],pos={x:d.x+(l.dir==='w'?-26:l.dir==='e'?26:0),y:d.y+(l.dir==='s'?60:['w','e'].includes(l.dir)?33:0)};c.translate(pos.x,pos.y);
 // Door frame is one complete isolated sprite. Side doors keep a legible arch
 // rather than rotating its baked directional lighting and botanical ornament.
 const w=['e','w'].includes(l.dir)?135:155,h=['e','w'].includes(l.dir)?180:180;
 if(!doorObject(c,g,images,index,0,0,w,h)){c.fillStyle=secret?'#60714f':index===0?'#162c35':'#685849';c.beginPath();c.roundRect(-w*.34,-h*.7,w*.68,h*.7,35);c.fill();}
 if(!secret&&r.cleared){const name=to.type==='treasure'&&!to.unlocked?(g.keys?'열쇠 1개':'열쇠 없음'):to.type==='boss'?(to.visited&&to.bossRole?({velvet:'벨벳',erpin:'에르핀',shady:'셰이디'})[to.bossRole]+'의 무대':'수호자의 무대'):to.type==='challenge'?'도전 · 선택':['angel','devil'].includes(to.type)?ROOM_NAMES[to.type]:to.visited?'지나온 길':to.type==='shop'?'잡화점':'미지의 방';label(c,name,0,13,13,to.type==='treasure'?'#f9d98f':'#ddedcf');}
 if(!secret&&!r.cleared){c.strokeStyle='#bf9565';c.lineWidth=5;c.beginPath();c.moveTo(-w*.25,-h*.55);c.lineTo(w*.25,-h*.25);c.moveTo(w*.25,-h*.55);c.lineTo(-w*.25,-h*.25);c.stroke();}if(routeDir===l.dir&&r.cleared)ring(c,0,-h*.36,49,'#ffe5a3','#f8d57716');c.restore();
}
function drawEnemy(c,g,e,images,reduced){
 c.save();c.translate(e.x,e.y);c.fillStyle='#14292366';c.beginPath();c.ellipse(0,5,e.radius*1.2,9,0,0,TAU);c.fill();
 if(e.appear>0||(e.hiddenUntil||0)>g.time){ring(c,0,0,28,'#c9b1e9','#be94d828');c.restore();return;}
 const facing=enemyFacing(g,e);let art,key,clip,im,index,scale;
 if(e.boss){
  art=ELITE_ART.heroes[e.role];const frame=bossFrameTime(e);key=frame.key;const t=frame.time;
  clip=art.clips[key];im=images.elites?.[e.role]?.[key];index=clip.loop?Math.floor(t%clip.duration/clip.duration*clip.count):Math.max(0,Math.min(clip.count-1,Math.round(t/clip.duration*(clip.count-1))));scale=1.2;
  if(!im?.naturalWidth&&images.elites?.[e.role]?.idle?.naturalWidth){im=images.elites[e.role].idle;clip=art.clips.idle;index=0;}
 }else{art=STAGE_ART.monsters[e.role];key=['tell','recover','dash'].includes(e.state)?'attack':'walk';clip=art.clips[key];im=images.monsters[e.role]?.[key];index=reduced?0:clip.loop?Math.floor(e.age%clip.duration/clip.duration*clip.count):Math.min(clip.count-1,Math.floor((e.attackClock||0)/(e.role==='rusher'?2.22:e.role==='fan'?1.45:1.8)*clip.count));scale=e.role==='rusher'?.45:e.role==='caster'?.4:.43;}
 if(reduced)index=0;c.save();c.scale(facing,1);if(im?.naturalWidth)c.drawImage(im,index%clip.columns*clip.width,Math.floor(index/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);else circle(c,0,-22,e.radius,e.boss?'#ac87cc':'#c8ae9f');c.restore();
 if((e.freezeUntil||0)>g.time){ring(c,0,-26,e.radius+10,'#bde7ff','#a5dbe02b');label(c,'❄',0,-70,15,'#d8f2ff');}
 if(e.affix)label(c,({bulwark:'장갑',swift:'신속',summoner:'소환',mirror:'반사'})[e.affix],0,-155,14,'#e6c5ed');else if(e.ai&&e.ai!=='normal')label(c,({turret:'포대',orbit:'선회',burrow:'매복',blink:'전이',summoner:'소환'})[e.ai],0,-90,12,'#d8d2b6');
 if(e.flash>0&&!reduced)ring(c,0,-25,e.radius+6,'#fff3bf','#fff2be12');if(e.hp<e.maxHp&&!e.boss){c.fillStyle='#142c2b';c.fillRect(-26,-74,52,5);c.fillStyle='#edc291';c.fillRect(-26,-74,52*e.hp/e.maxHp,5);}c.restore();
}
function drawPickup(c,g,q,images,reduced){const t=reduced?0:Math.sin(g.time*3+q.id)*3;c.save();c.translate(q.x,q.y+t);c.fillStyle='#253d3044';c.beginPath();c.ellipse(0,9,13,4,0,0,TAU);c.fill();c.strokeStyle='#6a4e3b';c.lineWidth=2;
 if(q.kind==='coin'){circle(c,0,0,11,'#f1c76e');c.stroke();circle(c,0,0,7,'#dfaa46');c.strokeStyle='#fff0b5';c.beginPath();c.moveTo(0,-5);c.lineTo(0,5);c.stroke();}
 if(q.kind==='key'){c.strokeStyle='#ffe1a2';c.lineWidth=5;c.beginPath();c.arc(-5,-5,6,0,TAU);c.moveTo(0,0);c.lineTo(10,10);c.lineTo(14,6);c.moveTo(6,6);c.lineTo(10,2);c.stroke();}
 if(q.kind==='bomb'){circle(c,0,2,11,'#58615e');c.stroke();c.strokeStyle='#e2be77';c.lineWidth=3;c.beginPath();c.moveTo(2,-8);c.quadraticCurveTo(10,-15,6,-17);c.stroke();circle(c,6,-17,3,'#ffdf9c');}
 if(q.kind==='heart'){c.fillStyle='#ea9aa8';c.beginPath();c.moveTo(0,11);c.bezierCurveTo(-26,-3,-8,-20,0,-9);c.bezierCurveTo(8,-20,26,-3,0,11);c.fill();c.stroke();}c.restore();}
const minimaps=new WeakMap();
export function drawMinimap(c,g,width=160,height=110,full=false,target=null){const rs=visibleRooms(g),key=[width,height,c.canvas.width,c.canvas.height,full,g.room,target,typeof document==='undefined'?'':document.fonts?.status,rs.map(r=>[r.id,r.x,r.y,r.type,r.visited,r.cleared,roomMemory(g,r).map(f=>f.text).join(',')].join(':')).join('|')].join(';');if(minimaps.get(c)===key)return;minimaps.set(c,key);c.clearRect(0,0,width,height);const xs=rs.map(r=>r.x),ys=rs.map(r=>r.y),minX=Math.min(...xs),minY=Math.min(...ys),cols=Math.max(...xs)-minX+1,rows=Math.max(...ys)-minY+1,size=Math.min(full?55:25,(width-16)/cols,(height-16)/rows),ox=(width-cols*size)/2,oy=(height-rows*size)/2;
 const route=target===null?null:knownRoute(g,target);if(route?.length){c.strokeStyle='#f5d38a99';c.lineWidth=full?3:1.5;c.beginPath();for(const [i,l]of route.entries()){const a=g.rooms[l.from],b=g.rooms[l.to],ax=ox+(a.x-minX+.5)*size,ay=oy+(a.y-minY+.5)*size,bx=ox+(b.x-minX+.5)*size,by=oy+(b.y-minY+.5)*size;if(!i)c.moveTo(ax,ay);c.lineTo(bx,by);}c.stroke();}
 for(const r of rs){const x=ox+(r.x-minX)*size,y=oy+(r.y-minY)*size;c.fillStyle=r.id===g.room?'#f4d893':r.visited?'#8eaf9c':'#5b777044';c.strokeStyle=r.id===g.room?'#fff2c7':'#b2c3a166';c.lineWidth=r.id===g.room?2:1;c.beginPath();c.roundRect(x+3,y+3,size-6,size-6,3);c.fill();c.stroke();if(r.id===target){c.strokeStyle='#f4cf79';c.lineWidth=2;c.strokeRect(x+1,y+1,size-2,size-2);}if(roomMemory(g,r).length){c.fillStyle='#f4cf79';c.beginPath();c.arc(x+size-4,y+4,full?4:2.5,0,TAU);c.fill();}if(r.visited||r.type!=='combat'){c.font=(size*.4)+'px Jua70,sans-serif';c.textAlign='center';c.fillStyle=r.id===g.room?'#604a3d':'#e2dec7';c.fillText({start:'⌂',treasure:'◆',shop:'$',secret:'?',supersecret:'??',puzzle:'◇',forge:'♧',angel:'✦',devil:'⇄',boss:'☾',challenge:'!',sanctuary:'♥',bargain:'⇄',rush:'⌛',archive:'◇',combat:r.cleared?'·':''}[r.type],x+size/2,y+size*.66);}}
}
export function render(c,g,images,{width,height,reduced=false,routeDir=null}={}){
 c=cachedContext(c);
 c.clearRect(0,0,width,height);c.fillStyle='#142b2c';c.fillRect(0,0,width,height);const v=viewport(width,height,g);c.save();c.translate(v.x,v.y);c.scale(v.zoom,v.zoom);
 drawBase(c,g,images);
 drawOpenings(c,g,images[FLOORS[g.floorIndex].id]||images.room);
 const r=current(g),p=g.player;
 for(const l of links(g))drawDoor(c,g,l,images,routeDir);
 for(const z of g.zones){if(z.kind==='fire'){ring(c,z.x,z.y,z.radius,'#e2a76888','#eaa2563b');if(!reduced)for(let i=0;i<3;i++)fx(c,images.effects,'flare',z.x+Math.cos(i*2)*15,z.y+Math.sin(i*2)*15,16);}if(z.kind==='danger')drawGroundThreat(c,z);if(z.kind==='bomb'){ring(c,z.x,z.y,z.radius,'#e7b79788','#e6a3780b',true);drawPickup(c,g,{...z,id:0,kind:'bomb'},images,reduced);}}
 for(const q of r.pickups)drawPickup(c,g,q,images,reduced);
 if(r.type==='shop'){object(c,images,6,310,355,240,176);for(const s of r.stock){object(c,images,5,s.x,s.y+22,105,74);if(!s.sold){if(drawItem(c,images,s.id,s.x-25,s.y-48,50)){}else drawPickup(c,g,{...s,id:0,kind:s.id==='heal'?'heart':'key'},images,true);label(c,shopPrice(g,s)+' 닢'+(ITEMS[s.id]?' · '+rarityOf(s.id).name+(ITEMS[s.id].troll?' 주의':''):''),s.x,s.y+38,16,'#ffe2a3');}else label(c,'품절',s.x,s.y,14,'#aec1ac');}}
 for(const chest of r.chests){if(chest.opened){label(c,'열린 황금상자',chest.x,chest.y+12,13,'#b6b798');continue;}if(!object(c,images,4,chest.x,chest.y+22,112,94)){c.fillStyle='#ba9447';c.strokeStyle='#f8d892';c.lineWidth=4;c.beginPath();c.roundRect(chest.x-37,chest.y-36,74,56,10);c.fill();c.stroke();label(c,'♢',chest.x,chest.y,22,'#fff0c2');}label(c,r.cleared?'황금상자 · F / 열쇠 1':'황금상자 · 전투 후 개방',chest.x,chest.y-65,14,'#f4d48c');}
 for(const q of availableArtifacts(g)){if(q===r.pedestal)object(c,images,5,q.x,q.y+25,135,90);{const id=q.item&&!g.items.includes(q.item)?q.item:null;ring(c,q.x,q.y,32,id?rarityOf(id).color:'#edd68c66',id&&ITEMS[id].troll?'#dc94892a':'#f5d67c13');if(id)drawItem(c,images,id,q.x-28,q.y-70+(reduced?0:Math.sin(g.time*2)*4),56);else label(c,'4 닢',q.x,q.y-23,22,'#f6d58d');label(c,id?'['+rarityOf(id).name+(ITEMS[id].troll?' · 트롤':'')+'] '+ITEMS[id].name:'동전 4닢',q.x,q.y-86,16,id?rarityOf(id).color:'#fff1d5');if(Math.hypot(p.x-q.x,p.y-q.y)<145)label(c,id&&ITEMS[id].active&&g.active?'F · 액티브 교체':'다가가면 자동 획득',q.x,q.y+77,13,'#ead99e');}}
 if(r.type==='challenge'&&r.challenge.state==='ready'){object(c,images,5,640,445,135,90);drawItem(c,images,'bell',605,355,70);label(c,'선택형 도전 · 두 무리',640,495,18,'#e0c3ee');}if(r.type==='challenge'&&r.challenge.state==='active')label(c,'도전 '+r.challenge.wave+' / 2',640,287,20,'#edd2f2');
 if(r.type==='boss'&&r.cleared&&!r.pedestal?.taken)label(c,'보스 유물 발견 · 원치 않으면 두고 갈 수 있어요',640,315,17,'#ffe2a3');
 if(r.type==='boss'&&r.cleared&&(g.floorIndex===2||r.augment?.taken)){object(c,images,0,640,475,155,180);label(c,g.floorIndex<2?'F · 다음 층으로':'F · 탈출하기',640,490,20,'#ffe2a3');}
 drawNewRoom(c,g,images,reduced);
 if(r.puzzle){const u=r.puzzle;for(const [i,pad]of u.pads.entries()){ring(c,pad.x,pad.y,30,u.done?'#8ac49a':u.active&&u.step===i?'#ffe2a3':'#9b91ba','#8a719333');label(c,String(i+1),pad.x,pad.y+5,20,u.step===i?'#ffe9ac':'#c5b2d4');}if(!u.active&&!u.done)label(c,'F · 빛나는 순서대로 발자국 밟기',640,430,19);}
 if(r.forge&&!r.forge.used){object(c,images,5,640,470,135,90);if(r.forge.item)drawItem(c,images,r.forge.item,612,375,56);label(c,'재봉 · 마지막 보유 유물 교환 / '+r.forge.cost+'닢',640,520,16);}
 if(r.deal&&!r.deal.used){object(c,images,5,640,455,135,90);if(r.deal.item)drawItem(c,images,r.deal.item,612,360,56);label(c,(ITEMS[r.deal.item]?.name||'후보 없음')+' · F / 최대 체력 −'+r.deal.cost,640,510,17,'#e6b4d7');}
 if(r.type==='boss'&&r.cleared&&g.floorIndex<2&&(r.augment?.taken)){object(c,images,0,900,475,155,180);label(c,'F · '+ROUTES[g.floorIndex===0?'archive':'echo'].name,900,500,18,'#b5dce1');label(c,'F · '+ROUTES[g.floorIndex===0?'canopy':'moon'].name,640,520,18,'#e5d397');}
 const actors=[...r.obstacles.filter(o=>o.hp!==0).map(o=>({y:o.y+o.h,o})),...r.enemies.map(e=>({y:e.y,e})),{y:p.y,p:true}].sort((a,b)=>a.y-b.y);
 for(const a of actors){if(a.o){const o=a.o;if(o.kind==='gap'){drawPit(c,o,g.floorIndex);continue;}if((o.kind==='shelf'||o.kind==='crystal')&&addition(c,images,o.kind==='shelf'?3:7,o.x+o.w/2,o.y+o.h,o.w+25,o.kind==='shelf'?100:120))continue;if(o.kind==='pot'){drawCrate(c,images,o);continue;}const key=o.kind==='pot'?'mushroom':o.kind,w=key==='log'?o.w+45:100;if(!drawPaintedProp(c,images,key,o.x+o.w/2,o.y+o.h,w)){circle(c,o.x+o.w/2,o.y+o.h/2,o.w/2,'#829470');}continue;}if(a.e){drawEnemy(c,g,a.e,images,reduced);continue;}
  c.save();c.translate(p.x,p.y);c.fillStyle='#19352a66';c.beginPath();c.ellipse(0,5,27,9,0,0,TAU);c.fill();if(p.invuln>0)ring(c,0,-20,42,'#ffe4ac99','#fff0b90a');if(g.hero==='velvet')drawVelvet(c,g,images,reduced);else{c.save();c.scale(p.action?.facing||p.facing,1);c.translate(0,-22.4);const drawn=drawButterMotion(c,images.butter,{size:80,gait:reduced?{phase:0,amount:0,clock:0}:p.gait,action:reduced?null:p.action,time:reduced?0:g.time});c.restore();if(!drawn){circle(c,0,-35,20,'#e9cc96');label(c,'버터',0,-30,12,'#244c3f');}}c.restore();
 }
 for(const e of r.enemies)drawCastHints(c,g,e,{reduced});
 if(hasItem(g,'komi')){const x=p.x+Math.cos(g.time*2.8)*72,y=p.y-22+Math.sin(g.time*2.8)*45;if(images.icons.komi?.naturalWidth)c.drawImage(images.icons.komi,x-20,y-20,40,40);}
 for(const b of g.bullets){if(b.kind==='beam'){c.save();c.strokeStyle=b.returned?'#dcabed':'#b3f3ed';c.lineWidth=b.returned?4:8;c.shadowBlur=reduced?0:12;c.shadowColor='#a2f4e4';for(const s of b.segments){c.beginPath();c.moveTo(s.a.x,s.a.y);c.lineTo(s.b.x,s.b.y);c.stroke();}c.restore();continue;}if(b.kind==='charged')ring(c,b.x,b.y,b.radius+3,'#ffe2a2','#eebf6777');if(b.kind==='boulder'){const im=images.boulder;ring(c,b.x,b.y,(b.radius||36)+4,'#f7daa988','#ffe09d08');c.save();c.globalAlpha=Math.min(1,b.life/.5);c.translate(b.x,b.y);if(!reduced)c.rotate(b.age*4);if(im?.naturalWidth){const size=100*(b.radius||36)/36;c.drawImage(im,-size/2,-size/2,size,size);}else fx(c,images.effects,'rock',0,0,74*(b.radius||36)/36);c.restore();continue;}const a=Math.atan2(b.vy,b.vx);if(!reduced)fx(c,images.effects,'trace',b.x-b.vx*.025,b.y-b.vy*.025,b.kind==='chain'?34:24,a,.45);if(!fx(c,images.effects,b.kind==='chain'?'star':'rock',b.x,b.y,b.kind==='chain'?27:b.kind==='gun'?15:19,reduced?0:g.time*7))circle(c,b.x,b.y,7,'#f7e0b1');}
 for(const b of g.hostile){ring(c,b.x,b.y,b.radius+2,'#fff0d9','#d86a9b');circle(c,b.x-2,b.y-2,3,'#ffe5d8');}
 for(const e of g.effects){const t=e.age/e.life;c.save();c.globalAlpha=1-t;if(e.kind==='cleave'){c.strokeStyle='#fff2c1';c.lineWidth=12;c.beginPath();c.arc(e.x,e.y,e.radius*.8,e.angle-.9,e.angle+.9);c.stroke();}else if(e.kind==='bolt'){c.strokeStyle='#e3f8ff';c.lineWidth=3;c.beginPath();c.moveTo(e.x,e.y);c.lineTo((e.x+e.x2)/2+10,(e.y+e.y2)/2-12);c.lineTo((e.x+e.x2)/2-8,(e.y+e.y2)/2+8);c.lineTo(e.x2,e.y2);c.stroke();}else if(e.kind==='pulse'||e.kind==='explosion'||e.kind==='slash'){ring(c,e.x,e.y,(e.radius||40)*(reduced?1:.4+t*.6),e.kind==='slash'?'#dec6f7':'#ffe1aa','#fff0d60a');}else if(e.kind==='clear')label(c,'방 정리 완료',e.x,e.y-20,25,'#f7dfa1');else{const id=e.kind==='muzzle'?'muzzle':e.kind==='defeat'?'dust':e.kind==='charge'?'ring':e.kind==='hurt'?'ring':'star';fx(c,images.effects,id,e.x,e.y,(e.kind==='defeat'?65:40)*(reduced?1:1+t*.5));}c.restore();}
 for(const n of g.numbers)label(c,String(n.value),n.x,n.y-(reduced?0:n.age*33),17,'#fff1ce');
 const h=hurtPoint(p);ring(c,h.x,h.y,PLAYER_HURT_RADIUS,'#fff1bd55','#fff0b908');if(g.shield>0)ring(c,h.x,h.y,22,'#a1e1e688','#80d9dd11');
 if(p.charge>0){ring(c,h.x,h.y,34,'#edcb8b','#f5cf7322');label(c,Math.round(p.charge/.7*100)+'%',p.x,p.y-100,14,'#ffe4a4');}
 if(g.lastHit&&g.time-g.lastHit.at<1.1){const hit=g.lastHit;label(c,hit.label+' '+(hit.shield?'방어 '+hit.shield+' / ':'')+'−'+hit.amount+(hit.coinLoss?' / −'+hit.coinLoss+'닢':''),p.x,p.y-125,15,'#ffd5da');const a=hit.angle;c.save();c.strokeStyle='#f799ac';c.lineWidth=5;c.beginPath();c.moveTo(h.x+Math.cos(a)*35,h.y+Math.sin(a)*35);c.lineTo(h.x+Math.cos(a)*55,h.y+Math.sin(a)*55);c.stroke();c.restore();}
 const aim=p.aim;if(g.phase==='playing'){const x=p.x+aim.x*95,y=p.y-45+aim.y*95;c.save();c.strokeStyle='#fff1bdad';c.lineWidth=2;c.beginPath();c.arc(x,y,6,0,TAU);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(x+dx*9,y+dy*9);c.lineTo(x+dx*14,y+dy*14);}c.stroke();c.restore();}
 if(g.curse==='dusk'&&!g.curseLifted){const fog=c.createRadialGradient(p.x,p.y-25,110,p.x,p.y-25,370);fog.addColorStop(0,'#0d112000');fog.addColorStop(1,'#0d1120c7');c.fillStyle=fog;c.fillRect(0,0,viewFor(r).width,viewFor(r).height);}
 const n=nearby(g);if(n&&g.phase==='playing')label(c,'F · '+n.text,n.x,n.y+85,16,'#ffe4b3');
 if(g.roomBanner>0){c.save();c.globalAlpha=Math.min(1,g.roomBanner);label(c,r.type==='boss'?({velvet:'벨벳',erpin:'에르핀',shady:'셰이디'})[r.bossRole]+'의 무대':ROOM_NAMES[r.type],640,265,26,'#f6e3b4');c.restore();}
 c.restore();
}
const hasItem=(g,id)=>g.items.includes(id);
let base=null;
function drawBase(c,g,images){
 const r=current(g),view=viewFor(r),im=images[FLOORS[g.floorIndex].id]||images.room,m=c.getTransform(),z=Math.hypot(m.a,m.b),w=Math.max(1,Math.round(view.width*z)),h=Math.max(1,Math.round(view.height*z));
 const key=[w,h,r.type,g.floorIndex,im?.naturalWidth||0,...r.terrain.flatMap(t=>[t.x,t.y,t.w,t.h])].join(':');
 if(!base||base.room!==r||base.image!==im||base.key!==key){
  if(base)base.canvas.width=base.canvas.height=0;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const b=canvas.getContext('2d');b.scale(w/view.width,h/view.height);
  if(im?.naturalWidth)b.drawImage(im,0,0,view.width,view.height);else{b.fillStyle='#445e4e';b.fillRect(75,150,1130,560);b.strokeStyle='#8b9874';b.lineWidth=34;b.strokeRect(90,165,1100,540);}
  if(['treasure','shop','secret'].includes(r.type)){const gradient=b.createRadialGradient(640,420,20,640,420,350);gradient.addColorStop(0,r.type==='secret'?'#bd8de526':'#fff2bd27');gradient.addColorStop(1,'#fff0b000');b.fillStyle=gradient;b.fillRect(180,230,920,430);}
  terrain(b,g);base={room:r,image:im,key,canvas};
 }
 c.drawImage(base.canvas,0,0,view.width,view.height);
}
function extra(c,images,index,x,y,size){const im=images.extras;if(!im?.naturalWidth)return;const w=im.naturalWidth/4,h=im.naturalHeight/3;c.drawImage(im,index%4*w,Math.floor(index/4)*h,w,h,x-size/2,y-size/2,size,size);}
function drawNewRoom(c,g,images,reduced){
 const r=current(g),v=biomeView(g);if(v)for(const m of v.marks){
  extra(c,images,v.kind==='portals'?11:v.kind==='books'?10:9,m.x,m.y,v.radius*2);
  ring(c,m.x,m.y,v.radius,v.phase==='active'?'#f4a5ad':v.kind==='portals'?'#c5b3ee':'#f2d185',v.phase==='active'?'#d66a7955':'#e0c6a911',v.phase==='warn');
  if(v.phase==='warn')label(c,v.kind==='books'?'낙하 예고':'포자 예고',m.x,m.y-v.radius-12,13,'#ffe5ba');
 }
 if(['sanctuary','bargain','rush'].includes(r.type)){
  const index=r.type==='sanctuary'?6:r.type==='bargain'?7:8,im=images.extras,foot=OBJECTS76.feet[index],z=150/362;if(im?.naturalWidth)c.drawImage(im,index%4*362,Math.floor(index/4)*362,362,362,640-foot[0]*z,475-foot[1]*z,150,150);
  label(c,r.event?.used?'이용 완료':r.type==='sanctuary'?'회복 / 보호막 · 3 닢':r.type==='bargain'?'최대 체력 −10 ↔ 선물':'선택형 · 45초 도전',640,535,17,'#e9d0f3');
 }
 if(r.rush?.state==='active')label(c,'남은 시간 '+Math.max(0,Math.ceil(r.rush.deadline-g.time))+'초',640,290,23,'#f2cf8b');
 if(r.encounter&&!r.cleared&&g.roomBanner>0)label(c,r.encounter.name+' · '+r.encounter.hint,640,305,15,'#e5e7cf');
 if(r.waves?.total>1&&!r.cleared){const v=viewFor(r);label(c,r.waves.nextAt?'증원 준비 · '+Math.max(0,Math.ceil(r.waves.nextAt-g.time))+'초':'무리 '+(r.waves.index+1)+' / '+r.waves.total,v.width/2,Math.min(v.height-145,640),17,'#edcfa0');}
}
