import {drawButterMotion} from './butter-gun-motion71.js';
import {ELITE_ART} from './assets/trickcal-elites71/atlas.js?v=71';
import {STAGE_ART} from './platformer-art.js?v=43';
import {EFFECT_REGIONS} from './dice-effects.js?v=67';
import {WORLD,moveStats,ELITES,hazardPhase} from './survivor71-engine.js?v=71';
import {PALETTES} from './survivor71-art.js?v=71';
import {drawTerrain,drawCoverBase,drawCover,sceneLayout} from './survivor71-scenery.js?v=71';
const TAU=Math.PI*2;
const ink='#6e534f';
const hash=(x,y)=>{let n=Math.imul(x+71,374761393)^Math.imul(y+37,668265263);n=Math.imul(n^n>>>13,1274126177);return (n>>>0)/4294967296;};
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function text(c,value,x,y,size,color=ink){c.save();c.font=size+'px Jua70,system-ui,sans-serif';c.fillStyle=color;c.textAlign='center';c.lineJoin='round';c.strokeStyle='#fff4df';c.lineWidth=3;c.strokeText(value,x,y);c.fillText(value,x,y);c.restore();}
function sprite(c,image,id,x,y,size,angle=0,alpha=1,height=size){if(!image?.naturalWidth)return false;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.drawImage(image,...EFFECT_REGIONS[id],-size/2,-height/2,size,height);c.restore();return true;}
function monster(c,g,e,images,reduced){
 if(e.eliteId){drawElite(c,g,e,images,reduced);return;}
 const art=STAGE_ART.monsters[e.role],key=e.state==='windup'||e.state==='recover'?'attack':'walk',clip=art.clips[key],image=images.monsters[e.role]?.[key]||images.monsters[e.role]?.idle;
 const time=key==='attack'?Math.max(0,clip.duration-e.timer):e.animation,frame=reduced?0:clip.loop?Math.floor(time%clip.duration/clip.duration*clip.count):Math.min(clip.count-1,Math.floor(time/clip.duration*clip.count));
 const scale=(e.role==='ghost'?.53:e.role==='rusher'?.41:e.role==='caster'?.36:.4)*(e.elite?1.35:1)*(e.final?1.6:1),facing=(g.player.x>e.x?-1:1)*(e.treasure?-1:1);
 c.save();c.translate(e.x,e.y);c.fillStyle='#142b2c55';c.beginPath();c.ellipse(0,5,e.radius*1.2,9,0,0,TAU);c.fill();
 if(e.elite||e.boss){c.strokeStyle=e.final?'#df9dcc':'#f4ce83';c.lineWidth=2;c.beginPath();c.ellipse(0,5,e.radius*1.6,11,0,0,TAU);c.stroke();}
 c.save();c.scale(facing,1);if(image?.naturalWidth)c.drawImage(image,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);else circle(c,0,-18,e.radius,e.role==='ghost'?'#a98bc5':'#d6b0ba');c.restore();
 if(e.flash>0&&!reduced){c.strokeStyle='#ffedba';c.lineWidth=2;c.beginPath();c.arc(0,-20,e.radius+4,0,TAU);c.stroke();}
 if(e.hp<e.maxHp||e.elite||e.boss){c.fillStyle='#211c37aa';c.fillRect(-23,-64,46,4);c.fillStyle=e.final?'#eca1c3':'#e6c88b';c.fillRect(-23,-64,46*Math.max(0,e.hp/e.maxHp),4);}c.restore();
 if(e.chargedUntil>g.time||e.slowUntil>g.time){c.strokeStyle=e.chargedUntil>g.time?'#d7d9ff':'#9cdeec';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y-20,e.radius+5,0,TAU);c.stroke();}
 if(e.treasure)text(c,'✦ 보물 도둑',e.x,e.y-73,13,'#8f633f');
}
// Retiming is shared across all frames, never a per-pose fit. Source event
// windows line up with the engine's committed windup / active / recovery clocks.
export function elitePose(e){
 const d=ELITES[e.eliteId],art=ELITE_ART.heroes[e.eliteId];let key='walk',t=e.animation;
 if(e.action){const a=e.action.time,w=d.tell;key=d.clip;
  if(e.eliteId==='velvet')t=a<w?a/w*.733333:a<w+1.8?.733333+(a-w)/1.8*(2.666667-.733333):2.666667+(a-w-1.8)/d.recover*(4.1-2.666667);
  if(e.eliteId==='shady'){if(a<w)t=a/w*1.966667;else{key='strike';t=a<w+1.2?.4+(a-w)/1.2*.833333:1.233333+(a-w-1.2)/d.recover*.433334;}}
  if(e.eliteId==='erpin'){const knots=[[0,0],[w,.833333],[w+.17,1.7],[w+.34,1.8],[w+.51,1.966667],[w+.7,2.133333],[w+.7+d.recover,2.833333]];t=2.833333;for(let i=1;i<knots.length;i++)if(a<=knots[i][0]){const [x,y]=knots[i-1],[x2,y2]=knots[i];t=y+(a-x)/(x2-x)*(y2-y);break;}}
 }
 const clip=art.clips[key]||art.clips.idle,index=clip.loop?Math.floor((t%clip.duration)/clip.duration*clip.count):Math.round(Math.max(0,Math.min(1,t/clip.duration))*(clip.count-1));return {key,clip,index};
}
function drawElite(c,g,e,images,reduced){
 const d=ELITES[e.eliteId],f=elitePose(reduced?{...e,action:null,animation:0}:e),image=images.elites?.[e.eliteId]?.[f.key],scale=e.final?1.35:1.05,facing=g.player.x>e.x?-1:1;
 c.save();c.translate(e.x,e.y);c.fillStyle='#5742593d';c.beginPath();c.ellipse(0,5,34,12,0,0,TAU);c.fill();c.save();c.scale(facing,1);
 if(image?.naturalWidth)c.drawImage(image,f.index%f.clip.columns*f.clip.width,Math.floor(f.index/f.clip.columns)*f.clip.height,f.clip.width,f.clip.height,-f.clip.origin[0]*scale,-f.clip.origin[1]*scale,f.clip.width*scale,f.clip.height*scale);
 else if(images.elites?.[e.eliteId]?.idle?.naturalWidth){const q=ELITE_ART.heroes[e.eliteId].clips.idle;c.drawImage(images.elites[e.eliteId].idle,0,0,q.width,q.height,-q.origin[0]*scale,-q.origin[1]*scale,q.width*scale,q.height*scale);}else circle(c,0,-25,23,d.color);
 c.restore();c.fillStyle='#fff2dccc';c.fillRect(-34,-133,68,5);c.fillStyle=d.color;c.fillRect(-34,-133,68*Math.max(0,e.hp/e.maxHp),5);c.restore();plaque(c,(e.final?'수장 · ':'잔상 · ')+d.name,e.x,e.y-151,d.color);
}
export const POINTS={rift:{icon:'◇',name:'균열',color:'#8d62a6'},chest:{icon:'▣',name:'유물 상자',color:'#866432'},spring:{icon:'♥',name:'회복 샘',color:'#467465'},nest:{icon:'✦',name:'보물 도둑',color:'#96614d'},shrine:{icon:'Ⅰ',name:'핵 교환',color:'#4d6d86'}};
function ring(c,x,y,r,color,fill,dashed=false,contrast=false){c.save();c.fillStyle=fill;c.setLineDash(dashed?[6,5]:[]);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();if(contrast){c.lineWidth=6;c.strokeStyle='#fff4dfc9';c.stroke();}c.lineWidth=2.5;c.strokeStyle=color;c.stroke();c.restore();}
function plaque(c,label,x,y,color='#785d55'){c.save();c.font='13px Jua70,system-ui';const w=c.measureText(label).width+18;c.fillStyle='#fff5e5ed';c.strokeStyle='#b69c7e99';c.lineWidth=1;c.beginPath();c.roundRect(x-w/2,y-16,w,24,9);c.fill();c.stroke();c.fillStyle=color;c.textAlign='center';c.fillText(label,x,y+1);c.restore();}
function prop(c,images,key,x,y,w=116){const image=images.props?.[key];if(image?.naturalWidth){c.drawImage(image,x-w/2,y-w*117/128,w,w*136/128);return true;}return false;}
function flame(c,x,y,size,color){c.save();c.translate(x,y);c.fillStyle=color;c.strokeStyle='#ba805c';c.lineWidth=1.3;c.beginPath();c.moveTo(0,-size);c.bezierCurveTo(-size*.7,-size*.5,-size,size*.5,0,size*.5);c.bezierCurveTo(size*.9,size*.3,size*.3,-size*.3,0,-size);c.fill();c.stroke();c.fillStyle='#ffefd0';c.beginPath();c.ellipse(0,size*.1,size*.22,size*.35,0,0,TAU);c.fill();c.restore();}
function environment(c,g,images,reduced){
 for(const h of g.world.hazards){const phase=hazardPhase(g,h),night=g.map==='night';
  if(phase!=='rest')ring(c,h.x,h.y,h.radius,night?'#8273a7':'#9a3f60',phase==='active'?(night?'#b6a6dc45':'#db7b8f38'):'#fff4db1c',phase==='warning',true);
  prop(c,images,night?'harvest':'mushroom',h.x,h.y+3,phase==='active'?38:30);
  if(phase==='warning')plaque(c,night?'둔화 예고':'위험 예고',h.x,h.y-h.radius-7,'#a55a70');
 }
 for(const z of g.zones){c.save();
  if(z.kind==='web'){c.strokeStyle='#7a91b58c';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(z.x,z.y);c.lineTo(z.x2,z.y2);c.stroke();c.strokeStyle='#f4efff';c.lineWidth=2;c.stroke();}
  else if(z.kind==='warning'||z.kind==='danger'){ring(c,z.x,z.y,z.radius,'#9a3f60',z.kind==='danger'?'#cf718951':'#e6a0af26',z.kind==='warning',true);if(z.kind==='warning')plaque(c,'!',z.x,z.y-8,'#a54866');}
  else if(z.kind==='fire'){ring(c,z.x,z.y,z.radius,'#b68751a0','#eec09038');for(let i=0;i<4;i++){const a=i*TAU/4+.6,r=z.radius*.48;flame(c,z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,9+(reduced?0:Math.sin(g.time*3+i)*1.2),'#efbe88');}}
  else if(z.kind==='cloud'){ring(c,z.x,z.y,z.radius,'#7d96b29c','#c5d7e844');prop(c,images,'storm',z.x,z.y-12,34);}
  else if(z.kind==='ice'){ring(c,z.x,z.y,z.radius,'#6ba7b27c','#d4edf038');c.strokeStyle='#f8ffec';c.lineWidth=2;for(let i=0;i<3;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(z.x-Math.cos(a)*23,z.y-Math.sin(a)*23);c.lineTo(z.x+Math.cos(a)*23,z.y+Math.sin(a)*23);c.stroke();}}
  else if(z.kind==='mine'){ring(c,z.x,z.y,z.radius,'#b99c654f','#ead3a00c',true);c.globalAlpha=z.age>1?1:.55;prop(c,images,'bomb',z.x,z.y+9,27);}
  else if(z.kind==='decoy'){ring(c,z.x,z.y,z.radius,'#c3a47150','#f0d2b018');prop(c,images,'echo',z.x,z.y,65);}
  else if(z.kind==='vortex'){ring(c,z.x,z.y,z.radius,'#81a3906b','#c3dcb120');c.strokeStyle='#eff2bf';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.arc(z.x,z.y,z.radius*(.3+i*.2),(reduced?0:g.time)+i,(reduced?0:g.time)+i+3.6);c.stroke();}}
  c.restore();
 }
 for(const p of g.world.points)if(p.type==='rift'&&p.state!=='done'){ring(c,p.x,p.y,p.radius,'#9474b77c','#e8d8f20a');if(p.state==='active'){c.save();c.strokeStyle='#bf914d';c.lineWidth=5;c.beginPath();c.arc(p.x,p.y,p.radius,-Math.PI/2,-Math.PI/2+TAU*p.progress/18);c.stroke();c.restore();}}
 for(const o of g.world.obstacles)drawCoverBase(c,g,o);
}
function point(c,g,p,images,reduced){
 const near=Math.hypot(p.x-g.player.x,p.y-g.player.y)<105,early=p.type==='rift'&&p.state==='done'&&g.seals===2&&g.time>=120&&g.time<165&&!g.finalSpawned;
 c.save();if(p.state==='done'&&!early)c.globalAlpha=.65;
 if(near&&p.state==='ready'||early){c.save();c.globalAlpha=.25+(reduced?0:Math.sin(g.time*2)*.04);c.fillStyle='#fff3b8';c.beginPath();c.ellipse(p.x,p.y+4,51,18,0,0,TAU);c.fill();c.restore();}
 if(!prop(c,images,p.type,p.x,p.y)){circle(c,p.x,p.y-20,25,'#edd7b2');text(c,POINTS[p.type].icon,p.x,p.y-12,25);}
 if(p.artifact==='yellow'&&p.state!=='done'&&images.yellow?.naturalWidth)c.drawImage(images.yellow,p.x-18,p.y-120,36,36);
 const label=p.state==='active'?'봉인 '+Math.floor(p.progress)+' / 18':early?'조기 소환':p.state==='done'?(p.type==='rift'?'봉인 완료':'사용 완료'):p.artifact==='yellow'?'옐로카드 상자':POINTS[p.type].name;
 plaque(c,label,p.x,p.y+35,POINTS[p.type].color);
 if(p.state==='done'){c.strokeStyle='#6a997c';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(p.x+34,p.y-60);c.lineTo(p.x+42,p.y-53);c.lineTo(p.x+55,p.y-70);c.stroke();}
 c.restore();
}
export function renderMap(c,g,width,height,images={}){
 const p=PALETTES[g.map];c.clearRect(0,0,width,height);c.fillStyle=p.paper;c.fillRect(0,0,width,height);const sx=(width-16)/WORLD.width,sy=(height-16)/WORLD.height;c.save();c.translate(8,8);
 c.fillStyle=p.ground+'b0';c.beginPath();c.roundRect(0,0,width-16,height-16,6);c.fill();
 c.strokeStyle=p.path;c.lineWidth=width>200?4:1.3;for(const {a,b}of sceneLayout(g).roads){c.beginPath();c.moveTo(a.x*sx,a.y*sy);c.lineTo(b.x*sx,b.y*sy);c.stroke();}
 for(const o of g.world.obstacles){c.fillStyle=p.edge+'88';c.fillRect(o.x*sx,o.y*sy,Math.max(2,o.w*sx),Math.max(2,o.h*sy));}
 for(const q of g.world.points){const d=POINTS[q.type],x=q.x*sx,y=q.y*sy;c.globalAlpha=q.state==='done'?.5:1;
  if(width>200&&images.props?.[q.type]?.naturalWidth)c.drawImage(images.props[q.type],x-15,y-24,30,32);
  else{c.fillStyle=q.artifact==='yellow'?'#d5a13d':d.color;c.strokeStyle=p.paper;c.lineWidth=1.2;c.beginPath();if(q.type==='rift'){c.moveTo(x,y-5);c.lineTo(x+4,y);c.lineTo(x,y+5);c.lineTo(x-4,y);c.closePath();}else if(q.type==='chest')c.rect(x-4,y-3,8,6);else c.arc(x,y,3.7,0,TAU);c.fill();c.stroke();}
  if(q.artifact==='yellow'&&q.state!=='done'){c.strokeStyle='#a9782d';c.lineWidth=width>200?2:1.4;c.beginPath();c.arc(x,y,width>200?18:6,0,TAU);c.stroke();if(width>200)text(c,'옐로카드',x,y+25,11,'#93682e');}
 }c.globalAlpha=1;for(const e of g.enemies)if(e.boss)circle(c,e.x*sx,e.y*sy,e.final?5:3,'#af4e76');circle(c,g.player.x*sx,g.player.y*sy,5,'#fff4ca');circle(c,g.player.x*sx,g.player.y*sy,2.6,'#977142');c.restore();
}
export function render(c,g,images,{width,height,reduced=false}={}){
 // One fixed camera bias leaves room for the intact high-skill cell above the
 // shared foot, including short landscape screens. Never fit individual poses.
 const baseWidth=width<650?650:1120,zoom=Math.min(width/baseWidth,height/405),viewWidth=width/zoom,viewHeight=height/zoom,p=g.player,left=p.x-viewWidth/2,top=p.y-viewHeight*.6;
 c.clearRect(0,0,width,height);c.fillStyle=PALETTES[g.map].ground;c.fillRect(0,0,width,height);
 c.save();c.scale(zoom,zoom);c.translate(-left,-top);
 drawTerrain(c,g,{left,top,viewWidth,viewHeight});environment(c,g,images,reduced);
 for(const gem of g.gems){c.save();c.translate(gem.x,gem.y);c.rotate(Math.PI/4);c.fillStyle=gem.value>10?'#f3d88a':'#9de2cb';c.fillRect(-4,-4,8,8);c.strokeStyle='#d4f9e8';c.lineWidth=1;c.strokeRect(-4,-4,8,8);c.restore();}
 // Telegraphs stay in the world and retain the locked aim used by the engine.
 for(const e of g.enemies)if(e.eliteId&&['windup','special'].includes(e.state)){
  const color=ELITES[e.eliteId].color,active=e.state==='special';
  if(e.eliteId==='shady'){ring(c,e.aimX,e.aimY,82,color,active?'#b78ec846':'#d9b9e426',!active,true);if(!active)plaque(c,'순간이동 · 사슬낫',e.aimX,e.aimY-96,color);}
  if(e.eliteId==='velvet'){ring(c,e.x,e.y,132,color,active?'#d88aa13b':'#e6b1ba20',!active,true);if(!active)plaque(c,'도끼 회전 예고',e.x,e.y+155,color);}
  if(e.eliteId==='erpin'&&!active){c.save();c.strokeStyle=color;c.lineWidth=2;c.setLineDash([6,7]);for(const offset of [-.15,-.05,.05,.15]){const a=Math.atan2(e.aimY-e.y,e.aimX-e.x)+offset;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(a)*520,e.y+Math.sin(a)*520);c.stroke();}c.restore();}
 }
 for(const e of g.enemies)if(e.state==='windup'&&!e.eliteId){
  c.save();c.strokeStyle='#b24f70';c.fillStyle='#d77d8a30';c.lineWidth=3;c.setLineDash([7,5]);
  if(e.role==='caster'||e.role==='guard'){c.beginPath();c.arc(e.aimX,e.aimY,e.role==='guard'?65:70,0,TAU);c.fill();c.stroke();}
  else if(e.role==='rusher'){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+e.aimX*175,e.y+e.aimY*175);c.stroke();}
  else if(e.role==='archer'||e.role==='drone'){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.aimX,e.aimY);c.stroke();}
  else if(e.boss){c.beginPath();c.arc(e.x,e.y,90,0,TAU);c.stroke();}c.restore();
 }
 const actors=[...g.world.obstacles.map(o=>({y:o.y+o.h,o})),...g.world.points.map(q=>({y:q.y+5,q})),...g.enemies.map(e=>({y:e.y,e})),{y:p.y,player:true}].sort((a,b)=>a.y-b.y);
 for(const actor of actors){if(actor.o){drawCover(c,g,actor.o,images);continue;}if(actor.q){point(c,g,actor.q,images,reduced);continue;}if(actor.e){if(Math.abs(actor.e.x-p.x)>viewWidth/2+180||Math.abs(actor.e.y-p.y)>viewHeight/2+180)continue;monster(c,g,actor.e,images,reduced);continue;}
  c.save();c.translate(p.x,p.y);c.fillStyle='#10292955';c.beginPath();c.ellipse(0,5,27,9,0,0,TAU);c.fill();
  if(p.invuln>0){c.strokeStyle='#ffe3a2aa';c.lineWidth=3;c.beginPath();c.ellipse(0,-20,39,49,0,0,TAU);c.stroke();}
  c.translate(0,-22.4);c.scale(p.action?.facing??p.facing,1);const drawn=drawButterMotion(c,images.butter,{size:80,time:reduced?0:g.time,action:reduced?(g.relics.includes('yellow')?{type:'gun',time:.15,duration:.32}:null):p.action|| (g.relics.includes('yellow')?{type:'gun',time:0,duration:1}:null),gait:reduced?{amount:0,phase:0}:p.gait});if(!drawn){circle(c,0,-15,22,'#edd29e');c.scale(p.action?.facing??p.facing,1);text(c,'버터',0,-10,12,'#554635');}c.restore();
 }
 const pillow=g.moves.pillow;if(pillow){const d=moveStats('pillow',pillow.level,pillow.awake);for(let i=0;i<d.count;i++){const a=g.time*2.1+i*TAU/d.count,x=p.x+Math.cos(a)*d.radius,y=p.y+Math.sin(a)*d.radius;c.save();c.translate(x,y);c.rotate(reduced?0:a+.3);if(g.pillowHeat>g.time){circle(c,0,0,25,'#f1cf8b77');}if(images.pillow?.naturalWidth)c.drawImage(images.pillow,-19,-19,38,38);else{c.fillStyle='#e7c2d6';c.fillRect(-18,-13,36,26);}c.restore();}}
 for(const b of g.bullets){if(b.kind==='gun'){c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle='#fff3bb';c.strokeStyle='#9e764f';c.lineWidth=1.5;c.beginPath();c.roundRect(-12,-3,21,6,3);c.fill();c.stroke();if(!reduced){c.strokeStyle='#f8db9a99';c.lineWidth=3;c.beginPath();c.moveTo(-13,0);c.lineTo(-27,0);c.stroke();}c.restore();continue;}if(b.kind==='bomb'){const rise=Math.sin(Math.min(1,b.age/.7)*Math.PI)*55;if(!sprite(c,images.effects,'star',b.x,b.y-rise,25,g.time*3))circle(c,b.x,b.y-rise,9,'#eed39e');continue;}const size=b.kind==='boulder'?68:b.kind==='chain'?24:17;if(b.kind==='chain'&&!reduced){c.strokeStyle='#bde7c9aa';c.lineWidth=3;c.beginPath();c.moveTo(b.x-b.vx*.045,b.y-b.vy*.045);c.lineTo(b.x,b.y);c.stroke();}if(!sprite(c,images.effects,'rock',b.x,b.y,size,reduced?0:g.time*6))circle(c,b.x,b.y,size/2,b.kind==='chain'?'#c5e8bb':'#dfc6a5');}
 for(const b of g.shots){circle(c,b.x,b.y,b.radius+3,'#e8a2b83b');circle(c,b.x,b.y,b.radius,b.kind==='magic'?'#91bce8':'#df97b0');c.strokeStyle='#985069';c.lineWidth=1.6;c.beginPath();c.arc(b.x,b.y,b.radius,0,TAU);c.stroke();circle(c,b.x-2,b.y-2,2,'#fff0d5');}
 for(const e of g.effects){const f=e.age/e.life;if(e.kind==='slash'||e.kind==='blink'){ring(c,e.x,e.y,e.kind==='slash'?e.radius:25+f*55,'#9462a3',e.kind==='slash'?'#cda6d23c':'#d7bde02c');}else if(e.kind==='hit'){if(!reduced)sprite(c,images.effects,'star',e.x,e.y-10,35*(1-f),0,1-f);}else if(e.kind==='muzzle'){if(!reduced)sprite(c,images.effects,'muzzle',e.x,e.y,35,Math.PI/2,1-f);}else if(e.kind==='bolt'){if(!reduced)sprite(c,images.effects,'bolt',e.x,e.y-48,46,0,1-f,120);circle(c,e.x,e.y,18*(1-f),'#dcecf670');}else if(e.kind==='blast'){c.save();c.globalAlpha=(1-f)*.55;c.strokeStyle='#f0c499';c.fillStyle='#f2c28d33';c.lineWidth=4;c.beginPath();c.arc(e.x,e.y,e.radius*(.5+.5*f),0,TAU);c.fill();c.stroke();c.restore();}else if(!reduced){c.save();c.globalAlpha=1-f;c.strokeStyle='#d5e7c5';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,15+f*22,0,TAU);c.stroke();c.restore();}}
 if(!reduced)for(const n of g.numbers){c.save();c.globalAlpha=Math.min(1,(.6-n.age)*4);text(c,n.value,n.x,n.y-n.age*35,n.value>55?22:15,n.value>55?'#a56a3d':'#76524b');c.restore();}
 c.restore();
 const edge=c.createRadialGradient(width/2,height/2,Math.min(width,height)*.2,width/2,height/2,Math.max(width,height)*.7);edge.addColorStop(0,'#55634d00');edge.addColorStop(1,'#55634d18');c.fillStyle=edge;c.fillRect(0,0,width,height);
 const boss=g.enemies.find(e=>e.final&&!e.dead)||g.enemies.find(e=>e.boss&&!e.dead)||g.world.points.filter(q=>q.type==='rift'&&(q.state!=='done'||g.seals===2&&g.time>=120&&g.time<165&&!g.finalSpawned)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(boss){const bx=(boss.x-left)*zoom,by=(boss.y-top)*zoom;if(bx<0||bx>width||by<0||by>height){const x=Math.max(32,Math.min(width-32,bx)),y=Math.max(125,Math.min(Math.max(145,height-140),by)),a=Math.atan2(by-y,bx-x);c.save();c.translate(x,y);circle(c,0,0,20,'#fff2dceb');c.rotate(a);c.fillStyle='#946a9d';c.beginPath();c.moveTo(10,0);c.lineTo(-5,-7);c.lineTo(-5,7);c.closePath();c.fill();c.rotate(-a);text(c,boss.type?(boss.state==='done'?'조기 소환':'균열'):'수호자',0,34,12,'#876587');c.restore();}}
}
