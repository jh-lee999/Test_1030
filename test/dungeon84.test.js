import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../dungeon84-engine.js';
import * as S from '../dungeon84-save.js';
import * as W from '../dungeon84-world.js';
import {encounterFor,safeFormation,ROLE_COST} from '../dungeon84-encounters.js';
import {ITEMS,isMechanic,COMBOS} from '../dungeon84-content.js';
import {drawArtifact,eligibleItems,rarityOdds,reservedItems,artifactOffers} from '../dungeon84-economy.js';
import {shotProfile,buildStats} from '../dungeon84-build.js';
import {impact,advanceFriendly} from '../dungeon84-shots.js';
import {itemPeek} from '../dungeon84-items-ui.js';
import {landingPoint,artifactPosition,addGoldenChest} from '../dungeon84-loot.js';
import {mapJournalHTML} from '../dungeon84-exploration.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
function visit(g,r){const from=g.rooms.find(q=>W.links(g,q).some(l=>l.to===r.id));assert(from);g.room=from.id;from.cleared=true;g.transition=0;g.phase='playing';r.unlocked=true;assert(E.enterRoom(g,W.links(g).find(l=>l.to===r.id).dir));g.player.invuln=999;return r;}
function advance(g,seconds){for(let t=0;t<seconds;t+=1/120)E.tick(g,1/120);}
const memory=()=>{const m=new Map();return {m,getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('84 independently plans connected main paths, legal terminal rewards and maximum-adjacency secrets in 3000 floors',()=>{
 const styles=new Set(),types=new Set(),shapes=new Set(),signatures=new Set();
 for(let seed=0;seed<1000;seed++)for(let floor=0;floor<3;floor++){
  const rooms=W.generateFloor('audit84-'+seed,floor,seed%7===0?'wild':'normal'),dist=W.distances(rooms),all=W.distances(rooms,0,true),boss=rooms.find(r=>r.type==='boss');
  assert.equal(Object.keys(all).length,rooms.length);assert(dist[boss.id]>=6+floor);assert.equal(rooms.filter(r=>r.type==='treasure').length,2);assert.equal(rooms.filter(r=>r.type==='shop').length,1);
  const ns=r=>rooms.filter(q=>W.adjacent(q,r));for(const r of rooms.filter(r=>['treasure','shop'].includes(r.type))){assert.equal(ns(r).length,1);assert.equal(ns(r)[0].type,'combat');}
  assert(rooms.some(r=>r.type==='treasure'&&dist[r.id]<=4));assert(dist[rooms.find(r=>r.type==='shop').id]<=5+floor);
  assert.equal(rooms.filter(r=>['sanctuary','forge'].includes(r.type)).length,1);assert.equal(rooms.filter(r=>['challenge','rush','bargain'].includes(r.type)).length,1);
  const secret=rooms.find(r=>r.type==='secret'),score=ns(secret).length;assert(ns(secret).every(r=>['combat','start'].includes(r.type)));
  if(rooms[0].style==='loop'){const core=rooms.filter(r=>['start','combat','boss'].includes(r.type));assert(core.reduce((n,r)=>n+core.filter(q=>W.adjacent(r,q)).length,0)/2>=core.length);}
  for(let y=-9;y<=9;y++)for(let x=-9;x<=9;x++){if(rooms.some(r=>r.x===x&&r.y===y))continue;const n=ns({x,y});if(n.every(r=>['combat','start'].includes(r.type)))assert(n.length<=score);}
  for(const r of rooms){assert.equal(r.id,rooms.indexOf(r));assert(Number.isInteger(r.depth)&&r.depth>=0);assert(W.ARCHETYPES.includes(r.archetype));styles.add(r.style);types.add(r.type);shapes.add(r.shape);}
  if(floor===0)signatures.add(JSON.stringify(rooms.map(({x,y,type})=>[x,y,type])));
 }
 assert.equal(styles.size,4);assert.equal(shapes.size,4);assert(signatures.size>990);assert(types.has('puzzle')&&types.has('archive'));
});
test('all four style rules affect actual topology, clone cache cannot leak mutations',()=>{
 const straight={spine:[],winding:[]};for(let i=0;i<300;i++){const r=W.generateFloor('style84-'+i),s=r[0].style;if(!straight[s])continue;const p=r.filter(q=>q.spine);straight[s].push(p.slice(2).filter((q,j)=>q.x-p[j+1].x===p[j+1].x-p[j].x&&q.y-p[j+1].y===p[j+1].y-p[j].y).length);}
 const mean=a=>a.reduce((n,x)=>n+x,0)/a.length;assert(mean(straight.spine)>mean(straight.winding)+.5);
 const a=W.generateFloor('clones84'),b=structuredClone(a);a[0].visited=false;a[1].archetype='bad';assert.deepEqual(W.generateFloor('clones84'),b);
});
test('cover, hazards and spawn roster are co-planned, reachable and deterministic at all room sizes',()=>{
 const styles=new Set(),roles=new Set(),sizes=new Set();for(let s=0;s<30;s++)for(let floor=0;floor<3;floor++)for(const model of W.generateFloor('layout84-'+s,floor).filter(r=>r.type==='combat')){
  const r={...model,obstacles:W.makeObstacles('unused',model)},snapshot=JSON.stringify(r),plan=encounterFor('unused',r),a=W.boundsFor(r),entry=W.nearestFree(r,{x:a.left+40,y:(a.top+a.bottom)/2},32),formation=safeFormation(r,plan,entry);
  assert(W.walkableLayout(r));assert.deepEqual(r.obstacles,W.makeObstacles('different',r));assert.deepEqual(plan,encounterFor('different',r));assert.equal(JSON.stringify(r),snapshot);
  for(const o of r.obstacles){assert(o.x>=a.left&&o.x+o.w<=a.right);assert(o.y>=a.top&&o.y+o.h<=a.bottom);for(const d of Object.values(W.doorsFor(r)))assert(!(o.x<d.x+85&&o.x+o.w>d.x-85&&o.y<d.y+85&&o.y+o.h>d.y-85));}
  for(const p of formation){assert(W.reachable(r,p,32));assert(Math.hypot(p.x-entry.x,p.y-entry.y)>200);roles.add(p.role);}
  for(let i=0;i<formation.length;i++)for(let j=0;j<i;j++)assert(Math.hypot(formation[i].x-formation[j].x,formation[i].y-formation[j].y)>64);
  assert(plan.threat<=plan.budget+1e-9);assert(Math.abs(plan.roles.reduce((s,r)=>s+ROLE_COST[r],0)-plan.threat)<1e-8);assert(plan.roles.length>=2&&plan.roles.length<=8);styles.add(r.archetype);sizes.add(r.shape);
 }
 assert.equal(styles.size,7);assert.equal(roles.size,5);assert.equal(sizes.size,4);
});
test('first encounters are bounded, deeper archetypes and waves vary independently of player strength',()=>{
 for(let s=0;s<60;s++){const g=E.createGame('pace84-'+s);for(const r of g.rooms.filter(r=>r.type==='combat')){const p=encounterFor(g.seed,r);if(r.depth<=2){assert(p.roles.length<=3);assert(!p.roles.includes('guard')&&!p.roles.includes('caster'));assert.equal(p.waves,1);}if(p.waves===2)assert.notDeepEqual(encounterFor(g.seed,r,1).roles,p.roles);const h=structuredClone(g);h.items=Object.keys(ITEMS);assert.deepEqual(encounterFor(h.seed,r),p);}}
});
test('ordinary waves pause/resume exactly and only final clear charges and rewards once',()=>{
 const g=E.createGame('waves84');const r=visit(g,g.rooms.find(r=>r.type==='combat'&&r.shape!=='normal'));g.battery=0;r.enemies=[];E.tick(g,.01);assert(!r.cleared&&r.waves.nextAt>g.time);assert.equal(g.battery,0);assert.equal(r.pickups.length,0);E.pause(g);const saved=structuredClone(g);assert(S.validRun(g));E.tick(g,.1);assert.deepEqual(g,saved);const store=memory();assert(S.save(store,S.freshProfile(),g));const h=S.load(store).active;assert.deepEqual(h,g);E.resume(g);E.resume(h);advance(g,1.3);advance(h,1.3);assert.deepEqual(h,g);assert.equal(r.waves.index,1);assert(r.enemies.length);assert.equal(g.battery,0);r.enemies=[];E.tick(g,.01);assert(r.cleared&&r.rewarded);assert.equal(g.battery,1);assert.equal(g.clears,1);const rewards=structuredClone(r.pickups);advance(g,1);assert.deepEqual(r.pickups,rewards);assert.equal(g.battery,1);
});
test('optional guardian is a source hero with bounded HP, not a mandatory boss reward',()=>{
 let g,r;for(let s=0;s<80;s++){g=E.createGame('guardian84-'+s);r=g.rooms.find(r=>r.type==='challenge'&&r.depth>=4);if(r)break;}assert(r);visit(g,r);Object.assign(g.player,{x:640,y:415});assert(E.interact(g));assert(E.acceptTrial(g));r.enemies=[];advance(g,1.3);assert.equal(r.challenge.wave,2);const e=r.enemies[0];assert(e.miniboss&&['velvet','erpin'].includes(e.role));assert.equal(e.hp,180);assert(S.validRun(g));r.enemies=[];E.tick(g,.01);assert.equal(r.challenge.state,'done');assert.equal(r.chests.length,1);assert.equal(r.pedestal,null);assert.equal(g.augments.length,0);assert.equal(g.achievements.bosses.length,0);
});
test('treasure pacing guarantees a real mechanic among first two offers per floor without starter gifts',()=>{
 for(const id of ['luckyClover','hardCandy','smoothPebble','powerCandy','juniorBook'])assert(!isMechanic(id),id+' is not a new combat mechanic');
 for(let s=0;s<500;s++){const g=E.createGame('gifts84-'+s);assert.equal(E.current(g).pedestal,null);const pool=eligibleItems(g);const a=drawArtifact(g,'treasure'),b=drawArtifact(g,'treasure',[a]);assert(pool.includes(a)&&pool.includes(b)&&a!==b);assert(isMechanic(a)||isMechanic(b));assert.equal(g.poolMix.treasure.floors[0].total,2);assert.equal(g.items.length,0);assert.equal(E.current(g).artifacts.length,0);}
});
test('loot eligibility, offer reservations, source history and preview purity survive saved replay',()=>{
 const g=E.createGame('loot-replay84');g.clears=5;const gifts=g.rooms.filter(r=>r.type==='treasure');for(const r of gifts)visit(g,r);const ids=gifts.map(r=>r.pedestal.item);assert.equal(new Set(ids).size,2);assert(ids.some(isMechanic));const snap=structuredClone(g);rarityOdds(g);itemPeek(g);mapJournalHTML(g);buildStats(g);assert.deepEqual(g,snap);const store=memory();assert(S.save(store,S.capture(S.freshProfile(),g),g));const h=S.load(store).active;for(let i=0;i<15;i++){const a=drawArtifact(g,i%2?'shop':'boss',ids),b=drawArtifact(h,i%2?'shop':'boss',ids);assert.equal(a,b);assert(!ids.includes(a));if(a){g.discarded.push(a);h.discarded.push(a);}}assert.deepEqual(h,g);
});
test('frost and return activate one bounded wave per returning parent, never children/outbound',()=>{
 const g=E.createGame('ice84'),r=E.current(g);g.items=['frost','belt'];r.enemies=[{id:1,x:600,y:420,hp:100},{id:2,x:640,y:420,hp:100},{id:3,x:900,y:420,hp:100}];const api={effect(){},hit(){},area(){},lightning(){}};
 const b={plan:shotProfile(g),returned:false,child:false,vx:1,vy:0};impact(g,api,b,r.enemies[0]);assert(!r.enemies[1].freezeUntil);b.returned=true;impact(g,api,b,r.enemies[0]);assert.equal(r.enemies[1].freezeUntil,.7);assert(!r.enemies[2].freezeUntil);impact(g,api,b,r.enemies[0]);assert.equal(g.telemetry.iceReturn,1);impact(g,api,{...b,iceDone:false,child:true},r.enemies[0]);assert.equal(g.telemetry.iceReturn,1);
});
test('mirror gives junior shots finite wall reflection while hit ricochet stays random',()=>{
 const g=E.createGame('mirror84'),r=E.current(g);g.items=['mirror','scythe'];g.player.invuln=999;for(let i=0;i<200;i++)E.tick(g,1/120,{fire:true,aim:{x:1,y:0}});assert(g.telemetry.ricochet>0);const plan=shotProfile(g);assert(plan.bounces>0);r.enemies=[];r.obstacles=[];g.bullets=[{id:999,kind:'chain',x:r.bounds.right-12,y:430,vx:590,vy:0,life:4,age:0,radius:7,damage:14,hits:{},bounces:5,wallBounces:plan.bounces}];const b=g.bullets[0];advanceFriendly(g,.05,{effect(){},hit(){},breakCrate(){}});assert(b.vx<0);assert.equal(b.wallBounces,plan.bounces-1);assert.equal(b.bounces,5);
});
test('bomb fire combo snapshots placement, limits zones and cannot recurse',()=>{
 const g=E.createGame('bombfire84');g.items=['fireworks','bell'];g.player.invuln=999;assert(E.placeBomb(g));g.items=[];advance(g,1.4);assert.equal(g.zones.filter(z=>z.kind==='fire').length,4);advance(g,1.5);assert.equal(g.zones.length,0);g.items=['fireworks','bell'];g.zones=Array.from({length:34},()=>({kind:'fire',x:100,y:100,age:0,life:3,radius:28,timer:0}));assert(E.placeBomb(g));advance(g,1.4);assert.equal(g.zones.filter(z=>z.kind==='fire').length,35);
});
test('84 imports profile only, never mutates legacy run/volume, and rejects topology/wave corruption',async()=>{
 const Old=await import('../dungeon83-engine.js'),OS=await import('../dungeon80-save.js'),store=memory(),old=Old.createGame('legacy84');assert(OS.save(store,OS.capture(OS.freshProfile(),old),old));store.setItem('butter.dungeon80.volume','.3');const legacy=store.getItem(OS.SAVE_KEY),loaded=S.load(store);assert(loaded.legacyActive);assert.equal(loaded.active,null);assert.deepEqual(store.getItem(OS.SAVE_KEY),legacy);const g=E.createGame('save84');assert(S.save(store,S.capture(loaded.profile,g),g));assert.deepEqual(S.load(store).active,g);assert.equal(store.getItem(OS.SAVE_KEY),legacy);assert.equal(store.getItem('butter.dungeon80.volume'),'.3');
 for(const key of ['archetype','variant','depth']){const h=structuredClone(g);h.rooms[1][key]='corrupt';assert(!S.validRun(h));}
 const r=visit(g,g.rooms.find(r=>r.type==='combat'));r.waves.total=9;assert(!S.validRun(g));
});
test('original art, source poses, manual controls and archive are retained with new rule imports',()=>{
 assert.match(read('dungeon84.html'),/dungeon84.js\?v=84/);assert.match(read('dungeon83.html'),/dungeon83.js\?v=83/);assert.match(read('dungeon84-renderer.js'),/dungeon81-cache.js/);assert.match(read('dungeon84.js'),/dungeon84-save.js/);assert.match(read('dungeon84.js'),/const id of new Set\(ids\)/);assert.match(read('dungeon84.js'),/\[boss.role\]/);assert.match(read('dungeon84-shots.js'),/guidanceAt\?\?\.12/);assert.match(read('dungeon84-shots.js'),/random\(g.combatRng\)/);assert.equal(COMBOS.filter(c=>c.parts.every(p=>ITEMS[p])).length,COMBOS.length);
});
test('83 source/diagnostic pins are exact with only archive-entry URL normalization',()=>{
 assert.equal(createHash('sha256').update(read('dungeon83.html')).digest('hex'),'d806d4f62ea59256f6d3c1c0d62b09dd61520305978b8bb16a6647b832ff2773');
 for(const [file,hash]of Object.entries(JSON.parse(read('docs/dungeon83-diagnostics.json')).sourceHashes)){let source=read(file==='index.html'?'dungeon83.html':file);if(file==='test/dungeon83.test.js')source=source.replace("read('dungeon83.html'),/dungeon83","read('index.html'),/dungeon83");if(file.startsWith('tools/')&&file.includes('dungeon83'))source=source.replaceAll("root+'/dungeon83.html?test=1","root+'/?test=1");assert.equal(createHash('sha256').update(source).digest('hex'),hash,file);}
});
test('cached shop/forge/deal/event offers reserve IDs for every other reward and reroll',()=>{
 const g=E.createGame('reserve84'),r=E.current(g);r.stock=[{id:'mirror',sold:false}];r.forge={item:'belt',used:false};r.deal={item:'bell',used:false};r.event={reward:'frost',used:false};r.pedestal={item:'mace',taken:false};r.artifacts=[{item:'fireworks',taken:false,source:'crate'}];const reserved=reservedItems(g);assert.equal(reserved.length,6);const ids=artifactOffers(g,3);assert(ids.every(id=>!reserved.includes(id)));assert.equal(new Set(ids).size,ids.length);const before=structuredClone(g);reservedItems(g);assert.deepEqual(g,before);
});
test('active replacements are explicit, retain charge, and cannot accumulate consumed swap records',()=>{
 const g=E.createGame('swaps84'),r=visit(g,g.rooms[1]);r.enemies=[];E.tick(g,.01);assert(r.cleared);assert(E.takeItem(g,'active_lantern'));g.active.charge=2;assert(E.takeItem(g,'active_clapper'));g.active.charge=1;
 for(let i=0;i<120;i++){const q=r.artifacts.find(q=>q.source==='swap'&&!q.taken);assert(q);Object.assign(g.player,{x:q.x,y:q.y});E.tick(g,.01);assert(!q.taken);assert.equal(E.nearby(g).kind,'artifactSwap');assert(E.interact(g));assert.equal(g.active.charge,i%2===0?2:1);assert.equal(r.artifacts.filter(q=>q.source==='swap').length,1);assert(S.validRun(g));}
});
test('turrets relocate after blocked sight, casters punish stationary cover only with readable ground warning',()=>{
 const g=E.createGame('ai84'),r=E.current(g);r.obstacles=[{x:600,y:330,w:75,h:160,hp:1,kind:'rock'}];g.player.x=450;g.player.y=450;g.player.invuln=999;const e=E.spawnEnemy(g,'archer',800,450);e.ai='turret';e.appear=0;e.timer=999;const start={x:e.x,y:e.y};advance(g,2);assert(Math.hypot(e.x-start.x,e.y-start.y)>10);
 r.enemies=[];const c=E.spawnEnemy(g,'caster',800,450);c.appear=0;c.timer=0;E.tick(g,.01);assert.equal(c.state,'tell');assert.equal(g.zones.length,0);advance(g,.9);const danger=g.zones.find(z=>z.kind==='danger');assert(danger&&danger.age<.2);assert.equal(danger.x,450);assert.equal(danger.y,450);
});
test('three floor transitions preserve resources/ranks and only final boss exit settles a win',()=>{
 const g=E.createGame('campaign84');g.keys=7;g.bombs=6;g.school.junior=3;g.school.senior=2;
 for(let floor=0;floor<3;floor++){const r=visit(g,g.rooms.find(r=>r.type==='boss'));r.enemies=[];E.tick(g,.01);assert(r.cleared&&r.pedestal&&r.bossGift);assert.equal(g.floorIndex,floor);if(floor<2){assert.equal(g.phase,'augment');assert(E.chooseAugment(g,g.choice[0]));assert(S.validRun(g));}else assert.equal(g.phase,'playing');Object.assign(g.player,{x:floor<2?900:640,y:420});g.transition=0;assert(E.nextFloor(g,floor===2?undefined:floor===0?'archive':'echo'));assert.equal(g.keys,7);assert.equal(g.bombs,6);assert.equal(g.school.junior,3);assert.equal(g.school.senior,2);if(floor<2){assert.equal(g.phase,'playing');assert.equal(E.current(g).type,'start');assert(S.validRun(g));}else assert.equal(g.phase,'won');}
 const profile=S.settle(S.freshProfile(),g);assert.equal(profile.wins,1);assert.equal(profile.records.length,1);assert.deepEqual(S.settle(profile,g),profile);assert(S.validProfile(profile));
});
test('corrupted loot history and wave deadline cannot silently reroll or mint free clears',()=>{
 const g=E.createGame('corrupt84');drawArtifact(g);assert(S.validRun(g));const a=structuredClone(g);a.poolMix.treasure.total++;assert(!S.validRun(a));const b=structuredClone(g);b.poolMix.treasure.floors[0].mechanics=99;assert(!S.validRun(b));
 const r=visit(g,g.rooms.find(r=>r.type==='combat'&&r.shape!=='normal'));r.enemies=[];E.tick(g,.01);assert(S.validRun(g));const c=structuredClone(g);c.rooms[r.id].waves.nextAt=g.time+999;assert(!S.validRun(c));
});
test('rewards cannot land on teleport activation discs, including shifted fallback portal positions',()=>{
 for(let seed=0;seed<60;seed++)for(const r of W.generateFloor('portal-landing84-'+seed,2,'normal','moon').filter(r=>r.type==='combat')){
  r.obstacles=W.makeObstacles('unused',r);r.biome=W.makeBiome('unused',r);assert.equal(r.biome.kind,'portals');const g={player:W.nearestFree(r,{x:640,y:470},32),id:0};
  for(const portal of r.biome.points)for(const p of [landingPoint(r,portal),artifactPosition(g,r,portal),addGoldenChest(g,r,portal)]){assert(W.reachable(r,p,32));assert(r.biome.points.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>=70));}
 }
});
