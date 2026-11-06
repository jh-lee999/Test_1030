import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as E from '../dungeon80-engine.js';
import * as S from '../dungeon80-save.js';
import * as Old from '../dungeon79-save.js';
import {createGame as oldGame} from '../dungeon79-engine.js';
import {ITEMS,ACTIVES,COMBOS} from '../dungeon80-content.js';
import {generateFloor,links,adjacent,reachable,boundsFor,blocked,viewFor,visibleRooms,hash,random} from '../dungeon80-world.js';
import {drawArtifact,eligibleItems,tierCap,rarityOdds,itemPrice,shopPrice,restockCost} from '../dungeon80-economy.js';
import {awardXP,schoolRanks,openLesson} from '../dungeon80-growth.js';
import {initExtras,equipActive,openPerformanceGate} from '../dungeon80-systems.js';
import {shotProfile,buildStats} from '../dungeon80-build.js';
import {encounterFor} from '../dungeon80-encounters.js';
import {bossStep} from '../dungeon80-bosses.js';
import {artifactPosition,dropArtifact} from '../dungeon80-loot.js';
import {itemPeek,catalogUI} from '../dungeon80-items-ui.js';
import {viewport} from '../dungeon80-renderer.js';
import {emptyProgress,unlocked} from '../dungeon80-progress.js';

