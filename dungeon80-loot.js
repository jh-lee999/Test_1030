import {drawArtifact} from './dungeon80-economy.js';
import {ITEMS} from './dungeon80-content.js';
import {hash,random,nearestFree,reachable} from './dungeon80-world.js';

export const LOOT_RULES=Object.freeze({crateArtifact:.03,goldArtifact:.30,combatGoldChest:.20,goldKeyCost:1});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function roomArtifacts(r){return [...(r.pedestal&&!r.pedestal.taken?[r.pedestal]:[]),...(r.artifacts||[]).filter(q=>!q.taken)];}
export function availableArtifacts(g){const r=g.rooms[g.room];return roomArtifacts(r).filter(q=>q!==r.pedestal||r.cleared);}
// Reserve physical rewards, including other unopened room pedestals. Merely
// looking at a reward never consumes random numbers or changes its cached ID.
export function rollArtifact(g,options={}){return drawArtifact(g,options.source||'treasure',g.rooms.flatMap(r=>roomArtifacts(r).map(q=>q.item).filter(Boolean)));}
export function artifactPosition(g,r,desired){
 const base=nearestFree(r,desired,32),occupied=roomArtifacts(r);
 const safe=p=>reachable(r,p,32)&&distance(p,g.player)>=84&&occupied.every(q=>distance(p,q)>=68);
 if(safe(base))return base;
 for(const radius of [90,135,180])for(let i=0;i<12;i++){
  const a=i*Math.PI/6,p={x:base.x+Math.cos(a)*radius,y:base.y+Math.sin(a)*radius};if(safe(p))return p;
 }
 // Validated room navigation is connected; use its free grid as a fallback.
 for(let y=245;y<=645;y+=40)for(let x=170;x<=1130;x+=40)if(safe({x,y}))return {x,y};
 throw Error('No reachable artifact landing point');
}
export function dropArtifact(g,desired,source){
 const r=g.rooms[g.room],item=rollArtifact(g,{source,rare:source==='boss'});
 if(!item)return null;
 const p=artifactPosition(g,r,desired),q={id:++g.id,...p,item,taken:false,source};r.artifacts.push(q);return q;
}
export function addGoldenChest(g,r,desired={x:640,y:430}){
 if(r.chests.length)return r.chests[0];
 const p=nearestFree(r,desired,32),q={id:++g.id,...p,opened:false,keyCost:LOOT_RULES.goldKeyCost};r.chests.push(q);return q;
}
export function initContainers(g,r){
 if(['secret','supersecret','archive'].includes(r.type))addGoldenChest(g,r);
 else if(r.type==='combat'){
  // Layout-only RNG: room visit order and crate drops do not reroll placement.
  const rng={rng:hash(r.layoutKey+':gold-chest79')};
  if(random(rng)<LOOT_RULES.combatGoldChest)addGoldenChest(g,r,{x:500+random(rng)*280,y:360+random(rng)*160});
 }
}
