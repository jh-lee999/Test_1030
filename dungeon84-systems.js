import {ACTIVES,ITEMS} from './dungeon84-content.js';
import {hash,random,nearestFree,viewFor} from './dungeon84-world.js';
import {drawArtifact,reservedItems} from './dungeon84-economy.js';
import {availableArtifacts,artifactPosition,addGoldenChest} from './dungeon84-loot.js';
import {shotProfile,inheritedChild} from './dungeon84-build.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function initExtras(g,r){
 if(r.type==='puzzle'){const pads=g.unlocks.includes('puzzleMaster')&&hash(r.layoutKey)%2?[{x:640,y:310},{x:860,y:440},{x:640,y:570},{x:420,y:440}]:[{x:420,y:330},{x:860,y:330},{x:420,y:550},{x:860,y:550}],rng={rng:hash(r.layoutKey+':pads')};for(let i=pads.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[pads[i],pads[j]]=[pads[j],pads[i]];}r.puzzle={pads,step:0,active:false,done:false,latch:-1};}
 if(r.type==='forge')r.forge={used:false,item:drawArtifact(g,'forge',reservedItems(g)),cost:4+g.floorIndex*2};
}
export function puzzleTick(g,api){const r=g.rooms[g.room],p=r.puzzle;if(!p||!p.active||p.done)return;const index=p.pads.findIndex(q=>dist(q,g.player)<32);if(index<0){p.latch=-1;return;}if(index===p.latch)return;p.latch=index;if(index!==p.step){p.step=0;api.damage(6,{kind:'hazard',label:'발자국 순서',x:p.pads[index].x,y:p.pads[index].y});return;}p.step++;api.effect('pickup',g.player.x,g.player.y,{life:.3});if(p.step===p.pads.length){p.done=true;p.active=false;g.puzzlesCompleted++;addGoldenChest(g,r,{x:640,y:430});api.note('발자국 완주 · 황금상자가 나타났어요!');}}
export function equipActive(g,item,charge=0){const d=ITEMS[item];if(!d?.active)return false;const old=g.active;if(old?.id===d.active)return false;if(old){const r=g.rooms[g.room];r.artifacts=r.artifacts.filter(q=>q.source!=='swap'||!q.taken);const p=artifactPosition(g,r,{x:g.player.x+100,y:g.player.y});r.artifacts.push({id:++g.id,...p,item:'active_'+old.id,charge:old.charge,taken:false,source:'swap'});}g.active={id:d.active,charge:Math.max(0,Math.min(ACTIVES[d.active].cost,charge))};g.found=[...new Set([...g.found,item])];return true;}
export function useActive(g,api){
 const a=g.active,r=g.rooms[g.room];if(g.phase!=='playing'||!a||a.charge<ACTIVES[a.id].cost||g.player.action?.type==='high')return false;
 const qs=availableArtifacts(g),live=r.enemies.filter(e=>e.hp>0),shots=g.hostile.slice(0,24);
 if(a.id==='dice'&&!qs.length||a.id==='clapper'&&!shots.length||a.id==='lantern'&&(!['lost','dusk'].includes(g.curse)||g.curseLifted)&&!live.length||a.id==='pocket'&&g.room===0)return false;
 a.charge=0;g.activeUses++;g.telemetry.active=(g.telemetry.active||0)+1;
 if(a.id==='lantern'){if(['lost','dusk'].includes(g.curse))g.curseLifted=true;for(const e of live)e.slow=g.time+1.5;api.effect('pulse',g.player.x,g.player.y,{radius:180,life:.6});}
 if(a.id==='dice')for(const q of qs){if(q.item&&!g.discarded.includes(q.item))g.discarded.push(q.item);q.item=drawArtifact(g,['boss','angel','crate','goldChest','treasure'].includes(q.source)?q.source:'treasure',reservedItems(g,q));q.charge=0;}
 if(a.id==='clapper'){g.hostile.splice(0,shots.length);for(const b of shots){const e=api.nearest(b);if(e)api.spawn(inheritedChild(shotProfile(g),.65),b.x,b.y,Math.atan2(e.y-26-b.y,e.x-b.x));}}
 if(a.id==='pocket')api.warp();api.emit('ultimate');return true;
}
export function forge(g,api){const r=g.rooms[g.room],f=r.forge,old=g.items.at(-1);if(g.phase!=='playing'||!f||f.used||!f.item||!old||g.items.includes(f.item)||ITEMS[f.item].active===g.active?.id&&!!g.active||g.coins<f.cost||dist(g.player,{x:640,y:430})>=95)return false;g.coins-=f.cost;g.spent+=f.cost;g.items.pop();g.discarded.push(old);if(!api.weapons().includes(g.weapon))g.weapon='standard';g.player.hp=Math.min(g.player.hp,api.stats().maxHp);f.used=true;api.take(f.item);api.note(ITEMS[old].name+'을 재봉해서 '+ITEMS[f.item].name+' 획득');return true;}
export function openPerformanceGate(g,r){const bonus=g.rooms.find(q=>q.type==='omen');if(!bonus)return null;const chance=Math.max(.1,Math.min(.85,.15+(g.floorHits===0?.35:0)+(r.hitsTaken===0?.25:0)-(g.lastGateFloor===g.floorIndex-1?.15:0))),rng={rng:hash(g.floorSeed+':earnedGate')};if(random(rng)>=chance)return null;bonus.enabled=true;bonus.unlocked=true;bonus.type=g.deals===0&&random(rng)<.5?'angel':'devil';g.lastGateFloor=g.floorIndex;return bonus.type;}
export function carryStones(g,from,to){const a=viewFor(from),b=viewFor(to);g.bullets=g.bullets.filter(s=>s.kind==='boulder');for(const s of g.bullets){const margin=50*(s.radius||36)/36;s.x=Math.max(margin,Math.min(b.width-margin,s.x/a.width*b.width));s.y=Math.max(margin,Math.min(b.height-margin,s.y/a.height*b.height));s.hits={};}}