function enter(g,type,id){const r=id!==undefined?g.rooms[id]:g.rooms.find(r=>r.type===type);assert(r,'room '+type);if(r.enabled===false){r.enabled=true;r.type='angel';r.unlocked=true;}const from=g.rooms.find(q=>links(g,q).some(l=>l.to===r.id));g.room=from.id;from.cleared=true;g.transition=0;g.phase='playing';g.keys=10;r.unlocked=true;assert(E.enterRoom(g,links(g).find(l=>l.to===r.id).dir));return r;}
function seedWith(type){for(let i=0;i<100;i++){const g=E.createGame('system80-'+i);if(g.rooms.some(r=>r.type===type))return g;}throw Error(type);}
function killBoss(g){const r=enter(g,'boss');r.enemies.forEach(e=>e.hp=0);g.player.invuln=999;E.tick(g,.02);if(g.phase==='augment')E.chooseAugment(g,g.choice[0]);while(g.phase==='lesson')E.chooseLesson(g,'junior');return r;}
const memory=()=>{const m=new Map();return {m,getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};

test('79 archive stays exact,80 uses new modules and original whole assets',()=>{const read=f=>readFileSync(new URL('../'+f,import.meta.url));assert.equal(createHash('sha256').update(read('dungeon79.html')).digest('hex'),'392301c393c8640866e9665511aaa6c5c5e9d2b93cdcf051fb70021d96f73960');assert.match(read('dungeon80.html').toString(),/dungeon80.js\?v=80/);assert.match(read('dungeon80-renderer.js').toString(),/dungeon80-hints.js/);assert.match(read('dungeon80-hints.js').toString(),/dungeon78-hints.js/);assert.match(read('dungeon80-engine.js').toString(),/butter-gun-motion71.js/);});
test('seeded maps vary style, loops, optional rooms and real arena size; legal gold/shop leaves',()=>{
 const styles=new Set(),shapes=new Set(),sets=new Set(),curses=new Set();let loops=0,multiSecret=0;
 for(let i=0;i<100;i++)for(let floor=0;floor<3;floor++){
  const rs=generateFloor('topology80-'+i,floor),rs2=generateFloor('topology80-'+i,floor);assert.deepEqual(rs,rs2);assert.equal(rs[0].type,'start');styles.add(rs[0].style);curses.add(rs[0].curse);sets.add(rs.map(r=>r.type).sort().join(','));assert.equal(rs.filter(r=>r.type==='treasure').length,2);assert.equal(rs.filter(r=>r.type==='shop').length,1);
  const ids=new Set([0]),q=[rs[0]];for(const r of q)for(const n of rs.filter(n=>adjacent(r,n)))if(!ids.has(n.id)){ids.add(n.id);q.push(n);}assert.equal(ids.size,rs.length);
  for(const r of rs){shapes.add(r.shape);assert.equal(r.view.width,r.bounds.right+130);for(const type of ['treasure','shop'])if(r.type===type){const ns=rs.filter(n=>adjacent(r,n));assert.equal(ns.length,1);assert.equal(ns[0].type,'combat');}if(r.type==='omen'){assert.equal(rs.filter(n=>adjacent(r,n)).length,1);assert.equal(rs.find(n=>adjacent(r,n)).type,'boss');}}
  const core=rs.filter(r=>['start','combat'].includes(r.type));if(core.reduce((n,r)=>n+core.filter(t=>adjacent(r,t)).length,0)/2>core.length-1)loops++;
  const secret=rs.find(r=>r.type==='secret');if(rs.filter(r=>adjacent(r,secret)).length>=2)multiSecret++;
 }
 assert.equal(styles.size,4);assert.equal(shapes.size,4);assert(curses.has('dusk')&&curses.has('lost')&&curses.has('expanse'));assert(sets.size>10);assert(loops>0);assert(multiSecret>50);
});
test('no free starting artifact or hidden loadout grant at80',()=>{for(let i=0;i<12;i++){const g=E.createGame('start80-'+i,{loadout:'charged'});assert.equal(g.items.length,0);assert.equal(E.current(g).pedestal,null);assert.equal(g.loadout,'random');assert(S.validRun(g));}});
test('giant rooms share physical bounds, safe paths, entry coordinates and viewport transform',()=>{
 const seen=new Set();for(let i=0;i<20&&seen.size<4;i++){const g=E.createGame('arena80-'+i);for(const model of g.rooms.filter(r=>r.type==='combat')){if(seen.has(model.shape))continue;const r=enter(g,'combat',model.id);seen.add(r.shape);assert(reachable(r,g.player,32));for(const e of r.enemies)assert(reachable(r,e,32));const a=boundsFor(r);assert(blocked(r,a.left,a.top,16));const p=artifactPosition(g,r,{x:(a.left+a.right)/2,y:(a.top+a.bottom)/2});assert(reachable(r,p,32));const v=viewport(1366,850,g);assert(v.zoom*viewFor(r).width<=1366.01);assert(v.zoom*viewFor(r).height<=850.01);assert(S.validRun(g));}}
 assert.equal(seen.size,4);
});
test('source pools, floor tier gates, actual owned luck and rank saturation filter candidates',()=>{
 const g=E.createGame('pools80');g.clears=4;assert.equal(tierCap(g),2);assert(!eligibleItems(g,{source:'shop'}).some(id=>ITEMS[id].category==='weapon'));assert(!eligibleItems(g,{source:'treasure'}).includes('yellow'));assert(eligibleItems(g,{source:'devil'}).some(id=>ITEMS[id].troll));g.floorIndex=2;assert(eligibleItems(g,{source:'treasure'}).includes('yellow'));g.school.junior=6;assert(!eligibleItems(g,{source:'boss'}).includes('juniorBook'));g.active={id:'lantern',charge:0};assert(!eligibleItems(g,{source:'treasure'}).includes('active_lantern'));const r=g.rooms[0];r.artifacts.push({id:1,x:800,y:400,item:'luckyClover',taken:false,source:'crate'});assert.equal(buildStats(g).luck,0);assert.equal(tierCap({...g,floorIndex:0}),2);
});
test('history-aware pool mix limits weapon/active streaks without inspection consuming RNG',()=>{
 const g=E.createGame('mix80');g.floorIndex=2;g.clears=5;g.unlocks.push('branchLessons','stormLessons');let previous='',specialStreaks=0;const categories=new Set();for(let i=0;i<600;i++){const id=drawArtifact(g,'treasure');assert(id);const c=ITEMS[id].category;categories.add(c);if(previous===c&&['weapon','active','familiar','risk'].includes(c))specialStreaks++;previous=c;}assert(categories.size>=7);assert(specialStreaks<45);const before=JSON.stringify(g);eligibleItems(g);rarityOdds(g);catalogUI(g,S.freshProfile());assert.equal(JSON.stringify(g),before);g.discarded.push('powerCandy');assert(!eligibleItems(g,{source:'boss'}).includes('powerCandy'));
});
test('real multi-level XP carries remainder and queues every lesson through pause/save',()=>{
 const g=E.createGame('xp80');assert(awardXP(g,500)>5);assert(g.school.pending.length>=2);const levels=[...g.school.pending];assert(openLesson(g));assert(E.pause(g));const st=memory();assert(S.save(st,S.freshProfile(),g));const loaded=S.load(st).active;assert.deepEqual(loaded,g);assert(E.resume(loaded));const frozen=loaded.time;E.tick(loaded,.1,{fire:true});assert.equal(loaded.time,frozen);for(let i=0;i<levels.length;i++){assert.equal(loaded.school.pending[0],levels[i]);assert(E.chooseLesson(loaded,i%2?'senior':'junior'));}assert.equal(loaded.phase,'playing');assert.equal(loaded.school.pending.length,0);assert(S.validRun(loaded));
});
test('academic ranks change actual junior bounce count and senior stone lifetime/damage',()=>{
 const g=E.createGame('academic80');g.school.junior=4;g.school.senior=3;assert(E.useUltimate(g));for(let i=0;i<12;i++)E.tick(g,.1);const rock=g.bullets.find(b=>b.kind==='boulder');assert(rock);assert.equal(rock.damage,126);assert.equal(rock.radius,42);assert(rock.life>7.7&&rock.life<=9);g.player.action=null;g.player.fireTimer=0;for(let i=0;i<25&&!g.bullets.some(b=>b.kind==='chain');i++)E.tick(g,.1,{fire:true,aim:{x:1,y:0}});const junior=g.bullets.find(b=>b.kind==='chain');assert(junior);assert.equal(junior.bounces,5);
});
test('conditional damage is snapshotted and charge+fan genuinely changes the shot plan',()=>{
 const g=E.createGame('condition80');const base=shotProfile(g).damage;E.takeItem(g,'openingBell');assert.equal(shotProfile(g).damage,base*2);E.tick(g,.01,{fire:true,aim:{x:1,y:0}});const pending=g.queue.find(q=>q.kind==='primary');assert(pending);E.current(g).shots=1;assert.equal(shotProfile(g).damage,base);assert.equal(pending.plan.damage,base*2);E.takeItem(g,'charge');E.takeItem(g,'fan');g.weapon='charge';const p=shotProfile(g);assert.equal(p.count,3);assert.equal(p.flags.split,false);E.takeItem(g,'restlessRibbon');g.player.moving=true;assert(shotProfile(g).damage>p.damage);
});
test('active pickup swaps charged old item onto reachable floor without free refill',()=>{
 const g=E.createGame('active80'),r=enter(g,'combat');assert(E.takeItem(g,'active_lantern'));assert.deepEqual(g.active,{id:'lantern',charge:0});g.active.charge=2;assert(E.takeItem(g,'active_clapper'));assert.deepEqual(g.active,{id:'clapper',charge:0});const q=r.artifacts[0];assert.equal(q.item,'active_lantern');assert.equal(q.charge,2);assert(reachable(r,q,32));assert.equal(g.items.length,0);assert.equal(g.found.length,2);assert(S.validRun(g));
});
test('active failures cost nothing; reflector converts actual hostile shots with caps',()=>{
 const g=E.createGame('clapper80'),r=enter(g,'combat');g.player.invuln=999;r.enemies.forEach(e=>e.appear=0);E.takeItem(g,'active_clapper');g.active.charge=3;assert(!E.useActive(g));assert.equal(g.active.charge,3);for(let i=0;i<30;i++)g.hostile.push({x:500,y:400,vx:100,vy:0,life:5,radius:6,damage:8});assert(E.useActive(g));assert.equal(g.hostile.length,6);assert(g.bullets.length>0&&g.bullets.length<=24);assert.equal(g.active.charge,0);assert(!E.useActive(g));
});
test('dice persists discarded IDs, pending items and exact RNG across reload',()=>{
 const g=E.createGame('dice80'),r=enter(g,'treasure');E.takeItem(g,'active_dice');g.active.charge=4;const old=r.pedestal.item;assert(E.useActive(g));assert(g.discarded.includes(old));assert.notEqual(r.pedestal.item,old);const st=memory();assert(S.save(st,S.freshProfile(),g));assert.deepEqual(S.load(st).active,g);assert(!E.useActive(S.load(st).active));
});
test('pocket escape preserves enemies and destroyed cover without rewards or charge refill',()=>{
 const g=E.createGame('escape80'),r=enter(g,'combat'),enemies=structuredClone(r.enemies);E.takeItem(g,'active_pocket');g.active.charge=3;const coins=g.coins,kills=g.kills,battery=g.battery;assert(E.useActive(g));assert.equal(g.room,0);assert.equal(g.coins,coins);assert.equal(g.kills,kills);assert.equal(g.battery,battery);assert.deepEqual(r.enemies,enemies);assert.equal(g.active.charge,0);assert(S.validRun(g));
});
test('lantern clears real fog/map restriction, never rewinds or refills a floor',()=>{
 const g=E.createGame('lamp80');g.curse='lost';E.takeItem(g,'active_lantern');g.active.charge=2;const before=visibleRooms(g).length;assert(E.useActive(g));assert(g.curseLifted);assert(visibleRooms(g).length>=before);assert.equal(g.active.charge,0);assert(!E.useActive(g));
});
test('regional rosters, advanced AIs and wave templates change with branches and waves',()=>{
 const banks=new Set(),ais=new Set();for(let level=0;level<3;level++){const g=E.createGame('roster80'),r=g.rooms.find(r=>r.type==='combat');r.level=level;r.branch=level===2?'echo':'root';const p=encounterFor(g.seed,r),next=encounterFor(g.seed,r,1);assert.notEqual(p.id,next.id);banks.add(p.roles.join(','));p.ais.forEach(a=>ais.add(a));assert(p.threat<=p.budget+.001);assert(p.roles.length<=8);}assert(banks.size>=2);assert(ais.has('summoner')||ais.has('blink')||ais.has('orbit'));
});
test('turret stays planted, blink/burrow land on the shared reachable geometry',()=>{
 for(const ai of ['turret','blink','burrow']){const g=E.createGame('ai80'),r=enter(g,'combat');r.enemies=[];const p=artifactPosition(g,r,{x:600,y:400}),e=E.spawnEnemy(g,ai==='burrow'?'fan':'caster',p.x,p.y);Object.assign(e,{ai,appear:0,timer:0});g.player.invuln=999;Object.assign(g.player,artifactPosition(g,r,{x:e.x+70,y:e.y}));const x=e.x,y=e.y;for(let i=0;i<20;i++)E.tick(g,.1);if(ai==='turret'){assert.equal(e.x,x);assert.equal(e.y,y);}assert(reachable(r,e,32));assert(S.validRun(g));}
});
test('boss species are seeded pools, patterns do not repeat the fixed old rotation',()=>{
 const roles=new Set();for(let i=0;i<12;i++){const g=E.createGame('boss-pool80-'+i),r=enter(g,'boss');roles.add(r.bossRole);assert.equal(r.enemies[0].hp,600);assert(S.validRun(g));}assert.equal(roles.size,2);
 const g=E.createGame('patterns80'),r=enter(g,'boss'),e=r.enemies[0],ids=[];e.appear=0;for(let i=0;i<12;i++){e.state='move';e.timer=0;bossStep(g,e,.01,{los:()=>true});ids.push(e.pattern);}assert(ids.every((id,i)=>i===0||id!==ids[i-1]));assert(ids.some((id,i)=>i>2&&id!==ids[i-3]));
});
test('clean play increases deterministic bonus-room chance; gate is a real connected room',()=>{
 let clean=0,hurt=0;for(let i=0;i<80;i++){for(const hit of [false,true]){const g=E.createGame('gate80-'+i),r=g.rooms.find(r=>r.type==='boss');g.floorHits=hit?2:0;r.hitsTaken=hit?1:0;const kind=openPerformanceGate(g,r);if(kind){if(hit)hurt++;else clean++;const bonus=g.rooms.find(q=>q.type===kind);assert(bonus);assert(links(g,r).some(l=>l.to===bonus.id));}}}assert(clean>hurt+15);
});
test('puzzle wrong step hurts, correct sequence grants one chest with no guaranteed artifact',()=>{
 const g=seedWith('puzzle'),r=enter(g,'puzzle');Object.assign(g.player,{x:640,y:430});assert(E.interact(g));const p=r.puzzle;g.player.invuln=0;Object.assign(g.player,p.pads[1]);E.tick(g,.01);assert.equal(g.player.hp,64);assert.equal(p.step,0);for(const pad of p.pads){Object.assign(g.player,{x:640,y:430});E.tick(g,.01);Object.assign(g.player,pad);E.tick(g,.01);}assert(p.done);assert.equal(r.chests.length,1);assert.equal(r.pedestal,null);assert.equal(g.puzzlesCompleted,1);E.tick(g,.1);assert.equal(r.chests.length,1);assert(S.validRun(g));
});
test('forge quotes and charges once, consumes last artifact and cannot leave an invalid weapon',()=>{
 const g=seedWith('forge');E.takeItem(g,'charge');g.coins=40;const r=enter(g,'forge');Object.assign(g.player,{x:640,y:430});const offer=r.forge.item,cost=r.forge.cost;assert(offer);assert(E.interact(g));assert(r.forge.used);assert(!g.items.includes('charge'));assert(g.discarded.includes('charge'));assert(g.items.includes(offer)||ITEMS[offer].active&&g.active);assert.equal(g.coins,40-cost);assert(!E.interact(g));assert(S.validRun(g));
});
test('both exits really select different seeded regions, carry resources and preserve no starter gift',()=>{
 for(const branch of ['canopy','archive']){const g=E.createGame('routes80');killBoss(g);Object.assign(g.player,{x:branch==='archive'?900:640,y:420});g.player.action=null;const coins=g.coins,keys=g.keys;assert(E.interact(g));assert.equal(g.floorIndex,1);assert.equal(g.regionPath[1],branch);assert.equal(g.coins,coins);assert.equal(g.keys,keys);assert.equal(E.current(g).pedestal,null);assert(S.validRun(g));}
});
test('performance gates, giant rooms, lessons, active queues and new profile all survive saves',()=>{
 const st=memory(),old=oldGame('old80');assert(Old.save(st,Old.freshProfile(),old));const oldBytes=st.getItem(Old.SAVE_KEY),imported=S.load(st);assert.equal(imported.active,null);assert(imported.legacyActive);const g=E.createGame('persist80');E.takeItem(g,'active_pocket');g.active.charge=2;awardXP(g,500);openLesson(g);E.pause(g);assert(S.save(st,S.capture(imported.profile,g),g));assert.deepEqual(S.load(st).active,g);assert.equal(st.getItem(Old.SAVE_KEY),oldBytes);assert(S.validProfile(S.load(st).profile));
});
test('prices scale by floor and quoted discounts remain exactly payable',()=>{
 const g=E.createGame('prices80');assert(itemPrice('powerCandy',{...g,floorIndex:2})>itemPrice('powerCandy',g));const r=enter(g,'shop');E.takeItem(g,'cursedCoupon');g.coins=60;const s=r.stock.find(s=>ITEMS[s.id]&&!ITEMS[s.id].active);Object.assign(g.player,{x:s.x,y:s.y});const quote=shopPrice(g,s),before=g.coins;assert(E.buy(g,s.id));assert.equal(g.coins,before-quote);assert.equal(g.spent,quote);assert(!E.buy(g,s.id));
});
test('render information is read-only and invalid progression/paid containers are rejected',()=>{
 const g=E.createGame('pure80'),r=enter(g,'treasure');Object.assign(g.player,{x:740,y:415});const before=JSON.stringify(g);itemPeek(g);catalogUI(g,S.freshProfile());rarityOdds(g);assert.equal(JSON.stringify(g),before);assert(S.validRun(g));g.school.junior=99;assert(!S.validRun(g));
});
test('escaping unlocks behavioral remix, not automatic scaling to player damage',()=>{
 const progress={...emptyProgress(),escapes:1,bosses:['velvet','erpin']};assert(unlocked(progress).includes('eclipseRoute'));const locked=E.createGame('remix80',{route:'eclipse'});assert.equal(locked.route,'normal');const g=E.createGame('remix80',{progress,route:'eclipse'});assert.equal(g.route,'eclipse');const r=enter(g,'boss');assert(r.enemies[0].affix);const before=E.spawnEnemy(g,'fan',500,430);E.takeItem(g,'damageFocus');const after=E.spawnEnemy(g,'fan',550,430);assert.equal(before.hp,after.hp);assert.equal(before.damage,after.damage);assert(S.validRun(g));
});
test('stale shop active is not purchased twice and a wrong branch never mutates history',()=>{
 const g=E.createGame('stale80'),r=enter(g,'shop');r.stock[0]={id:'active_lantern',price:9,sold:false,x:460,y:410};Object.assign(g.player,{x:460,y:410});E.takeItem(g,'active_lantern');g.coins=40;assert(!E.buy(g,'active_lantern'));assert.equal(g.coins,40);assert(!r.stock[0].sold);killBoss(g);const before=JSON.stringify(g);assert(!E.nextFloor(g,'invalid'));assert.equal(JSON.stringify(g),before);
});
test('new actual bonus rooms initialize cached blessing/deal and validate a paid exchange',()=>{
 const g=E.createGame('bonus80'),model=g.rooms.find(r=>r.type==='omen');model.enabled=true;model.type='devil';model.unlocked=true;const r=enter(g,'devil');Object.assign(g.player,{x:640,y:430});assert(r.deal.item);const cap=g.hpCap;assert(E.interact(g));assert.equal(g.hpCap,cap-12);assert.equal(g.deals,1);assert(!E.interact(g));assert(S.validRun(g));
});
test('deep-floor restock quotes use the exact scaled payment',()=>{
 const g=E.createGame('deep-price80');killBoss(g);Object.assign(g.player,{x:640,y:420});assert(E.nextFloor(g));const r=enter(g,'shop');Object.assign(g.player,{x:310,y:355});g.coins=40;const cost=restockCost(g),n=E.nearby(g);assert(n.text.includes(cost+'닢'));assert(E.interact(g));assert.equal(g.coins,40-cost);assert(S.validRun(g));
});
test('unlocks really introduce a second puzzle layout and only appear next run',()=>{
 let variant=false;for(let i=0;i<15;i++){const g=seedWith('puzzle'),r=enter(g,'puzzle');g.unlocks.push('puzzleMaster');r.layoutKey+=':'+i;initExtras(g,r);if(r.puzzle.pads.some(p=>p.x===640))variant=true;}assert(variant);const g=E.createGame('profile80');g.achievements.bosses=['velvet','erpin'];g.regionPath=['root','archive','echo'];g.puzzlesCompleted=1;const p=S.capture(S.freshProfile(),g);assert(unlocked(p.progress).includes('stormLessons'));assert(unlocked(p.progress).includes('branchLessons'));assert(unlocked(p.progress).includes('puzzleMaster'));assert(!g.unlocks.includes('stormLessons'));
});
test('junior chain ricochets back to a lone nearby target, with finite bounces',()=>{
 const g=E.createGame('one-target80'),r=enter(g,'combat');r.enemies=[];const at=artifactPosition(g,r,{x:650,y:440}),e=E.spawnEnemy(g,'fan',at.x,at.y);Object.assign(e,{hp:500,maxHp:500,appear:0,freezeUntil:20});g.bullets.push({id:++g.id,kind:'chain',x:e.x-60,y:e.y-26,vx:590,vy:0,age:0,life:4,radius:7,damage:10,hits:{},child:true,pierce:0,bounces:3,last:null,lock:0,plan:shotProfile(g)});for(let i=0;i<30;i++)E.tick(g,.1);assert(g.hits>=2);assert(g.hits<=3);assert.equal(g.bullets.length,0);
});
test('comet return children emit one bounded generation, and lightning spreads real freeze',()=>{
 const g=E.createGame('composition80');E.takeItem(g,'lucky');E.takeItem(g,'belt');E.takeItem(g,'cometThread');const plan=shotProfile(g);g.bullets.push({id:++g.id,kind:'stone',x:840,y:444,vx:-600,vy:0,age:.6,life:2,radius:5,damage:5,hits:{},child:true,pierce:0,returned:true,returning:true,plan});E.tick(g,.1);assert.equal(g.telemetry.comet,2);for(let i=0;i<15;i++)E.tick(g,.1);assert.equal(g.telemetry.comet,2);assert(g.bullets.length<=3);
 const h=E.createGame('storm80'),r=enter(h,'combat');r.enemies=[];const at=artifactPosition(h,r,{x:650,y:440}),e=E.spawnEnemy(h,'fan',at.x,at.y),other=E.spawnEnemy(h,'fan',at.x+70,at.y);for(const t of r.enemies)Object.assign(t,{hp:500,maxHp:500,appear:0,freezeUntil:10});E.takeItem(h,'frost');E.takeItem(h,'weather');E.takeItem(h,'snowGlobe');h.hits=11;h.bullets.push({id:++h.id,kind:'stone',x:e.x-40,y:e.y-26,vx:590,vy:0,age:0,life:2,radius:7,damage:1,hits:{},child:false,pierce:0,plan:shotProfile(h)});E.tick(h,.1);assert.equal(h.telemetry.storm,1);assert(other.freezeUntil>h.time);assert(h.zones.length<=80);
});
test('each boss unlocks a fourth real attack in later phases with indirect hints only',async()=>{
 const {castHint,drawCastHints}=await import('../dungeon80-hints.js');
 for(const [role,pattern]of [['velvet','whirlCharge'],['erpin','cascade'],['shady','veil']]){
  const g=E.createGame('phase80-'+role),r=enter(g,'boss');r.enemies=[];const e=E.spawnEnemy(g,role,800,430);Object.assign(e,{hp:100,maxHp:600,appear:0,state:'move',timer:0});const api={los:()=>true,damage(){},shot(){},effect(){},summon(){}};let found=false;
  for(let i=0;i<30;i++){e.state='move';e.timer=0;bossStep(g,e,.01,api);if(e.pattern===pattern){found=true;break;}}
  assert(found);assert.equal(e.phaseStage,3);const h=castHint(g,e);assert(h);assert.equal(h.angle,undefined);assert(h.markers.every(m=>Object.keys(m).join(',')==='x,y'));
  const before=JSON.stringify({g,e}),c={globalAlpha:1,save(){},restore(){},createRadialGradient(){return {addColorStop(){}};},beginPath(){},arc(){},fill(){},fillRect(){},lineTo(){throw Error('predictive ray');},stroke(){throw Error('predictive outline');}};drawCastHints(c,g,e,{reduced:true});assert.equal(JSON.stringify({g,e}),before);e.timer=0;bossStep(g,e,.01,api);assert.equal(e.state,'attack');assert(e.attackElapsed>0);
 }
});
test('both Yellow Card casts keep the reserved school rank and giant-room stones spawn at the real foot',()=>{
 const g=E.createGame('high-snapshot80');E.takeItem(g,'yellow');assert(E.useUltimate(g));assert.equal(g.queue.find(q=>q.kind==='highStart').school.senior,1);g.school.senior=3;for(let i=0;i<24;i++)E.tick(g,.1);assert.equal(g.telemetry.boulder,2);assert(g.bullets.filter(b=>b.kind==='boulder').every(b=>b.damage===90));
 let h,r;for(let i=0;i<20;i++){h=E.createGame('wide-rock80-'+i);const m=h.rooms.find(r=>r.type==='combat'&&['wide','grand'].includes(r.shape));if(m){r=enter(h,'combat',m.id);break;}}assert(r);r.enemies.forEach(e=>e.appear=999);Object.assign(h.player,artifactPosition(h,r,{x:1550,y:450}));h.player.invuln=999;assert(h.player.x>1280);assert(E.useUltimate(h));for(let i=0;i<12&&!h.bullets.some(b=>b.kind==='boulder');i++)E.tick(h,.1);const rock=h.bullets.find(b=>b.kind==='boulder');assert(rock);assert(rock.x>1280);assert(rock.x>=50&&rock.x<=viewFor(r).width-50);assert(S.validRun(h));
});
test('escape and return cannot erase room damage for flawless reward; metrics retain every floor',()=>{
 const g=E.createGame('flawless80'),r=enter(g,'combat');g.player.invuln=0;g.hostile.push({x:g.player.x,y:g.player.y-26,vx:0,vy:0,life:1,radius:8,damage:5});E.tick(g,.02);assert.equal(g.damageTaken,5);const start=r.damageStart;E.takeItem(g,'active_pocket');g.active.charge=3;assert(E.useActive(g));enter(g,'combat',r.id);assert.equal(r.damageStart,start);r.enemies.forEach(e=>e.hp=0);E.tick(g,.02);assert.equal(r.reward.flawless,false);assert.equal(g.combatLog.length,1);assert.equal(g.combatLog[0].damageTaken,5);assert(S.validRun(g));
});
