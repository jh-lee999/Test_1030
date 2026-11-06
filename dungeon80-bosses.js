import {hash,random} from './dungeon80-world.js';
import {moveBody,steer,nearestFree,FLOOR} from './dungeon80-world.js';
import {hurtPoint} from './dungeon80-build.js';
import {clampPoint} from './dungeon80-encounters.js';
const TAU=Math.PI*2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const BOSS_PATTERNS={
 velvet:[{id:'spin',name:'원심 분리',tell:1.05,active:1.65,recover:1.35},{id:'slam',name:'세 갈래 충격',tell:1.1,active:.45,recover:1.5},{id:'charge',name:'도끼 돌진',tell:.95,active:.6,recover:1.45}],
 erpin:[{id:'volley',name:'마력탄 연사',tell:1,active:.8,recover:1.3},{id:'fan',name:'벌어지는 마력',tell:1.05,active:.55,recover:1.4},{id:'runes',name:'낙하 마법진',tell:1.15,active:.45,recover:1.5}],
 shady:[{id:'ambush',name:'뒤편의 그림자',tell:1.1,active:1.1,recover:1.4},{id:'orbit',name:'틈이 있는 탄막',tell:1.1,active:.65,recover:1.4},{id:'rift',name:'엇갈린 균열',tell:1.15,active:.45,recover:1.5}],
};
export const patternOf=e=>BOSS_PATTERNS[e.role]?.find(p=>p.id===e.pattern);
// Additional phases still use the complete original high/skill/strike clips.
BOSS_PATTERNS.velvet.push({id:'whirlCharge',name:'휘어지는 원심 분리',tell:1.1,active:1.2,recover:1.4,minPhase:2});
BOSS_PATTERNS.erpin.push({id:'cascade',name:'차례로 떨어지는 별',tell:1.2,active:.8,recover:1.5,minPhase:2});
BOSS_PATTERNS.shady.push({id:'veil',name:'두 겹의 그림자',tell:1.1,active:1.1,recover:1.4,minPhase:2});
function lockPattern(g,e){
 const r=g.rooms[g.room],p=g.player,defs=BOSS_PATTERNS[e.role],rng={rng:e.patternRng??hash(g.seed+':boss80:'+e.id)},phase=e.hp/e.maxHp<.25?3:e.hp/e.maxHp<.5?2:1,pool=defs.filter(p=>p.id!==e.pattern&&(p.minPhase||1)<=phase),distance=dist(e,p),weight=d=>(['spin','ambush','veil'].includes(d.id)?distance<250?2:1:['charge','whirlCharge'].includes(d.id)?distance>240?2:.7:1)*((e.patternHistory||[]).includes(d.id)?.45:1);let ticket=random(rng)*pool.reduce((n,d)=>n+weight(d),0),def=pool.at(-1);for(const d of pool){ticket-=weight(d);if(ticket<=0){def=d;break;}}e.patternRng=rng.rng;e.patternHistory=[...(e.patternHistory||[]),def.id].slice(-3);e.phaseStage=phase;e.pattern=def.id;e.attack++;e.enraged=e.hp<e.maxHp/2;e.aimX=p.x;e.aimY=p.y;e.lockAngle=Math.atan2(p.y-e.y,p.x-e.x);e.targets=[];
 const safe=t=>nearestFree(r,clampPoint(t),32);
 if(def.id==='ambush'){const q=safe(p);e.aimX=q.x;e.aimY=q.y;e.targets=[{...q,r:e.enraged?88:82}];}
 if(def.id==='slam'||def.id==='runes'){const count=e.enraged?4:3;for(let i=0;i<count;i++)e.targets.push({...safe({x:p.x+(i-(count-1)/2)*125,y:p.y+(i%2?45:-45)}),r:def.id==='slam'?62:55});}
 if(def.id==='rift'){
  const x=Math.max(FLOOR.left+35,Math.min(FLOOR.right-91,p.x-28)),y=Math.max(FLOOR.top+35,Math.min(FLOOR.bottom-87,p.y-26));
  e.targets=[{x,y:245,w:56,h:390},{x:205,y,w:870,h:52}];if(e.enraged)e.targets.push({...safe(e),r:75});
 }
 if(def.id==='cascade')for(let i=0;i<4;i++)e.targets.push({...safe({x:p.x+(i-1.5)*110,y:p.y+(i%2?70:-70)}),r:43});
 if(def.id==='veil')e.targets=[safe({x:p.x-130,y:p.y}),safe({x:p.x+130,y:p.y})].map(q=>({...q,r:60}));
 e.state='tell';e.timer=def.tell;e.action={type:e.role==='velvet'?'high':'skill',time:0,duration:def.tell+def.active+def.recover};e.pulse=0;e.volley=0;e.volleyClock=0;
}
export function bossStep(g,e,dt,api){
 const r=g.rooms[g.room],p=g.player;
 if(e.affix==='summoner'&&e.state==='attack'&&(e.summonAt||0)<=g.time&&r.enemies.length<8){e.summonAt=g.time+9;api.summon?.('fan',e.x+70,e.y);}
 if(e.state==='move'){
  if(e.role!=='erpin'||dist(e,p)>390||!api.los(hurtPoint(e),hurtPoint(p)))steer(r,e,p,dt,e.speed,e.radius);
  if(e.timer<=0)lockPattern(g,e);return;
 }
 const def=patternOf(e);if(!def)return;
 if(e.state==='tell'&&e.timer<=0){
  e.state='attack';e.timer=def.active;e.attackElapsed=0;e.pulse=0;
  if(def.id==='ambush'){const q=nearestFree(r,{x:e.aimX,y:e.aimY},32);e.x=q.x;e.y=q.y;api.effect('pulse',q.x,q.y,{radius:90,life:.3});}
  if(['charge','spin','whirlCharge'].includes(def.id)){const speed=def.id==='charge'?(e.enraged?460:400):def.id==='whirlCharge'?210:(e.enraged?165:140);e.vx=Math.cos(e.lockAngle)*speed;e.vy=Math.sin(e.lockAngle)*speed;}
 }
 if(e.state==='attack'){
  e.attackElapsed=(e.attackElapsed||0)+dt;e.pulse-=dt;e.volleyClock-=dt;
  if(def.id==='spin'||def.id==='charge')moveBody(r,e,e.vx*dt,e.vy*dt,e.radius);
  if(def.id==='whirlCharge'){if(!e.turned&&e.attackElapsed>=.6){const a=e.lockAngle+(e.attack%2?1:-1)*.8;e.vx=Math.cos(a)*210;e.vy=Math.sin(a)*210;e.turned=true;}moveBody(r,e,e.vx*dt,e.vy*dt,e.radius);if(e.pulse<=0){e.pulse=.4;api.effect('slash',e.x,e.y,{radius:110});if(dist(e,p)<110)api.damage(e.damage,{kind:'boss',label:def.name,x:e.x,y:e.y});}}
  if(def.id==='cascade'&&e.volley<e.targets.length&&e.attackElapsed>=e.volley*.18){const t=e.targets[e.volley++];api.effect('pulse',t.x,t.y,{radius:t.r,life:.3});if(dist(p,t)<t.r)api.damage(e.damage,{kind:'boss',label:def.name,x:t.x,y:t.y});}
  if(def.id==='veil'&&e.volley<2&&e.attackElapsed>=e.volley*.55){const t=e.targets[e.volley++];e.x=t.x;e.y=t.y;api.effect('slash',t.x,t.y,{radius:60,life:.3});if(dist(p,t)<60)api.damage(e.damage,{kind:'boss',label:def.name,x:t.x,y:t.y});}
  if(['spin','ambush'].includes(def.id)&&e.pulse<=0){e.pulse=.27;const radius=def.id==='spin'?(e.enraged?148:132):(e.enraged?88:82);api.effect('slash',e.x,e.y,{radius});if(dist(e,p)<radius)api.damage(e.damage,{kind:'boss',label:def.name,x:e.x,y:e.y});}
  if(def.id==='volley'&&e.volleyClock<=0&&e.volley<(e.enraged?5:4)){const n=e.enraged?5:4,a=Math.atan2(e.aimY-26-(e.y-26),e.aimX-e.x)+(e.volley-(n-1)/2)*.1;api.shot(e.x,e.y-26,a,250,e.damage);e.volley++;e.volleyClock=.16;}
  if(def.id==='fan'&&e.volley===0){const n=e.enraged?7:5;for(let i=0;i<n;i++)api.shot(e.x,e.y-26,e.lockAngle+(i-(n-1)/2)*.21,190,e.damage);e.volley=1;}
  if(def.id==='orbit'&&e.volley===0){const n=e.enraged?16:12;for(let i=0;i<n;i++){const a=i*TAU/n,d=Math.abs(Math.atan2(Math.sin(a-e.lockAngle),Math.cos(a-e.lockAngle)));if(d>Math.PI/5)api.shot(e.x,e.y-26,a,185,11);}e.volley=1;}
  if(['slam','runes','rift'].includes(def.id)&&e.targets.some(t=>t.r?dist(p,t)<t.r:p.x>t.x&&p.x<t.x+t.w&&p.y>t.y&&p.y<t.y+t.h))api.damage(e.damage,{kind:'boss',label:def.name,x:e.aimX,y:e.aimY});
  if(e.timer<=0){e.state='recover';e.timer=def.recover;e.turned=false;}
 }else if(e.state==='recover'&&e.timer<=0){e.state='move';e.timer=.55;e.action=null;}
}
export function bossTells(e){
 if(!e.boss||!['tell','attack'].includes(e.state))return null;const p=patternOf(e);if(!p)return null;
 const n=p.id==='fan'?(e.enraged?7:5):p.id==='volley'?(e.enraged?5:4):0;
 const angles=Array.from({length:n},(_,i)=>(i-(n-1)/2)*(p.id==='fan'?.21:.1));
 return {name:p.name,phase:e.state,targets:e.targets||[],angle:e.lockAngle,angles,radius:p.id==='spin'?(e.enraged?148:132):p.id==='ambush'?(e.enraged?88:82):0,kind:p.id,range:p.id==='charge'?(e.enraged?460:400)*.6:550};
}
export function bossFrameTime(e){
 const p=patternOf(e);if(!p||!e.action)return {key:'walk',time:e.age};const a=e.action.time,phase=a<p.tell?a/p.tell:a<p.tell+p.active?(a-p.tell)/p.active:(a-p.tell-p.active)/p.recover,part=a<p.tell?0:a<p.tell+p.active?1:2;
 if(e.role==='velvet')return {key:'high',time:part===0?phase*.733333:part===1?.733333+phase*1.933334:2.666667+phase*1.433333};
 if(e.role==='erpin')return {key:'skill',time:part===0?phase*.833333:part===1?.833333+phase*1.3:2.133333+phase*.7};
 return part===0?{key:'skill',time:phase*1.966667}:{key:'strike',time:part===1?.4+phase*.833333:1.233333+phase*.433334};
}
