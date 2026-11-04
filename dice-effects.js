// Presentation only. Pure time sampling; no combat, RNG, clocks or input writes.
import {butterMuzzleOffset,butterReleasePoint} from './butter-original-motion.js';
export const EFFECT_ATLAS='./assets/dice-fx54/particles.png';
export const EFFECT_REGIONS={rock:[42,42,43,43],star:[136,8,112,112],flare:[264,8,112,112],muzzle:[392,8,112,112],ring:[8,136,112,112],dust:[136,136,112,112],bolt:[264,136,112,112],trace:[392,136,112,112]};
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
export function shotGeometry(g){
 const type=g.action?.type||'normal',duration=g.action?.duration||(type==='high'?1.1:.75),release=butterReleasePoint(type)*duration;
 const muzzle=butterMuzzleOffset({size:80,action:{type,time:release,duration}});
 return {release,hitAt:g.pending?.hitAt??release+.3,from:{x:190+muzzle.x,y:220+muzzle.y},to:{x:810,y:185},arc:type==='high'?42:28,large:type==='high'};
}
export function flightPoint(geometry,progress){const f=clamp(progress),{from,to,arc}=geometry;return {x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f-Math.sin(f*Math.PI)*arc,angle:Math.atan2(to.y-from.y-Math.PI*arc*Math.cos(f*Math.PI),to.x-from.x)};}
export function sampleDiceEffects(g,{reduced=false}={}){
 const p=g.pending,phase=g.phase==='paused'?g.returnPhase:g.phase;if(phase!=='resolve'||!p)return [];
 const geometry=shotGeometry(g),{release,hitAt,large}=geometry,t=p.clock,age=t-hitAt,sprites=[];
 const add=(id,x,y,size,alpha=1,angle=0,blend='source-over',height=size)=>{if(alpha>.001)sprites.push({id,x,y,width:size,height,alpha:clamp(alpha),angle,blend});};
 const weather=p.result.steps.some(s=>s.source==='weather'),rage=p.result.rageSpent;
 if(reduced){if(p.applied&&age>=0&&age<.28)add('ring',810,185,large?75:55,.35);return sprites;}
 const flashAge=t-release;
 if(flashAge>=0&&flashAge<.13){const life=1-flashAge/.13;add('muzzle',geometry.from.x+10,geometry.from.y,large?90:55,life,-Math.PI/2,'lighter');add('flare',geometry.from.x,geometry.from.y,large?75:46,life*.7,flashAge*3,'lighter');}
 const progress=(t-release)/(hitAt-release);
 if(progress>=0&&progress<1){
  for(let i=7;i>=1;i--){const f=progress-i*.024/(hitAt-release);if(f<0)continue;const q=flightPoint(geometry,f);add('trace',q.x,q.y,large?85:65,(1-i/8)*.65,q.angle-Math.PI/2,'lighter');}
  const q=flightPoint(geometry,progress);add('flare',q.x,q.y,large?110:65,rage ? .8 : .4,t*2,'lighter');
  add('rock',q.x,q.y,large?48:26,1,t*(large?8:15));
  for(let i=0;i<4;i++){const f=progress-i*.045/(hitAt-release);if(f<0)continue;const v=flightPoint(geometry,f),s=Math.sin(i*2.3+t*10);add('star',v.x,v.y+s*12,large?38:26,(1-i/5)*.8,t*4+i,'lighter');}
 }
 if(p.applied&&age>=0&&age<.33){
  const f=age/.33,fade=1-f;
  add('ring',810,185,(large?70:35)+f*(large?115:80),fade*.7,0,'lighter');
  add('flare',810,185,(large?155:95)*(1-f*.45),fade*.9,age*2,'lighter');
  add('dust',810+f*12,195+f*12,50+f*70,fade*.28);
  for(let i=0;i<(large?10:7);i++){
   const a=i*2.399963+(g.attacks%7)*.2,d=(large?28:16)+f*(large?95:62),x=810+Math.cos(a)*d,y=185+Math.sin(a)*d*.6+f*f*15;
   add('star',x,y,(large?45:32)*fade,fade,a+f*3,'lighter');
  }
  if(rage)add('ring',810,185,80+f*140,fade*.65,0,'lighter');
  // A bolt only accompanies actual weather-chip activations, not ownership.
  if(weather){add('bolt',810,116,105,fade*.8,0,'lighter',190);if(large)add('bolt',840,126,65,fade*.55,.2,'lighter',150);}
  if(p.result.stun)for(let i=0;i<3;i++){const a=i*TAU/3+f*2;add('star',810+Math.cos(a)*35,112+Math.sin(a)*9,35,fade,a,'lighter');}
 }
 return sprites;
}
export function drawDiceEffects(c,g,image,options={}){
 const sprites=sampleDiceEffects(g,options),loaded=Boolean(image?.naturalWidth);
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 for(const s of sprites){c.save();c.globalAlpha=s.alpha;c.globalCompositeOperation=s.blend;c.translate(s.x,s.y);c.rotate(s.angle);
  if(loaded)c.drawImage(image,...EFFECT_REGIONS[s.id],-s.width/2,-s.height/2,s.width,s.height);
  // Optional atlas failure: only a small readable shot, never a start failure.
  else if(s.id==='rock'){c.fillStyle='#d3c2ba';c.beginPath();c.arc(0,0,s.width/2,0,TAU);c.fill();}
  c.restore();
 }
 c.restore();return {sprites:sprites.length,loaded};
}
