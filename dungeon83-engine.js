import {blockedShot} from './dungeon82-collision.js';
// v82: manual launch, delayed guidance, random post-hit ricochet and reliable crate impacts.
import {steer} from './dungeon81-nav.js';
import {schoolRanks,awardXP,openLesson,chooseLesson} from './dungeon80-growth.js';
import {initExtras,puzzleTick,equipActive,useActive as activate,forge as sew,openPerformanceGate,carryStones} from './dungeon80-systems.js';
import {floorRules,boundsFor,doorsFor,viewFor} from './dungeon80-world.js';
import {CURVE} from './dungeon80-encounters.js';
import {ACTIVES,ROUTES} from './dungeon82-content.js';
import {restockCost,serviceCost} from './dungeon80-economy.js';
export {chooseLesson};
import {LOOT_RULES,rollArtifact,artifactPosition,dropArtifact,availableArtifacts,initContainers,addGoldenChest} from './dungeon80-loot.js';
import {advanceButterGait,butterReleasePoint,butterMuzzleOffset} from './butter-gun-motion71.js';
import {ITEMS,ROLES,combos,FLOORS,AUGMENTS,HEROES,rarityOf} from './dungeon82-content.js';
import {generateFloor,makeObstacles,makeTerrain,makeBiome,FLOOR,DIRECTIONS,links,blocked,moveBody,nearestFree,reachable,hash,random,VIEW} from './dungeon80-world.js';
import {buildStats,shotProfile,weaponIds,inheritedChild,hurtPoint,PLAYER_HURT_RADIUS} from './dungeon82-build.js';
import {artifactOffers,clearReward,eventQuote,itemPrice,shopPrice} from './dungeon80-economy.js';
import {encounterFor,safeFormation} from './dungeon80-encounters.js';
import {bossStep} from './dungeon80-bosses.js';
import {tickBiome} from './dungeon80-biome.js';
import {emptyProgress,startSelection} from './dungeon80-progress.js';
import {spawnPlan,advanceFriendly} from './dungeon83-shots.js';
export {ITEMS,combos,FLOORS,AUGMENTS,VIEW,FLOOR,links,shopPrice};
export const current=g=>g.rooms[g.room];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=e=>e.hp>0;
const has=(g,id)=>g.items.includes(id)||!!ITEMS[id]?.active&&g.active?.id===ITEMS[id].active,rnd=g=>random(g.loot),TAU=Math.PI*2;
export const stats=buildStats;
export function createGame(seed=Date.now(),options={}){
 const label=String(seed).trim().slice(0,48)||'BUTTER',g={version:80,floorIndex:0,history:[],floorStartedAt:0,seed:label,runId:label+':'+Date.now(),phase:'playing',returnPhase:null,room:0,rooms:[],time:0,id:0,loot:{rng:hash(label+':loot77')},items:[],augments:[],salvageCount:0,repulseAt:0,coins:5,keys:1,bombs:2,battery:3,shots:0,hits:0,primaryHits:0,kills:0,clears:0,damageTaken:0,bullets:[],hostile:[],queue:[],zones:[],effects:[],numbers:[],choice:null,trial:null,notice:'황금방과 보스를 찾아 유물을 모으자. 나무상자에도 작은 행운이 숨어 있어요.',noticeUntil:5,transition:0,roomBanner:3,telemetry:{homing:0,echo:0,collection:0,coinsLost:0,charged:0,ward:0,shots:0,gun:0,ricochet:0,lightning:0,split:0,fire:0,parry:0,boulder:0,bounce:0,wallBounce:0,frozen:0,pulse:0,fragments:0,terrainBroken:0,trials:0,autoItems:0,augEcho:0,augTrail:0,augSalvage:0,augRepulse:0,damageBy:{}},player:{x:640,y:470,hp:70,facing:-1,invuln:0,fireTimer:0,action:null,aim:{x:1,y:0},gait:{phase:0,amount:0,clock:0}}};const selection=startSelection(options.progress||emptyProgress(),options);Object.assign(g,selection,{loadout:'random',hpCap:HEROES[selection.hero].hp,shield:0,weapon:'standard',rewardRng:{rng:hash(label+':rewards77')},supplyDry:0,achievements:emptyProgress(),audioSerial:0,audioEvents:[],lastHit:null,pickupDelta:null,nextTellAt:0,doorIntent:0});g.player.hp=g.hpCap;g.player.charge=0;Object.assign(g,{combatLog:[],previousEscapes:options.progress?.escapes||0,school:{level:1,xp:0,junior:1,senior:1,pending:[]},poolMix:{},discarded:[],active:null,found:[],activeUses:0,puzzlesCompleted:0,regionPath:['root'],floorSeed:label,curse:floorRules(label,0).curse,curseLifted:false,floorHits:0,deals:0,lastGateFloor:-9,spent:0,floorCoins:0,combatRng:{rng:hash(label+':combat80')}});g.rooms=generateFloor(label,0,g.route,'root');initRoom(g,current(g));return g;
}
export function emit(g,kind){g.audioEvents.push({id:++g.audioSerial,kind});if(g.audioEvents.length>24)g.audioEvents.shift();}
function note(g,s){g.notice=s;g.noticeUntil=g.time+4;}
function effect(g,kind,x,y,extra={}){g.effects.push({kind,x,y,age:0,life:.35,...extra});if(g.effects.length>90)g.effects.shift();}
function pickup(g,kind,x,y,value=1){const p=nearestFree(current(g),{x,y},32);current(g).pickups.push({id:++g.id,kind,x:p.x,y:p.y,value});}
function bullet(g,b){if(g.bullets.length>=100)return;g.bullets.push({id:++g.id,age:0,life:1.8,radius:7,damage:14,hits:{},child:false,pierce:0,...b});}
function shot(g,x,y,a,speed=235,damage=10){if(g.hostile.length>=90)return;g.hostile.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage,life:6,radius:8,label:'적 탄환'});}
function shotAPI(g){return {bullet:b=>bullet(g,b),hit:(e,a,s)=>hit(g,e,a,s),area:(x,y,r,d,s)=>area(g,x,y,r,d,s),effect:(k,x,y,o)=>effect(g,k,x,y,o),lightning:e=>lightning(g,e),nearest:(b,e,r,accept)=>nearest(g,b,e,r,accept),los:(a,b)=>clearShot(current(g),a,b),breakCrate:o=>breakCrate(g,o)};}
export function spawnEnemy(g,role,x,y){const r=ROLES[role],scale=r.boss?CURVE.bossHP[g.floorIndex]/r.hp:CURVE.hp[g.floorIndex],e={id:++g.id,role,x,y,hp:Math.round(r.hp*scale),maxHp:Math.round(r.hp*scale),radius:r.radius,speed:r.speed,damage:r.damage+(r.boss?0:CURVE.damage[g.floorIndex]),boss:!!r.boss,state:'move',timer:.8+(g.id%5)*.18,age:0,appear:.7,flash:0,burn:0,slow:0,aimX:x,aimY:y,attack:0,action:null};current(g).enemies.push(e);return e;}
function offers(g,n=3){return artifactOffers(g,n,{source:current(g).type==='shop'?'shop':'treasure'});}
function spawnWave(g,r,wave=0){
 const plan=encounterFor(g.seed,r,wave);r.encounter=plan;
 for(const p of safeFormation(r,plan,g.player))spawnEnemy(g,p.role,p.x,p.y).ai=p.ai;
}
function initRoom(g,r){
 if(r.initialized)return;r.initialized=true;r.obstacles=makeObstacles(g.seed,r);r.terrain=makeTerrain(g.seed,r);r.biome=makeBiome(g.seed,r);r.damageStart=g.damageTaken;r.hitsTaken=0;r.shots=0;r.kills=0;r.combatStartedAt=g.time;
 if(!['combat','boss'].includes(r.type))r.cleared=true;
 if(r.type==='treasure')r.pedestal={x:640,y:415,item:rollArtifact(g,{source:'treasure'}),taken:false,source:'treasure'};
 initContainers(g,r);initExtras(g,r);
 if(r.type==='angel')r.pedestal={x:640,y:415,item:rollArtifact(g,{source:'angel'}),taken:false,source:'angel'};
 if(r.type==='devil')r.deal={item:rollArtifact(g,{source:'devil'}),used:false,cost:12};
 if(['sanctuary','bargain','rush'].includes(r.type))r.event={used:false,reward:r.type==='bargain'?artifactOffers(g,1,{source:'devil'})[0]||null:null};
 if(r.type==='rush')r.rush={state:'ready',deadline:0};
 if(r.type==='shop'){r.stock=offers(g).map((id,i)=>({id,price:itemPrice(id,g),sold:false,x:460+i*180,y:410}));r.stock.push({id:'heal',price:serviceCost(g),sold:false,x:550,y:575},{id:'key',price:serviceCost(g),sold:false,x:730,y:575});}
 if(['secret','supersecret'].includes(r.type)){for(let i=0;i<4;i++)pickup(g,'coin',520+i*80,530,2);pickup(g,'heart',640,570,14);}
 if(r.type==='combat')spawnWave(g,r);
 if(r.type==='boss'){const p=nearestFree(r,{x:820,y:430},32);const pool=g.floorIndex===0?['velvet','erpin']:g.floorIndex===1?['velvet','erpin','shady']:['shady','erpin'],rng={rng:hash(r.layoutKey+':boss')};r.bossRole=pool[Math.floor(random(rng)*pool.length)];const boss=spawnEnemy(g,r.bossRole,p.x,p.y);if(g.route==='eclipse'||g.floorIndex>0&&random(rng)<.35){boss.affix=['bulwark','swift','summoner','mirror'][Math.floor(random(rng)*4)];if(boss.affix==='swift')boss.speed*=1.18;if(boss.affix==='bulwark'){boss.hp=Math.round(boss.hp*1.15);boss.maxHp=boss.hp;}}}
}
export function nextFloor(g,branch){
 const r=current(g),p=g.player,options=g.floorIndex===0?['canopy','archive']:['moon','echo'];if(branch&&!options.includes(branch))return false;if(g.phase!=='playing'||r.type!=='boss'||!r.cleared||g.floorIndex<FLOORS.length-1&&!r.augment?.taken||dist(p,{x:branch?900:640,y:420})>=100||p.action?.type==='high')return false;
 const summary={floor:g.floorIndex,time:g.time-g.floorStartedAt,clears:g.rooms.filter(r=>r.rewarded).length,visited:g.rooms.filter(r=>r.visited).length,items:[...g.items],augments:[...g.augments]};g.history.push(summary);
 if(g.floorIndex===FLOORS.length-1){g.phase='won';note(g,'세 겹의 아공간에서 빠져나왔어요!');return true;}
 g.floorIndex++;g.regionPath.push(branch||options[0]);g.floorSeed=g.seed+':path80:'+g.regionPath.join('/');g.curse=floorRules(g.floorSeed,g.floorIndex,g.regionPath.at(-1)).curse;g.curseLifted=false;g.floorHits=0;g.floorCoins=0;g.floorStartedAt=g.time;g.rooms=generateFloor(g.floorSeed,g.floorIndex,g.route,g.regionPath.at(-1));g.room=0;p.x=640;p.y=470;p.action=null;p.charge=0;p.invuln=Math.max(p.invuln,.85);g.queue=[];carryStones(g,r,current(g));g.hostile=[];g.zones=[];g.effects=[];g.transition=.6;g.roomBanner=3;initRoom(g,current(g));note(g,(g.floorIndex+1)+'층 · '+FLOORS[g.floorIndex].name+' — '+ROUTES[g.regionPath.at(-1)].text);emit(g,'door');return true;
}
export function acceptTrial(g){
 const r=current(g);if(g.phase!=='trial'||g.trial!==r.id||r.type!=='challenge'||r.challenge.state!=='ready')return false;g.phase='playing';g.trial=null;r.challenge={state:'active',wave:1,damageStart:g.damageTaken,nextWaveAt:0};r.cleared=false;spawnWave(g,r,1);note(g,'도전 시작 · 두 무리를 버티면 황금상자!');return true;
}
export function cancelTrial(g){if(g.phase!=='trial')return false;g.phase='playing';g.trial=null;return true;}
export function restock(g){
 const r=current(g),cost=restockCost(g);if(g.phase!=='playing'||r.type!=='shop'||dist(g.player,{x:310,y:355})>=95||r.restocks>=2||g.coins<cost)return false;
 const pool=offers(g);if(!pool.length)return false;g.coins-=cost;g.spent+=cost;r.restocks++;const services=r.stock.filter(s=>!ITEMS[s.id]);r.stock=[...pool.map((id,i)=>({id,price:itemPrice(id,g),sold:false,x:460+i*180,y:410})),...services];note(g,'재입고 완료 · 회복과 열쇠 재고는 리필되지 않아요.');return true;
}
export function pause(g){if(!['playing','augment','trial','event','lesson'].includes(g.phase))return false;g.player.charge=0;g.returnPhase=g.phase;g.phase='paused';return true;}
export function resume(g){if(g.phase!=='paused')return false;g.phase=g.returnPhase||'playing';g.returnPhase=null;return true;}
export function enterRoom(g,dir){
 if(g.phase!=='playing'||!current(g).cleared||g.player.action?.type==='high'||g.transition>0)return false;
 const l=links(g).find(l=>l.dir===dir);if(!l)return false;const to=g.rooms[l.to];
 if(['secret','supersecret','archive'].includes(to.type)&&!to.unlocked){note(g,'금이 간 벽 · 가까이 폭탄을 놓으면 열려요.');return false;}
 if(to.type==='treasure'&&!to.unlocked){if(g.keys<1){note(g,'금빛 문에는 열쇠가 필요해요.');return false;}g.keys--;to.unlocked=true;}
 const d=DIRECTIONS[dir];g.previousRoom=g.room;g.room=to.id;if(!to.initialized)to.damageStart=g.damageTaken;to.visited=true;to.entered++;const bounds=boundsFor(to),door=doorsFor(to)[d.opposite];g.player.x=door.x+d.dx*75;g.player.y=door.y+d.dy*78;
 g.player.invuln=Math.max(g.player.invuln,.85);g.player.action=null;g.player.charge=0;g.queue=[];carryStones(g,g.rooms[l.from??(g.previousRoom??0)]||to,to);g.hostile=[];g.zones=[];g.effects=[];g.transition=.6;g.roomBanner=2.4;g.doorIntent=0;g.nextTellAt=g.time+.8;initRoom(g,to);Object.assign(g.player,nearestFree(to,g.player,32));if(['secret','supersecret'].includes(to.type))g.achievements.secret=true;emit(g,'door');return true;
}
export function nearby(g){
 const r=current(g),p=g.player;
 if(r.type==='puzzle'&&r.puzzle&&!r.puzzle.active&&!r.puzzle.done&&dist(p,{x:640,y:430})<95)return {kind:'puzzle',text:'발자국 도전 · 빛나는 순서대로 밟기',x:640,y:430};
 if(r.type==='forge'&&r.forge&&!r.forge.used&&dist(p,{x:640,y:430})<95)return {kind:'forge',text:'마지막 유물 '+(ITEMS[g.items.at(-1)]?.name||'없음')+' → '+(ITEMS[r.forge.item]?.name||'후보 없음')+' · '+r.forge.cost+'닢',x:640,y:430};
 if(r.type==='devil'&&r.deal&&!r.deal.used&&dist(p,{x:640,y:430})<95)return {kind:'deal',text:(ITEMS[r.deal.item]?.name||'후보 없음')+' · 최대 HP −'+r.deal.cost,x:640,y:430};
 const chest=r.cleared&&r.chests.find(c=>!c.opened&&dist(p,c)<78);if(chest)return {kind:'chest',chest,text:'황금상자 · 열쇠 1개 · 유물 30%',x:chest.x,y:chest.y};
 if(['sanctuary','bargain','rush'].includes(r.type)&&r.event&&!r.event.used&&dist(p,{x:640,y:430})<95)return {kind:'event',text:r.type==='sanctuary'?'휴식 선택 · '+serviceCost(g)+' 닢':r.type==='bargain'?'최대 체력과 유물 거래':'45초 모래시계 도전',x:640,y:430};
 if(r.type==='shop'){const stock=r.stock.filter(s=>!s.sold&&(!ITEMS[s.id]||!has(g,s.id))&&dist(p,s)<85).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(stock)return {kind:'buy',stock,text:(ITEMS[stock.id]?'['+rarityOf(stock.id).name+(ITEMS[stock.id].troll?' · 트롤':'')+'] '+ITEMS[stock.id].name:(stock.id==='heal'?'체력 22 회복':'열쇠 1개'))+' · '+shopPrice(g,stock)+'닢',x:stock.x,y:stock.y};if(r.restocks<2&&dist(p,{x:310,y:355})<95)return {kind:'restock',text:'새 물건 재입고 · '+restockCost(g)+'닢',x:310,y:355};}
 if(r.type==='challenge'&&r.challenge.state==='ready'&&dist(p,{x:640,y:415})<95)return {kind:'trial',text:'두 무리 도전 · 황금상자 / 무피격 추가 열쇠',x:640,y:415};
 if(r.type==='boss'&&r.cleared&&g.floorIndex<2&&dist(p,{x:900,y:420})<80)return {kind:'exitAlt',text:'다음 층: '+ROUTES[g.floorIndex===0?'archive':'echo'].name,x:900,y:420};
 if(r.type==='boss'&&r.cleared&&dist(p,{x:640,y:420})<100)return {kind:'exit',text:(g.floorIndex<FLOORS.length-1?'다음 층으로 · 보유 자원 유지':'세 겹의 아공간에서 탈출')+(!r.pedestal?.taken?' · 바닥 유물은 남겨두기':''),x:640,y:420};return null;
}
export function interact(g){if(g.phase!=='playing')return false;const n=nearby(g);if(!n)return false;
 if(n.kind==='puzzle'){current(g).puzzle.active=true;note(g,'빛나는 발자국부터 차례로 밟으세요. 틀리면 피해 6!');return true;}
 if(n.kind==='forge')return sew(g,{take:id=>takeItem(g,id),weapons:()=>weaponIds(g),stats:()=>stats(g),note:s=>note(g,s)});
 if(n.kind==='deal'){const d=current(g).deal;if(!d.item||has(g,d.item)||g.hpCap-d.cost<40||stats(g).maxHp-stats({...g,hpCap:g.hpCap-d.cost}).maxHp<d.cost-.01)return false;d.used=true;g.hpCap-=d.cost;g.deals++;g.player.hp=Math.min(g.player.hp,stats(g).maxHp);return takeItem(g,d.item);}
 if(n.kind==='exitAlt')return nextFloor(g,g.floorIndex===0?'archive':'echo');
 if(n.kind==='chest')return openGoldenChest(g,n.chest.id);
 if(n.kind==='event'){g.phase='event';g.player.charge=0;return true;}
 if(n.kind==='buy')return buy(g,n.stock.id);
 if(n.kind==='restock')return restock(g);
 if(n.kind==='trial'){g.phase='trial';g.trial=current(g).id;return true;}
 if(n.kind==='exit')return nextFloor(g);return false;
}
export function takeItem(g,id){if(!Object.hasOwn(ITEMS,id)||has(g,id))return false;if(ITEMS[id].active){if(!equipActive(g,id))return false;effect(g,'item',g.player.x,g.player.y,{life:.6});emit(g,'pickup');note(g,ITEMS[id].name+' 장착 · 전투방을 정리해 충전하세요.');return true;}g.found=[...new Set([...g.found,id])];const before=stats(g),count=combos(g).length;g.items.push(id);if(id==='fireworks')g.bombs+=2;if(id==='ward')g.shield=Math.min(20,g.shield+10);if(ITEMS[id].weapon)g.weapon=ITEMS[id].weapon;if(ITEMS[id].bombsOnAcquire)g.bombs+=ITEMS[id].bombsOnAcquire;if(ITEMS[id].healOnAcquire)g.player.hp+=ITEMS[id].healOnAcquire;g.player.hp=Math.min(g.player.hp,stats(g).maxHp);g.pickupDelta={id,before,after:stats(g),at:g.time};effect(g,'item',g.player.x,g.player.y,{life:1});note(g,combos(g).length>count?'조합 완성 · '+combos(g).at(-1).name:ITEMS[id].name+' · '+ITEMS[id].text);emit(g,'pickup');return true;}
export function cycleWeapon(g){if(g.phase!=='playing'||g.player.action?.type==='high')return false;const ids=weaponIds(g);if(ids.length<2)return false;g.weapon=ids[(ids.indexOf(g.weapon)+1)%ids.length];g.player.charge=0;return true;}
export function cancelEvent(g){if(g.phase!=='event')return false;g.phase='playing';return true;}
export function chooseEvent(g,kind){if(g.phase!=='event')return false;const q=eventQuote(g,kind),r=current(g);if(!q.ok)return false;r.event.used=true;g.phase='playing';
 if(kind==='heal'||kind==='shield'){g.coins-=serviceCost(g);g.spent+=serviceCost(g);if(kind==='heal')g.player.hp+=q.amount;else g.shield+=q.amount;}
 if(kind==='trade'){g.hpCap-=10;g.player.hp=Math.min(g.player.hp,stats(g).maxHp);g.achievements.bargain=true;takeItem(g,q.item);}
 if(kind==='rush'){r.rush={state:'active',deadline:g.time+45};r.cleared=false;r.damageStart=g.damageTaken;spawnWave(g,r,1);}
 emit(g,'pickup');return true;}
