import {TEMPLATES,ROLE_COST} from './dungeon76-encounters.js';
import {hash,random,templateIndex,scalePoint,reachable,nearestFree,boundsFor} from './dungeon80-world.js';
export {TEMPLATES,ROLE_COST};
export const CURVE={hp:[1,1.38,1.85],damage:[0,2,4],budget:[5.3,6.7,8.3],bossHP:[600,900,1250]};
export function encounterFor(seed,r,wave=0){
 const t=TEMPLATES[templateIndex(seed,r,wave)],rng={rng:hash(r.layoutKey+':roster:'+wave)},banks=[['fan','archer','rusher'],['guard','caster','archer'],['rusher','guard','caster','fan']],bank=r.branch==='canopy'?['guard','rusher','fan']:banks[r.level],budget=CURVE.budget[r.level]+Math.min(1.6,r.depth*.15)+(r.route==='wild'?1:r.route==='eclipse'?1.4:0)+wave*.6;
 const roles=[],ais=[];let threat=0,i=0;while(roles.length<8&&i++<20){const role=roles.length<2?bank[roles.length]:bank[Math.floor(random(rng)*bank.length)],cost=ROLE_COST[role];if(threat+cost>budget)continue;roles.push(role);threat+=cost;const advanced=r.level>0||r.depth>2||r.route==='eclipse';ais.push(advanced&&role==='archer'?(r.branch==='echo'?'orbit':random(rng)<.5?'turret':'orbit'):advanced&&role==='caster'?(r.branch==='echo'?'summoner':random(rng)<.5?'blink':'summoner'):advanced&&role==='fan'&&r.level>0?'burrow':'normal');}
 const flip=hash(r.layoutKey)%2,slots=[{x:390,y:470},{x:900,y:330},{x:880,y:570},{x:640,y:330},{x:340,y:330},{x:960,y:470},{x:640,y:575},{x:890,y:430}].map(p=>scalePoint(r,{x:flip?1280-p.x:p.x,y:p.y}));
 return {id:t.id+':'+wave,name:t.name,hint:wave?'다른 편성의 다음 무리':'엄폐와 적의 준비 동작을 살펴보세요.',budget,threat,roles,ais,slots};
}
export function safeFormation(r,plan,entry){const a=boundsFor(r),used=[];return plan.roles.map((role,i)=>{const goal=plan.slots[i%plan.slots.length],spots=[];for(let y=a.top+80;y<a.bottom-50;y+=40)for(let x=a.left+80;x<a.right-50;x+=40)if(reachable(r,{x,y},32)&&Math.hypot(x-entry.x,y-entry.y)>200&&used.every(p=>Math.hypot(x-p.x,y-p.y)>65))spots.push({x,y});const p=spots.sort((a,b)=>Math.hypot(a.x-goal.x,a.y-goal.y)-Math.hypot(b.x-goal.x,b.y-goal.y))[0]||nearestFree(r,goal,32);used.push(p);return {...p,role,ai:plan.ais[i]};});}
export const clampPoint=p=>({x:Math.max(185,Math.min(1095,p.x)),y:Math.max(260,Math.min(625,p.y))});
