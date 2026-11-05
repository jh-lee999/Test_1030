import {drawButterMotion} from './butter-original-motion.js';
import {STAGE_ART} from './platformer-art.js?v=43';
import {EFFECT_REGIONS} from './dice-effects.js?v=67';
import {WORLD,moveStats,MAPS,hazardPhase} from './survivor69-engine.js?v=69';
const TAU=Math.PI*2;
const ink='#f4e5bd';
const hash=(x,y)=>{let n=Math.imul(x+71,374761393)^Math.imul(y+37,668265263);n=Math.imul(n^n>>>13,1274126177);return (n>>>0)/4294967296;};
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function text(c,value,x,y,size,color=ink){c.font='800 '+size+'px system-ui,sans-serif';c.fillStyle=color;c.textAlign='center';c.fillText(value,x,y);}
function sprite(c,image,id,x,y,size,angle=0,alpha=1,height=size){if(!image?.naturalWidth)return false;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.drawImage(image,...EFFECT_REGIONS[id],-size/2,-height/2,size,height);c.restore();return true;}
function monster(c,g,e,images,reduced){
 const art=STAGE_ART.monsters[e.role],key=e.state==='windup'||e.state==='recover'?'attack':'walk',clip=art.clips[key],image=images.monsters[e.role]?.[key]||images.monsters[e.role]?.idle;
 const time=key==='attack'?Math.max(0,clip.duration-e.timer):e.animation,frame=reduced?0:clip.loop?Math.floor(time%clip.duration/clip.duration*clip.count):Math.min(clip.count-1,Math.floor(time/clip.duration*clip.count));
 const scale=(e.role==='ghost'?.53:e.role==='rusher'?.41:e.role==='caster'?.36:.4)*(e.elite?1.35:1)*(e.final?1.6:1),facing=g.player.x>e.x?-1:1;
 c.save();c.translate(e.x,e.y);c.fillStyle='#142b2c55';c.beginPath();c.ellipse(0,5,e.radius*1.2,9,0,0,TAU);c.fill();
 if(e.elite||e.boss){c.strokeStyle=e.final?'#df9dcc':'#f4ce83';c.lineWidth=2;c.beginPath();c.ellipse(0,5,e.radius*1.6,11,0,0,TAU);c.stroke();}
 c.save();c.scale(facing,1);if(image?.naturalWidth)c.drawImage(image,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);else circle(c,0,-18,e.radius,e.role==='ghost'?'#a98bc5':'#d6b0ba');c.restore();
 if(e.flash>0&&!reduced){c.strokeStyle='#ffedba';c.lineWidth=2;c.beginPath();c.arc(0,-20,e.radius+4,0,TAU);c.stroke();}
 if(e.hp<e.maxHp||e.elite||e.boss){c.fillStyle='#211c37aa';c.fillRect(-23,-64,46,4);c.fillStyle=e.final?'#eca1c3':'#e6c88b';c.fillRect(-23,-64,46*Math.max(0,e.hp/e.maxHp),4);}c.restore();
 if(e.chargedUntil>g.time||e.slowUntil>g.time){c.strokeStyle=e.chargedUntil>g.time?'#d7d9ff':'#9cdeec';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y-20,e.radius+5,0,TAU);c.stroke();}
 if(e.treasure)text(c,'✦ 보물 도둑',e.x,e.y-73,13,'#ffe1a0');
}
export const POINTS={rift:{icon:'◇',name:'균열',color:'#d9b8eb'},chest:{icon:'▣',name:'유물 상자',color:'#edd099'},spring:{icon:'♥',name:'회복 샘',color:'#a9dec5'},nest:{icon:'✦',name:'보물 도둑',color:'#efbc91'},shrine:{icon:'Ⅰ',name:'핵 교환',color:'#b2d9e6'}};
function environment(c,g){
 for(const h of g.world.hazards){const phase=hazardPhase(g,h);if(phase==='rest')continue;c.save();c.strokeStyle=g.map==='night'?'#b7afe5':'#edacac';c.fillStyle=phase==='active'?(g.map==='night'?'#a7a0dc42':'#ee9d9d45'):'#efc1bf16';c.lineWidth=phase==='active'?3:2;c.setLineDash(phase==='warning'?[5,5]:[]);c.beginPath();c.arc(h.x,h.y,h.radius,0,TAU);c.fill();c.stroke();c.restore();text(c,g.map==='night'?'☾':'!',h.x,h.y+5,18,phase==='active'?'#f5c6bd':'#c8bfad');}
 for(const z of g.zones){c.save();c.lineWidth=2;
  const colors={fire:'#e7ad7c',cloud:'#b4cbea',web:'#c1e2f0',ice:'#9bd5d7',mine:'#e4c17c',vortex:'#b7d2af',decoy:'#eed5a7',danger:'#f5a1a9',warning:'#efacba'},color=colors[z.kind];c.strokeStyle=color;c.fillStyle=color+'28';
  if(z.kind==='web'){c.lineWidth=5;c.beginPath();c.moveTo(z.x,z.y);c.lineTo(z.x2,z.y2);c.stroke();}
  else{c.setLineDash(z.kind==='warning'?[5,5]:[]);c.beginPath();c.arc(z.x,z.y,z.kind==='mine'?12:z.radius,0,TAU);c.fill();c.stroke();if(z.kind==='mine')text(c,z.age>1?'✦':'·',z.x,z.y+5,17,color);if(z.kind==='decoy')text(c,'♧',z.x,z.y-10,43,color);}
  c.restore();
 }
 for(const p of g.world.points){const d=POINTS[p.type];c.save();c.globalAlpha=p.state==='done'?.38:1;if(p.type==='rift'&&p.state!=='done'){c.strokeStyle=d.color+'90';c.fillStyle=d.color+'0c';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,p.radius,0,TAU);c.fill();c.stroke();if(p.state==='active'){c.strokeStyle='#f3da9d';c.lineWidth=5;c.beginPath();c.arc(p.x,p.y,p.radius,-Math.PI/2,-Math.PI/2+TAU*p.progress/18);c.stroke();}}
  circle(c,p.x,p.y,30,'#19373c');c.strokeStyle=d.color;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,30,0,TAU);c.stroke();text(c,p.state==='done'?'✓':d.icon,p.x,p.y+9,28,d.color);text(c,d.name+(p.state==='active'?' '+Math.floor(p.progress)+'/18':''),p.x,p.y+53,13,d.color);c.restore();
 }
 for(const o of g.world.obstacles){c.fillStyle='#102c324a';c.fillRect(o.x+3,o.y+7,o.w,o.h);c.fillStyle=g.map==='ember'?'#755d52':g.map==='night'?'#4e5771':'#567460';c.strokeStyle='#afc49b60';c.lineWidth=2;c.beginPath();c.roundRect(o.x,o.y,o.w,o.h,17);c.fill();c.stroke();c.strokeStyle='#bdccab28';c.beginPath();c.moveTo(o.x+14,o.y+17);c.lineTo(o.x+o.w-17,o.y+17);c.stroke();}
}
export function renderMap(c,g,width,height){
 c.clearRect(0,0,width,height);c.fillStyle='#142f38';c.fillRect(0,0,width,height);const sx=(width-12)/WORLD.width,sy=(height-12)/WORLD.height; c.save();c.translate(6,6);
 for(const o of g.world.obstacles){c.fillStyle='#8ca89950';c.fillRect(o.x*sx,o.y*sy,o.w*sx,o.h*sy);}
 for(const p of g.world.points){const d=POINTS[p.type];circle(c,p.x*sx,p.y*sy,p.state==='done'?2:4,p.state==='done'?'#678985':d.color);}
 for(const e of g.enemies)if(e.boss)circle(c,e.x*sx,e.y*sy,e.final?5:3,'#f0a5b2');circle(c,g.player.x*sx,g.player.y*sy,4,'#fff0b8');c.restore();
}
export function render(c,g,images,{width,height,reduced=false}={}){
 // One fixed camera bias leaves room for the intact high-skill cell above the
 // shared foot, including short landscape screens. Never fit individual poses.
 const baseWidth=width<650?650:1120,zoom=Math.min(width/baseWidth,height/405),viewWidth=width/zoom,viewHeight=height/zoom,p=g.player,left=p.x-viewWidth/2,top=p.y-viewHeight*.6;
 c.clearRect(0,0,width,height);c.fillStyle=MAPS[g.map].color;c.fillRect(0,0,width,height);
 const bg=images.backgrounds?.[g.map==='night'?'night':'forest']||images.background;if(bg?.naturalWidth){c.save();c.globalAlpha=.08;const s=Math.max(width/bg.naturalWidth,height/bg.naturalHeight);c.drawImage(bg,(width-bg.naturalWidth*s)/2,(height-bg.naturalHeight*s)/2,bg.naturalWidth*s,bg.naturalHeight*s);c.restore();}
 c.save();c.scale(zoom,zoom);c.translate(-left,-top);
 const startX=Math.floor(left/96),endX=Math.ceil((left+viewWidth)/96),startY=Math.floor(top/96),endY=Math.ceil((top+viewHeight)/96);
 for(let y=startY;y<=endY;y++)for(let x=startX;x<=endX;x++){const h=hash(x,y),j=hash(y+113,x-79),wx=x*96+j*40,wy=y*96+h*30;if(h>.82){c.fillStyle=g.time<120?'#6b937014':'#72939b12';c.beginPath();c.ellipse(wx+23,wy+45,18+j*30,10+h*8,j,0,TAU);c.fill();}if(h>.92){circle(c,wx+60,wy+14,3,'#e3d89988');circle(c,wx+64,wy+18,2,'#8dc6a788');}if(h<.27){c.strokeStyle='#9ab69e28';c.lineWidth=2;c.beginPath();c.moveTo(wx+20,wy+20);c.lineTo(wx+25,wy+13);c.moveTo(wx+23,wy+20);c.lineTo(wx+31,wy+18);c.stroke();}}
 c.strokeStyle='#adcfc32a';c.lineWidth=10;c.strokeRect(45,45,WORLD.width-90,WORLD.height-90);
 environment(c,g);
 for(const gem of g.gems){c.save();c.translate(gem.x,gem.y);c.rotate(Math.PI/4);c.fillStyle=gem.value>10?'#f3d88a':'#9de2cb';c.fillRect(-4,-4,8,8);c.strokeStyle='#d4f9e8';c.lineWidth=1;c.strokeRect(-4,-4,8,8);c.restore();}
 // Telegraphs stay in the world and retain the locked aim used by the engine.
 for(const e of g.enemies)if(e.state==='windup'){
  c.save();c.strokeStyle='#ffb0ac';c.fillStyle='#d77d8a38';c.lineWidth=2;c.setLineDash([7,5]);
  if(e.role==='caster'){c.beginPath();c.arc(e.aimX,e.aimY,72,0,TAU);c.fill();c.stroke();}
  else if(e.role==='rusher'){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+e.aimX*175,e.y+e.aimY*175);c.stroke();}
  else if(e.role==='archer'){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.aimX,e.aimY);c.stroke();}
  else if(e.boss){c.beginPath();c.arc(e.x,e.y,90,0,TAU);c.stroke();}c.restore();
 }
 const actors=[...g.enemies.map(e=>({y:e.y,e})),{y:p.y,player:true}].sort((a,b)=>a.y-b.y);
 for(const actor of actors){if(actor.e){if(Math.abs(actor.e.x-p.x)>viewWidth/2+180||Math.abs(actor.e.y-p.y)>viewHeight/2+180)continue;monster(c,g,actor.e,images,reduced);continue;}
  c.save();c.translate(p.x,p.y);c.fillStyle='#10292955';c.beginPath();c.ellipse(0,5,27,9,0,0,TAU);c.fill();
  if(p.invuln>0){c.strokeStyle='#ffe3a2aa';c.lineWidth=3;c.beginPath();c.ellipse(0,-20,39,49,0,0,TAU);c.stroke();}
  c.translate(0,-22.4);c.scale(p.action?.facing??p.facing,1);const drawn=drawButterMotion(c,images.butter,{size:80,time:reduced?0:g.time,action:reduced?null:p.action,gait:reduced?{amount:0,phase:0}:p.gait});if(!drawn){circle(c,0,-15,22,'#edd29e');c.scale(p.action?.facing??p.facing,1);text(c,'버터',0,-10,12,'#554635');}c.restore();
 }
 const pillow=g.moves.pillow;if(pillow){const d=moveStats('pillow',pillow.level,pillow.awake);for(let i=0;i<d.count;i++){const a=g.time*2.1+i*TAU/d.count,x=p.x+Math.cos(a)*d.radius,y=p.y+Math.sin(a)*d.radius;c.save();c.translate(x,y);c.rotate(reduced?0:a+.3);if(images.pillow?.naturalWidth)c.drawImage(images.pillow,-19,-19,38,38);else{c.fillStyle='#e7c2d6';c.fillRect(-18,-13,36,26);}c.restore();}}
 for(const b of g.bullets){if(b.kind==='bomb'){const rise=Math.sin(Math.min(1,b.age/.7)*Math.PI)*55;if(!sprite(c,images.effects,'star',b.x,b.y-rise,25,g.time*3))circle(c,b.x,b.y-rise,9,'#eed39e');continue;}const size=b.kind==='boulder'?68:b.kind==='chain'?24:17;if(b.kind==='chain'&&!reduced){c.strokeStyle='#bde7c9aa';c.lineWidth=3;c.beginPath();c.moveTo(b.x-b.vx*.045,b.y-b.vy*.045);c.lineTo(b.x,b.y);c.stroke();}if(!sprite(c,images.effects,'rock',b.x,b.y,size,reduced?0:g.time*6))circle(c,b.x,b.y,size/2,b.kind==='chain'?'#c5e8bb':'#dfc6a5');}
 for(const b of g.shots){circle(c,b.x,b.y,b.radius+3,'#e8a2b83b');circle(c,b.x,b.y,b.radius,'#edb8c9');circle(c,b.x-2,b.y-2,2,'#fff0d5');}
 for(const e of g.effects){const f=e.age/e.life;if(e.kind==='hit'){if(!reduced)sprite(c,images.effects,'star',e.x,e.y-10,35*(1-f),0,1-f);}else if(e.kind==='muzzle'){if(!reduced)sprite(c,images.effects,'muzzle',e.x,e.y,35,Math.PI/2,1-f);}else if(e.kind==='bolt'){if(!reduced)sprite(c,images.effects,'bolt',e.x,e.y-48,46,0,1-f,120);circle(c,e.x,e.y,18*(1-f),'#dcecf670');}else if(e.kind==='blast'){c.save();c.globalAlpha=(1-f)*.55;c.strokeStyle='#f0c499';c.fillStyle='#f2c28d33';c.lineWidth=4;c.beginPath();c.arc(e.x,e.y,e.radius*(.5+.5*f),0,TAU);c.fill();c.stroke();c.restore();}else if(!reduced){c.save();c.globalAlpha=1-f;c.strokeStyle='#d5e7c5';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,15+f*22,0,TAU);c.stroke();c.restore();}}
 if(!reduced)for(const n of g.numbers){c.save();c.globalAlpha=Math.min(1,(.6-n.age)*4);text(c,n.value,n.x,n.y-n.age*35,n.value>55?22:15,n.value>55?'#ffdfa2':'#f5e9d2');c.restore();}
 c.restore();
 const edge=c.createRadialGradient(width/2,height/2,Math.min(width,height)*.2,width/2,height/2,Math.max(width,height)*.7);edge.addColorStop(0,'#17253600');edge.addColorStop(1,'#15233566');c.fillStyle=edge;c.fillRect(0,0,width,height);
 const boss=g.enemies.find(e=>e.final&&!e.dead)||g.enemies.find(e=>e.boss&&!e.dead)||g.world.points.filter(q=>q.type==='rift'&&(q.state!=='done'||g.seals===2&&g.time>=120&&g.time<165&&!g.finalSpawned)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(boss){const bx=(boss.x-left)*zoom,by=(boss.y-top)*zoom;if(bx<0||bx>width||by<0||by>height){const x=Math.max(32,Math.min(width-32,bx)),y=Math.max(125,Math.min(Math.max(145,height-140),by)),a=Math.atan2(by-y,bx-x);c.save();c.translate(x,y);circle(c,0,0,20,'#233844ed');c.rotate(a);c.fillStyle='#efc9d5';c.beginPath();c.moveTo(10,0);c.lineTo(-5,-7);c.lineTo(-5,7);c.closePath();c.fill();c.rotate(-a);text(c,boss.type?(boss.state==='done'?'조기 소환':'균열'):'수호자',0,34,10,'#efc9d5');c.restore();}}
}