// Touch a room artifact to collect it; never open a draft or spend money here.
export function collectArtifact(g){
 if(g.phase!=='playing')return false;const q=availableArtifacts(g).find(q=>dist(g.player,q)<=38);if(!q)return false;
 q.taken=true;
 if(q.item&&!has(g,q.item)){if(ITEMS[q.item].active){equipActive(g,q.item,q.charge||0);emit(g,'pickup');effect(g,'item',q.x,q.y,{life:.6});note(g,ITEMS[q.item].name+' 장착 · X 사용');}else takeItem(g,q.item);g.telemetry.autoItems++;}
 else{const gain=Math.max(0,Math.min(4,99-g.coins,[45,65,85][g.floorIndex]-g.floorCoins));g.coins+=gain;g.floorCoins+=gain;effect(g,'pickup',q.x,q.y,{life:.4});note(g,'이미 모은 선물 대신 동전 4닢!');}
 return true;
}
function augmentOffers(g){const pool=Object.keys(AUGMENTS).filter(id=>!g.augments.includes(id)),out=[];while(pool.length&&out.length<3)out.push(pool.splice(Math.floor(rnd(g)*pool.length),1)[0]);return out;}
export function chooseAugment(g,id){
 const r=current(g);if(g.phase!=='augment'||r.type!=='boss'||!r.cleared||r.augment?.taken||!g.choice?.includes(id)||g.augments.includes(id)||!Object.hasOwn(AUGMENTS,id))return false;
 g.augments.push(id);r.augment.taken=true;g.choice=null;g.phase='playing';effect(g,'item',g.player.x,g.player.y,{life:1});note(g,AUGMENTS[id].name+' · 다음 층까지 계속 적용!');return true;
}
export function breakCrate(g,o,value=1){
 if(g.phase!=='playing'||!current(g).obstacles.includes(o)||o.kind!=='pot'||o.hp<=0)return false;o.hp=0;const reward=random(g.rewardRng),at={x:o.x+o.w/2,y:o.y+o.h/2};if(reward<LOOT_RULES.crateArtifact){if(!dropArtifact(g,at,'crate'))pickup(g,'coin',at.x,at.y,4);}else if(reward<.48)pickup(g,'coin',at.x,at.y,value);else if(reward<.55)pickup(g,'bomb',at.x,at.y);effect(g,'explosion',o.x+o.w/2,o.y+o.h/2,{radius:28,life:.25});
 if(g.augments.includes('salvage')){g.salvageCount++;if(g.salvageCount%3===0){g.bombs++;g.telemetry.augSalvage++;note(g,'나무상자 세 개 · 폭탄 +1!');}}
 emit(g,'crate');return true;
}
export function openGoldenChest(g,id){
 const r=current(g),c=r.chests.find(c=>c.id===id);if(g.phase!=='playing'||!r.cleared||!c||c.opened||dist(g.player,c)>=78)return false;
 if(g.keys<c.keyCost){note(g,'황금상자를 열려면 열쇠 1개가 필요해요.');return false;}
 // Commit exactly once before rolling. Walking over or bombing it never pays.
 c.opened=true;g.keys-=c.keyCost;
 const q=random(g.rewardRng)<LOOT_RULES.goldArtifact?dropArtifact(g,{x:c.x,y:c.y+72},'goldChest'):null;
 if(q)c.result={item:q.item,coins:0,kind:'none'};
 else{const coins=3+Math.floor(random(g.rewardRng)*4),kind=['key','bomb','heart'][Math.floor(random(g.rewardRng)*3)];pickup(g,'coin',c.x-35,c.y+45,coins);pickup(g,kind,c.x+35,c.y+45,kind==='heart'?14:1);c.result={item:null,coins,kind};}
 effect(g,'item',c.x,c.y-25,{life:.65});emit(g,'pickup');note(g,q?'황금상자에서 유물 발견!':'황금상자 · 동전과 보급품 발견');return true;
}
export function buy(g,id){if(g.phase!=='playing'||current(g).type!=='shop')return false;const s=current(g).stock.find(s=>s.id===id&&!s.sold);if(!s||dist(g.player,s)>85)return false;const cost=shopPrice(g,s);if(g.coins<cost){note(g,'동전이 모자라요. 다른 방을 둘러보고 와도 괜찮아요.');return false;}if(id==='heal'&&g.player.hp>=stats(g).maxHp)return false;if(ITEMS[id]&&has(g,id))return false;g.coins-=cost;g.spent+=cost;s.sold=true;if(id==='heal')g.player.hp=Math.min(stats(g).maxHp,g.player.hp+22);else if(id==='key')g.keys++;else takeItem(g,id);effect(g,'item',s.x,s.y);return true;}
export function useUltimate(g){if(g.phase!=='playing'||g.battery<3||g.player.action?.type==='high')return false;g.battery-=3;g.queue=g.queue.filter(q=>q.kind!=='primary');startHigh(g);if(has(g,'yellow'))g.queue.push({kind:'highStart',at:g.time+(g.hero==='velvet'?2.8:1.1),school:schoolRanks(g)});return true;}
function startHigh(g,ranks=schoolRanks(g)){const p=g.player,duration=g.hero==='velvet'?2.8:1.1;p.charge=0;p.action={type:'high',time:0,duration,facing:p.facing};p.invuln=Math.max(p.invuln,g.hero==='velvet'?.8:1.1);g.queue.push({kind:'high',at:g.time+(g.hero==='velvet'?(.733333349/4.10000038)*duration:butterReleasePoint('high')*duration),aim:{...p.aim},facing:p.facing,school:ranks});effect(g,'charge',p.x,p.y-35,{life:.6});}
export function placeBomb(g){if(g.phase!=='playing'||g.bombs<1||g.zones.length>=70||g.zones.filter(z=>z.kind==='bomb').length>=12)return false;g.bombs--;const s=stats(g);g.zones.push({kind:'bomb',x:g.player.x,y:g.player.y,age:0,life:1.35,radius:s.bombRadius,damage:s.bombDamage});return true;}
function damagePlayer(g,amount,cause={kind:'contact',label:'접촉 피해',x:g.player.x,y:g.player.y}){
 const p=g.player;if(p.invuln>0||g.phase!=='playing')return false;amount=Math.ceil(amount*stats(g).incoming);const shield=Math.min(g.shield,amount),loss=Math.min(p.hp,amount-shield);g.shield-=shield;p.hp-=loss;p.invuln=.95;g.damageTaken+=loss;if(loss>0){g.floorHits++;current(g).hitsTaken++;}const coinLoss=loss>0&&has(g,'leakyPouch')?Math.min(1,g.coins):0;g.coins-=coinLoss;g.telemetry.coinsLost+=coinLoss;g.lastHit={...cause,amount:loss,shield,coinLoss,at:g.time,angle:Math.atan2(cause.y-p.y,cause.x-p.x)};effect(g,'hurt',p.x,p.y,{life:.3});emit(g,'hurt');
 if(shield&&has(g,'ward')&&cause.kind==='shot'){const e=nearest(g,p,null,800);if(e){const h=hurtPoint(p),t=hurtPoint(e),plan=inheritedChild(shotProfile(g),.8);spawnPlan(g,shotAPI(g),plan,h.x,h.y,Math.atan2(t.y-h.y,t.x-h.x));g.telemetry.ward++;}}
 if(p.hp<=0)g.phase='dead';else if(g.augments.includes('repulse')&&g.time>=g.repulseAt){g.repulseAt=g.time+2;g.telemetry.augRepulse++;for(const b of g.hostile)if(dist(b,p)<140)b.life=0;for(const e of current(g).enemies)if(live(e)&&dist(e,p)<140){const d=dist(e,p)||1;moveBody(current(g),e,(e.x-p.x)/d*55,(e.y-p.y)/d*55,e.radius);}effect(g,'pulse',p.x,p.y,{radius:140,life:.4});}return true;
}
function hit(g,e,amount,source='stone'){if(!live(e)||e.appear>0||(e.hiddenUntil||0)>g.time)return;if(e.affix==='bulwark')amount*=.85;if(e.affix==='mirror'&&(e.reflectAt||0)<=g.time){e.reflectAt=g.time+3;shot(g,e.x,e.y-25,Math.atan2(g.player.y-26-(e.y-25),g.player.x-e.x),200,8);}amount*=e.state==='recover'?1.25:1;const thaw=has(g,'rust')&&source!=='melt'&&(e.freezeUntil||0)>g.time&&(e.meltAt||0)<g.time;if(thaw){e.freezeUntil=0;e.meltAt=g.time+.5;}const actual=Math.min(e.hp,amount);e.hp-=amount;e.flash=.12;if(g.time>=(g.hitSoundAt||0)){g.hitSoundAt=g.time+.045;emit(g,'hit');}g.telemetry.damageBy[source]=(g.telemetry.damageBy[source]||0)+actual;g.numbers.push({x:e.x,y:e.y-55,value:Math.round(amount),age:0});if(g.numbers.length>50)g.numbers.shift();effect(g,'hit',e.x,e.y-15);if(!live(e)){g.kills++;current(g).kills++;awardXP(g,e.minion?0:e.boss?45:8);emit(g,'kill');effect(g,'defeat',e.x,e.y-20,{life:.45});if(has(g,'bell')){g.telemetry.pulse++;area(g,e.x,e.y,110,8,'bell');for(const t of current(g).enemies)if(live(t)&&dist(t,e)<110){const d=dist(t,e)||1;moveBody(current(g),t,(t.x-e.x)/d*35,(t.y-e.y)/d*35,t.radius);}if(has(g,'komi'))for(const b of g.hostile)if(dist(b,e)<130)b.life=0;}}if(thaw)area(g,e.x,e.y,90,18,'melt');}
function area(g,x,y,r,damage,source){for(const e of current(g).enemies)if(live(e)&&Math.hypot(e.x-x,e.y-y)<r+e.radius)hit(g,e,damage,source);effect(g,'pulse',x,y,{radius:r,life:.35});}
function nearest(g,b,except=null,range=480,accept=null){return current(g).enemies.filter(e=>live(e)&&e.id!==except&&e.appear<=0&&dist(e,b)<range&&(!accept||accept(e))).sort((a,c)=>dist(a,b)-dist(c,b))[0];}
function lightning(g,e){g.telemetry.lightning++;if(has(g,'snowGlobe')&&(e.freezeUntil||0)>g.time&&(e.stormAt||0)<=g.time){e.stormAt=g.time+3;for(const t of current(g).enemies)if(live(t)&&dist(t,e)<140)t.freezeUntil=g.time+(t.boss?.15:.65);effect(g,'pulse',e.x,e.y,{radius:140,life:.4});g.telemetry.storm=(g.telemetry.storm||0)+1;}for(const t of current(g).enemies.filter(t=>live(t)&&t.id!==e.id&&dist(t,e)<250).sort((a,b)=>dist(a,e)-dist(b,e)).slice(0,2)){effect(g,'bolt',e.x,e.y-25,{x2:t.x,y2:t.y-25,life:.22});hit(g,t,12,'lightning');}}
function release(g,q){
 if(q.kind==='echo'){spawnPlan(g,shotAPI(g),q.plan,q.x,q.y,Math.atan2(q.aim.y,q.aim.x));g.telemetry.echo++;emit(g,'shot');return;}
 const p=g.player;if(q.kind==='highStart'){startHigh(g,q.school||schoolRanks(g));return;}
 const type=q.kind==='high'?'high':q.gun?'gun':'normal',duration=type==='high'?1.1:type==='gun'?.32:.46;
 const m=g.hero==='velvet'?{x:0,y:-26+22.4}:butterMuzzleOffset({size:80,gait:p.gait,action:{type,time:butterReleasePoint(type)*duration,duration}});
 const x=p.x+m.x*q.facing,y=p.y+m.y-22.4;
 if(q.target){const dx=q.target.x-x,dy=q.target.y-y,n=Math.hypot(dx,dy)||1;q.aim={x:dx/n,y:dy/n};}
 if(q.kind==='high'){
  if(g.hero==='velvet'){g.zones.push({kind:'heroSpin',x:p.x,y:p.y,age:0,life:1.8+((q.school?.senior||schoolRanks(g).senior)-1)*.3,radius:100+((q.school?.senior||schoolRanks(g).senior)-1)*8,damage:18+((q.school?.senior||schoolRanks(g).senior)-1)*4,timer:0});effect(g,'slash',p.x,p.y,{radius:100,life:.35});emit(g,'ultimate');return;}
  const rank=q.school?.senior||schoolRanks(g).senior,radius=36+(rank-1)*3,margin=50*radius/36;let a=Math.atan2(q.aim.y,q.aim.x),sx=Math.sign(Math.cos(a))||1,sy=Math.sign(Math.sin(a))||-1;a=clamp(Math.atan2(Math.abs(q.aim.y),Math.abs(q.aim.x)),Math.PI/8,Math.PI*3/8);bullet(g,{kind:'boulder',x:clamp(x,margin,viewFor(current(g)).width-margin),y:clamp(y,margin,viewFor(current(g)).height-margin),vx:Math.cos(a)*640*sx,vy:Math.sin(a)*640*sy,life:8+(rank-1)*.5,radius,damage:90+(rank-1)*18});g.telemetry.boulder++;effect(g,'muzzle',x,y);emit(g,'ultimate');return;
 }
 const plan=q.plan||shotProfile(g),a=Math.atan2(q.aim.y,q.aim.x);g.shots++;current(g).shots++;g.telemetry.shots++;if(q.gun)g.telemetry.gun++;spawnPlan(g,shotAPI(g),plan,x,y,a);
 if(plan.flags.echo&&g.shots%5===0&&g.queue.length<9)g.queue.push({kind:'echo',at:g.time+.15,x,y,aim:{...q.aim},plan:inheritedChild(plan,.55)});
 if(plan.flags.collection&&g.shots%4===0){for(let i=0;i<6;i++)spawnPlan(g,shotAPI(g),inheritedChild(plan,.35),x,y,a+i*TAU/6);g.telemetry.collection+=6;}
 if((g.augments.includes('echo')||has(g,'fan')&&plan.weapon!=='fan')&&g.shots%4===0){for(const offset of [-.22,.22])spawnPlan(g,shotAPI(g),inheritedChild(plan,.6),x,y,a+offset);g.telemetry.augEcho+=2;}
 if(g.hero==='velvet'&&g.shots%3===0){const jr=plan.school?.junior||1;area(g,p.x,p.y,60+jr*12,Math.round(plan.damage*.3),'junior');g.telemetry.junior=(g.telemetry.junior||0)+1;}
 if((has(g,'scythe')&&g.shots%3===0)||(g.hero==='butter'&&random(g.combatRng)<.18+.03*(plan.school?.junior||1))){bullet(g,{kind:'chain',x,y,vx:Math.cos(a)*590,vy:Math.sin(a)*590,life:4,damage:has(g,'scythe')?18:Math.round(plan.damage*.7),bounces:has(g,'scythe')&&g.shots%3===0?Math.max(4,1+(plan.school?.junior||1)):1+(plan.school?.junior||1),last:null,lock:0,plan:inheritedChild(plan,1),child:true});g.telemetry.ricochet++;}effect(g,'muzzle',x,y);emit(g,plan.shape==='beam'?'beam':plan.shape==='cleave'?'swing':'shot');
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
function projectiles(g,dt){const r=current(g),p=g.player;
 advanceFriendly(g,dt,shotAPI(g));
 for(const b of g.hostile){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(blockedShot(r,b.x,b.y,6))b.life=0;if(b.life<=0)continue;
  if(has(g,'komi')){const x=p.x+Math.cos(g.time*2.8)*72,y=p.y-22+Math.sin(g.time*2.8)*45;if(Math.hypot(b.x-x,b.y-y)<27){b.life=0;g.telemetry.parry++;const e=nearest(g,b,null,800),a=e?Math.atan2(e.y-26-b.y,e.x-b.x):Math.atan2(-b.vy,-b.vx);spawnPlan(g,shotAPI(g),{...inheritedChild(shotProfile(g)),damage:22},b.x,b.y,a);effect(g,'pulse',x,y,{radius:40});if(has(g,'mace'))area(g,x,y,110,18,'parry');}}
  if(b.life>0&&dist(hurtPoint(p),b)<PLAYER_HURT_RADIUS+b.radius){damagePlayer(g,b.damage,{kind:'shot',label:b.label||'적 탄환',x:b.x-b.vx*.1,y:b.y-b.vy*.1});b.life=0;}
 }g.hostile=g.hostile.filter(b=>b.life>0);
}
function enemies(g,dt){
 const r=current(g),p=g.player;
 for(const e of r.enemies){
  if(!live(e))continue;e.flash=Math.max(0,e.flash-dt);if((e.freezeUntil||0)>g.time)continue;
  e.age+=dt;if(e.state!=='move')e.attackClock=(e.attackClock||0)+dt;e.appear=Math.max(0,e.appear-dt);if(e.appear>0)continue;e.timer-=dt;
  if(e.action){e.action.time+=dt;if(e.action.time>=e.action.duration)e.action=null;}
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
  if(e.boss){bossStep(g,e,dt,{los:(a,b)=>clearShot(r,a,b),shot:(...a)=>shot(g,...a),effect:(...a)=>effect(g,...a),damage:(...a)=>damagePlayer(g,...a),summon:(role,x,y)=>{const q=nearestFree(r,{x,y},32),m=spawnEnemy(g,role,q.x,q.y);m.minion=true;}});}else if(e.state==='move'){
   const ranged=['archer','caster','erpin'].includes(e.role),los=clearShot(r,{x:e.x,y:e.y-26},{x:p.x,y:p.y-28}),sign=e.ai==='turret'?0:ranged?d<210?-1:d>390||!los?1:0:1,speed=e.speed*(e.slow>g.time?.6:1);
   if(e.ai==='orbit'){const a=e.age*.9+e.id,target={x:p.x+Math.cos(a)*300,y:p.y+Math.sin(a)*190};steer(r,e,target,dt,speed,e.radius);}else if(sign===1)steer(r,e,p,dt,speed,e.radius);else if(sign===-1){const away={x:e.x-dx/d*160,y:e.y-dy/d*160};steer(r,e,away,dt,speed,e.radius);}
   if(e.timer<=0&&d<(e.role==='fan'?95:650)&&(!ranged||los)&&canTell(g,e)){g.nextTellAt=g.time+.34;e.state='tell';e.attackClock=0;e.timer=e.boss?(e.role==='erpin'?.95:1.05):e.role==='rusher'?.72:e.role==='fan'?.5:.85;e.aimX=p.x;e.aimY=p.y;if(e.role==='shady'){const t=nearestFree(r,{x:clamp(p.x,FLOOR.left+90,FLOOR.right-90),y:clamp(p.y,FLOOR.top+70,FLOOR.bottom-70)},e.radius);e.aimX=t.x;e.aimY=t.y;}if(e.ai==='burrow'){e.hiddenUntil=g.time+e.timer;}if(e.ai==='blink'){e.blinkSpot=nearestFree(r,{x:clamp(p.x+(e.id%2?190:-190),boundsFor(r).left+60,boundsFor(r).right-60),y:clamp(p.y-90,boundsFor(r).top+60,boundsFor(r).bottom-60)},32);}e.attack++;e.enraged=e.boss&&e.hp<e.maxHp/2;if(e.boss)e.action={type:e.role==='velvet'?'high':'skill',time:0,duration:e.role==='velvet'?4.25:e.role==='erpin'?2.9:3.55};}
  }else if(e.state==='tell'&&e.timer<=0){
   if(e.ai==='burrow'){const q=nearestFree(r,{x:e.aimX,y:e.aimY},32);e.x=q.x;e.y=q.y;e.hiddenUntil=0;}if(e.blinkSpot){e.x=e.blinkSpot.x;e.y=e.blinkSpot.y;e.blinkSpot=null;}if(e.ai==='summoner'&&r.enemies.length<8&&(e.summonAt||0)<=g.time){e.summonAt=g.time+9;const q=nearestFree(r,{x:e.x+70,y:e.y},32),m=spawnEnemy(g,'fan',q.x,q.y);m.minion=true;}
   const a=Math.atan2(e.aimY-e.y,e.aimX-e.x);
   if(e.role==='rusher'){e.state='dash';e.timer=.5;e.vx=Math.cos(a)*480;e.vy=Math.sin(a)*480;}
   else if(e.role==='velvet'){e.state='spin';e.timer=1.8;e.vx=Math.cos(a)*145;e.vy=Math.sin(a)*145;e.pulse=0;}
   else if(e.role==='erpin'){e.state='volley';e.timer=.7;e.volley=0;e.volleyClock=0;e.volleyAngle=Math.atan2(e.aimY-(e.y-25),e.aimX-e.x);}
   else if(e.role==='shady'){const spot=nearestFree(r,{x:clamp(e.aimX,FLOOR.left+90,FLOOR.right-90),y:clamp(e.aimY,FLOOR.top+70,FLOOR.bottom-70)},e.radius);e.x=spot.x;e.y=spot.y;e.state='slash';e.timer=1.2;e.pulse=0;}
   else{if(e.role==='caster')g.zones.push({kind:'danger',x:e.aimX,y:e.aimY,age:0,life:1.05,radius:65});else if(e.role==='archer')for(const offset of [-.16,0,.16])shot(g,e.x,e.y-25,a+offset,240,e.damage);else if(e.role==='guard')for(let i=0;i<6;i++)shot(g,e.x,e.y-25,i*TAU/6+e.attack*.3,200,e.damage);else if(dist(e,p)<75)damagePlayer(g,e.damage,{kind:'melee',label:'근접 공격',x:e.x,y:e.y});e.state='recover';e.timer=.95;}
  }else if(e.state==='dash'){moveBody(r,e,e.vx*dt,e.vy*dt,e.radius);if(e.timer<=0){e.state='recover';e.timer=1;}}
  else if(e.state==='spin'){moveBody(r,e,e.vx*dt,e.vy*dt,e.radius);e.pulse-=dt;if(e.pulse<=0){e.pulse=.3;effect(g,'slash',e.x,e.y,{radius:132});if(dist(e,p)<132)damagePlayer(g,e.damage);}if(e.timer<=0){e.state='recover';e.timer=1.4;if(e.enraged)for(let i=0;i<8;i++)shot(g,e.x,e.y-25,TAU*i/8+e.attack*.25,190,12);}}
  else if(e.state==='volley'){e.volleyClock-=dt;if(e.volleyClock<=0&&e.volley<4){const offset=[-.15,-.05,.05,.15][e.volley];shot(g,e.x,e.y-25,e.volleyAngle+offset,e.enraged?290:245,e.damage);e.volley++;e.volleyClock=.17;}if(e.timer<=0){e.state='recover';e.timer=1.25;if(e.enraged)for(const dx of [-75,75])g.zones.push({kind:'danger',x:clamp(e.aimX+dx,FLOOR.left+65,FLOOR.right-65),y:e.aimY,age:0,life:1.1,radius:55});}}
  else if(e.state==='slash'){e.pulse-=dt;if(e.pulse<=0){e.pulse=.2;effect(g,'slash',e.x,e.y,{radius:82});if(dist(e,p)<82)damagePlayer(g,e.damage);}if(e.timer<=0){e.state='recover';e.timer=1.3;const count=e.enraged?12:8;for(let i=0;i<count;i++)shot(g,e.x,e.y-25,TAU*i/count+e.attack*.2,e.enraged?230:190,11);if(e.enraged)for(const dx of [-65,65])g.zones.push({kind:'danger',x:clamp(p.x+dx,FLOOR.left+70,FLOOR.right-70),y:p.y,age:0,life:1.1,radius:55});}}
  else if(e.state==='recover'&&e.timer<=0){e.state='move';e.timer=e.boss?.5:.8;}
  if(dist(e,p)<e.radius+16&&(e.portalGraceUntil||0)<=g.time)damagePlayer(g,e.damage,{kind:'contact',label:({fan:'추격 몹',archer:'사수',caster:'마법사',guard:'방패병',rusher:'돌진 몹'})[e.role]||FLOORS[g.floorIndex].bossName,x:e.x,y:e.y});
  if(has(g,'komi')){const a=g.time*2.8,x=p.x+Math.cos(a)*72,y=p.y-22+Math.sin(a)*45;if(Math.hypot(e.x-x,e.y-25-y)<e.radius+20&&(e.pillowAt||0)<g.time){e.pillowAt=g.time+.65;hit(g,e,12,'pillow');moveBody(r,e,-dx/d*18,-dy/d*18,e.radius);}}
 }
 r.enemies=r.enemies.filter(live);
}
function canTell(g,e){if(e.role==='fan')return true;return g.time>=g.nextTellAt&&current(g).enemies.filter(t=>t.role!=='fan'&&t.state==='tell').length<2;}
function clearShot(r,a,b){const n=Math.max(1,Math.ceil(dist(a,b)/10));for(let i=1;i<n;i++)if(blockedShot(r,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,5))return false;return true;}
function zones(g,dt){for(const z of g.zones){z.age+=dt;z.life-=dt;
 if(z.kind==='heroSpin'){z.x=g.player.x;z.y=g.player.y;z.timer-=dt;if(z.timer<=0){z.timer=.24;area(g,z.x,z.y,z.radius,z.damage||18,'spin');if(g.augments.includes('trail')&&g.zones.filter(t=>t.kind==='fire').length<35){g.zones.push({kind:'fire',x:z.x,y:z.y,age:0,life:1,radius:38,timer:0});g.telemetry.augTrail++;}}}
 if(z.kind==='bomb'&&z.life<=0){area(g,z.x,z.y,z.radius,z.damage,'bomb');effect(g,'explosion',z.x,z.y,{life:.5,radius:z.radius});if(dist(g.player,z)<z.radius*.8)damagePlayer(g,14,{kind:'bomb',label:'내 폭탄',x:z.x,y:z.y});if(has(g,'fireworks')){for(let i=0;i<8;i++)spawnPlan(g,shotAPI(g),inheritedChild(shotProfile(g),.6),z.x,z.y-20,i*TAU/8);g.telemetry.fragments+=8;}for(const o of current(g).obstacles)if(o.hp!==0&&o.kind!=='gap'&&dist(z,{x:o.x+o.w/2,y:o.y+o.h/2})<z.radius+35){if(o.kind==='pot')breakCrate(g,o,2);else o.hp=0;g.telemetry.terrainBroken++;}for(const l of links(g))if(['secret','supersecret','archive'].includes(g.rooms[l.to].type)&&!g.rooms[l.to].unlocked&&dist(z,l)<z.radius+30){g.rooms[l.to].unlocked=true;note(g,'비밀방을 발견했어요!');}}
 if(z.kind==='danger'&&z.age>=.75&&!z.triggered){z.triggered=true;areaVisual(g,z);if(dist(g.player,z)<z.radius)damagePlayer(g,12,{kind:'hazard',label:'마법진',x:z.x,y:z.y});}
 if(z.kind==='fire'){z.timer-=dt;if(z.timer<=0){z.timer=.4;for(const e of current(g).enemies)if(live(e)&&dist(e,z)<z.radius+e.radius)hit(g,e,4,'fire');}}
 }g.zones=g.zones.filter(z=>z.life>0);}
function areaVisual(g,z){effect(g,'pulse',z.x,z.y,{radius:z.radius,life:.25});}
function clearRoom(g){
 const r=current(g);if(g.phase!=='playing'||r.cleared||r.enemies.length||!r.initialized)return;
 if(r.type==='challenge'&&r.challenge.state==='active'&&r.challenge.wave<2){if(!r.challenge.nextWaveAt){r.challenge.nextWaveAt=g.time+1.15;note(g,'두 번째 무리가 다가와요!');}if(g.time<r.challenge.nextWaveAt)return;r.challenge.wave=2;spawnWave(g,r,2);return;}
 r.cleared=true;g.clears++;g.battery=Math.min(3,g.battery+1);g.hostile=[];g.zones=g.zones.filter(z=>z.kind==='bomb');if(r.rewarded)return;r.rewarded=true;r.combatDuration=r.combatSeconds||0;g.combatLog.push({floor:g.floorIndex,room:r.id,template:r.encounter?.id||'boss',shape:r.shape,seconds:r.combatDuration,hits:r.hitsTaken,shots:r.shots,damageTaken:g.damageTaken-r.damageStart,items:[...g.items],school:schoolRanks(g)});if(g.active)g.active.charge=Math.min(ACTIVES[g.active.id].cost,g.active.charge+1);
 const flawless=g.damageTaken===r.damageStart,reward=clearReward(g,r,flawless);r.reward=reward;pickup(g,'coin',590,465,reward.coins);if(reward.kind!=='none')pickup(g,reward.kind,640,510,reward.value);emit(g,'clear');
 if(r.type==='rush'){r.rush.state=g.time<=r.rush.deadline?'done':'failed';if(r.rush.state==='done'){addGoldenChest(g,r,{x:640,y:415});note(g,'시간제 도전 성공 · 황금상자!');}}
 if(r.type==='challenge'){r.challenge.state='done';g.achievements.trial=true;g.telemetry.trials++;addGoldenChest(g,r,{x:640,y:415});pickup(g,'coin',720,500,3);if(g.damageTaken===r.challenge.damageStart)pickup(g,'key',680,550);note(g,'도전 성공 · 황금상자'+(g.damageTaken===r.challenge.damageStart?' + 무피격 열쇠!':'!'));}
 else if(r.type==='boss'){if(!g.achievements.bosses.includes(r.bossRole))g.achievements.bosses.push(r.bossRole);r.gateOpened=openPerformanceGate(g,r);r.bossGift=true;r.pedestal={...artifactPosition(g,r,{x:640,y:545}),item:rollArtifact(g,{rare:true,source:'boss'}),taken:false,source:'boss'};emit(g,'boss');if(g.floorIndex<FLOORS.length-1){r.augment={offers:augmentOffers(g),taken:false};g.choice=[...r.augment.offers];g.phase='augment';note(g,({velvet:'벨벳',erpin:'에르핀',shady:'셰이디'})[r.bossRole]+' 격파 · 다음 층을 위한 증강!');}else note(g,'마지막 수호자 격파 · 중앙 문으로 탈출하세요!');}
 else note(g,'방 정리 완료 · 궁극기 충전 +1'+(flawless?' · 무피격 동전':''));
 effect(g,'clear',640,440,{life:1});
}
function step(g,dt,input){g.time+=dt;if(!current(g).cleared)current(g).combatSeconds=(current(g).combatSeconds||0)+dt;g.transition=Math.max(0,g.transition-dt);g.roomBanner=Math.max(0,g.roomBanner-dt);const p=g.player,r=current(g),s=stats(g);p.invuln=Math.max(0,p.invuln-dt);p.fireTimer-=dt;if(p.action){p.action.time+=dt;if(p.action.time>=p.action.duration)p.action=null;}
 const dx=clamp(Number(input.x)||0,-1,1),dy=clamp(Number(input.y)||0,-1,1),n=Math.max(1,Math.hypot(dx,dy)),old={x:p.x,y:p.y};moveBody(r,p,dx/n*s.speed*dt,dy/n*s.speed*dt);advanceButterGait(p.gait,dist(p,old),dx/n,dy/n,dt);p.moving=dist(p,old)>.05;
 const aim=input.aim;if(aim&&Number.isFinite(aim.x)&&Number.isFinite(aim.y)&&Math.hypot(aim.x,aim.y)>.01){const d=Math.hypot(aim.x,aim.y);p.aim={x:aim.x/d,y:aim.y/d};if(Math.abs(p.aim.x)>.1)p.facing=p.aim.x>0?-1:1;}else if(Math.abs(dx)>.01&&!p.action)p.facing=dx>0?-1:1;
 if(p.action?.type!=='high'&&p.fireTimer<=0&&!g.queue.some(q=>q.kind==='highStart')){
  if(g.weapon==='charge'){if(input.fire){p.charge=Math.min(.7,p.charge+dt);p.chargeAim={...p.aim};p.chargeFacing=p.facing;p.chargeTarget=input.target?{...input.target}:null;}if(p.charge>=.7||!input.fire&&p.charge>=.18)beginShot(g,input,p.charge/.7);else if(!input.fire)p.charge=0;}
  else if(input.fire)beginShot(g,input,1);
 }
 for(const q of g.queue)if(q.at<=g.time){release(g,q);q.done=true;}g.queue=g.queue.filter(q=>!q.done);
 enemies(g,dt);if(g.phase!=='playing')return;projectiles(g,dt);zones(g,dt);tickBiome(g,dt,{damage:(...a)=>damagePlayer(g,...a),hit:(...a)=>hit(g,...a),effect:(...a)=>effect(g,...a),emit:k=>emit(g,k)});if(g.phase!=='playing')return;
 if(r.rush?.state==='active'&&g.time>r.rush.deadline){r.rush.state='failed';note(g,'시간 초과 · 적을 정리하면 나갈 수 있어요. 추가 선물은 없어요.');}
 puzzleTick(g,{damage:(...a)=>damagePlayer(g,...a),effect:(...a)=>effect(g,...a),note:s=>note(g,s)});r.enemies=r.enemies.filter(live);clearRoom(g);if(g.phase!=='playing')return;collectArtifact(g);
 r.pickups=r.pickups.filter(q=>{if(dist(p,q)>(q.kind==='coin'&&has(g,'greed')?85:30)||q.kind==='heart'&&p.hp>=s.maxHp||q.kind==='shield'&&g.shield>=20)return true;if(q.kind==='shield')g.shield=Math.min(20,g.shield+q.value);if(q.kind==='coin'){const amount=Math.max(0,Math.min(q.value,99-g.coins,[45,65,85][g.floorIndex]-g.floorCoins));g.coins+=amount;g.floorCoins+=amount;}if(q.kind==='key')g.keys+=q.value;if(q.kind==='bomb')g.bombs+=q.value;if(q.kind==='heart')p.hp=Math.min(s.maxHp,p.hp+q.value);effect(g,'pickup',q.x,q.y,{life:.4});emit(g,'pickup');return false;});
 let door=false;if(r.cleared&&g.transition<=0&&p.action?.type!=='high')for(const l of links(g)){const towards=dx*l.dx+dy*l.dy;if(towards>.3&&dist(p,l)<48){door=true;g.doorIntent+=dt;if(g.doorIntent>=.16){if(!enterRoom(g,l.dir))g.transition=.4;g.doorIntent=0;}break;}}if(!door)g.doorIntent=0;
 for(const e of g.effects)e.age+=dt;g.effects=g.effects.filter(e=>e.age<e.life);for(const e of g.numbers)e.age+=dt;g.numbers=g.numbers.filter(e=>e.age<.7);openLesson(g);
}
function beginShot(g,input,charge){
 const p=g.player,plan=shotProfile(g,{charge}),gun=plan.gun,type=gun?'gun':'normal',duration=g.hero==='velvet'?.66:gun?.32:.46;
 if(g.weapon==='charge'&&!input.fire&&p.chargeAim){p.aim={...p.chargeAim};p.facing=p.chargeFacing;}
 p.fireTimer=plan.interval;p.charge=0;p.action={type,time:0,duration,facing:p.facing};
 const pointer=input.target||(g.weapon==='charge'&&!input.fire?p.chargeTarget:null),target=pointer&&Number.isFinite(pointer.x)&&Number.isFinite(pointer.y)?{...pointer}:null,release=g.hero==='velvet'?(.866666734/2.33333349)*duration:butterReleasePoint(type)*duration;
 g.queue.push({kind:'primary',plan,gun,at:g.time+release,aim:{...p.aim},target,facing:p.facing});
}
export function tick(g,dt,input={}){if(g.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;const total=Math.min(.1,dt),n=Math.ceil(total/(1/120));for(let i=0;i<n&&g.phase==='playing';i++)step(g,total/n,input);}

export function useActive(g){return activate(g,{nearest:b=>nearest(g,b,null,1600),spawn:(...a)=>spawnPlan(g,shotAPI(g),...a),emit:k=>emit(g,k),effect:(...a)=>effect(g,...a),warp:()=>{const old=current(g),to=g.rooms[0];g.room=0;carryStones(g,old,to);g.player.x=640;g.player.y=470;g.player.action=null;g.player.invuln=Math.max(g.player.invuln,.85);g.queue=[];g.hostile=[];g.zones=[];g.transition=.6;}});}
