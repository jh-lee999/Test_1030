import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../survivor71-engine.js';
import {WORLD,SPAWN,generateWorld,pathTo,blocked} from '../survivor71-world.js';
import * as P from '../survivor71-profile.js';
import * as Old from '../survivor69-profile.js';
import {createGame as oldGame} from '../survivor69-engine.js';
import {selectButterFrame,butterMuzzleOffset,BUTTER_GUN} from '../butter-gun-motion71.js';
const fresh=(seed='71')=>{const g=E.createGame(seed);E.chooseUpgrade(g,g.offers[0].id);return g;};
function card(g){const p=g.world.points.find(q=>q.artifact==='yellow');Object.assign(g.player,{x:p.x,y:p.y});assert(E.interact(g));assert(g.offers.some(o=>o.id==='relic:yellow'));assert(E.chooseUpgrade(g,'relic:yellow'));return g;}
function step(g,seconds,input={}){for(let t=0;t<seconds-1e-6&&g.phase==='playing';t+=1/90)E.tick(g,1/90,input);}
const quiet=g=>{g.spawnTimer=999;g.eliteAt=999;g.burstAt=999;g.championSpawned=true;g.player.invuln=999;};
test('v70 remains byte-identical and the new main uses independent v71 rules',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url));assert.equal(createHash('sha256').update(read('survivor70.html')).digest('hex'),'110aa5372ae7935967de025508da82b574fefc3a0b9a19c6426596149b397e39');assert.match(read('index.html').toString(),/survivor71\.js\?v=71/);
});
test('the recorded balance diagnostics are pinned to the exact current combat sources',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url));const report=JSON.parse(read('docs/survivor71-balance.json'));
 assert.equal(report.results.length,48);assert.equal(report.sourceSHA256,createHash('sha256').update(['survivor71-engine.js','survivor71-world.js','survivor71-content.js'].map(f=>read(f)).join('\n')).digest('hex'));
});
test('larger seeded maps have ten reachable POIs, a marked yellow chest and bounded mandatory travel',()=>{
 assert(WORLD.width*WORLD.height>=2600*2000*2);
 for(let i=0;i<50;i++)for(const map of ['forest','night','ember']){const w=generateWorld(i,map);assert.deepEqual(w,generateWorld(i,map));assert.equal(w.points.length,10);assert.equal(w.points.filter(p=>p.artifact==='yellow').length,1);assert(w.obstacles.length>=20);for(const p of w.points){assert(!blocked(w,p.x,p.y,25));assert(pathTo(w,SPAWN,p).length);if(p.type==='rift')assert(Math.hypot(p.x-SPAWN.x,p.y-SPAWN.y)<1100);}}
});
test('yellow card is acquired through a real chest choice, is unique, and does not remove levels/fusions',()=>{
 const g=fresh();g.moves.stone.level=3;const before=g.moves.stone;card(g);assert.equal(g.moves.stone,before);assert.equal(g.moves.stone.level,3);assert(!E.eligibleUpgrades(g).some(o=>o.id==='relic:yellow'));assert(P.validRun(g));
});
test('yellow uses two distinct source-timed ultimate releases; pause/save/resume cannot add casts',()=>{
 const normal=fresh();quiet(normal);assert(E.useUltimate(normal));step(normal,2.5);assert.equal(normal.telemetry.procs.ultimateShot,1);
 const g=card(fresh());quiet(g);g.player.invuln=0;assert(E.useUltimate(g));assert.equal(g.player.invuln,1.1);assert(!E.useUltimate(g));step(g,.85);assert.equal(g.telemetry.procs.ultimateShot,1);assert(E.pause(g));const frozen=JSON.stringify(g);E.tick(g,.15);assert.equal(JSON.stringify(g),frozen);
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert(P.saveStore(storage,P.freshProfile(),g));const restored=P.loadStore(storage).active;assert(restored);assert(E.resume(restored));step(restored,1.65);assert.equal(restored.telemetry.procs.ultimateShot,2);assert.equal(restored.player.invuln,0);assert(restored.player.ultCooldown>15);assert(!restored.queue.some(q=>q.kind.startsWith('ultimate')));assert(P.validRun(restored));
});
test('gun uses its original whole pose and matching moving muzzle, finite penetration/return and rank3 fragments',()=>{
 const g=card(fresh());quiet(g);g.world.hazards=[];g.moves.stone.level=3;const target=E.spawnEnemy(g,'fan',{x:g.player.x-260,y:g.player.y});target.hp=target.maxHp=10000;target.speed=0;
 step(g,.25,{x:.2});assert.equal(g.player.action.type,'gun');const f=selectButterFrame({gait:g.player.gait,action:g.player.action});assert.equal(f.key,'walkGun');assert(f.index>=0&&f.index<BUTTER_GUN.clips.walkGun.count);assert(Number.isFinite(butterMuzzleOffset({size:80,gait:g.player.gait,action:g.player.action}).x));assert(g.bullets.some(b=>b.kind==='gun'&&b.returning&&b.pierce===2));step(g,.6);assert(g.telemetry.procs.gunShot>=2);assert(g.telemetry.damageBy.gun>0);assert(g.telemetry.procs.fracture>0);
});
test('a long gun return path lives long enough to be caught and still triggers firefly exactly once',()=>{
 const g=card(fresh());quiet(g);g.world.obstacles=[];g.world.hazards=[];Object.assign(g.player,SPAWN);g.moves.stone.level=3;g.moves.chain={level:3,awake:true,timer:999};g.fusions=['firefly'];
 const e=E.spawnEnemy(g,'fan',{x:SPAWN.x-270,y:SPAWN.y});e.speed=0;e.hp=e.maxHp=10000;step(g,.25);g.moves.stone.timer=999;const b=g.bullets.find(b=>b.kind==='gun');assert(b.life>2);step(g,1.6);assert.equal(g.telemetry.procs.returnCatch,1);assert.equal(g.telemetry.procs['fusion:firefly:trigger'],1);
});
test('elite identities have genuinely different, locked, escapable attacks and no menu clock',()=>{
 for(const id of Object.keys(E.ELITES)){
  const g=fresh(id);quiet(g);g.moves.stone.timer=999;
  const e=E.spawnElite(g,id,{x:g.player.x-280,y:g.player.y});assert(e);e.timer=0;step(g,.02);assert.equal(e.state,'windup');const aim=[e.aimX,e.aimY],time=g.time;E.pause(g);E.tick(g,.15);assert.equal(g.time,time);E.resume(g);
  step(g,.5,{y:1});assert.deepEqual([e.aimX,e.aimY],aim);step(g,.7,{y:1});assert.equal(e.state,'special');assert(P.validRun(g));
  if(id==='shady'){assert.equal(e.x,aim[0]);assert.equal(e.y,aim[1]);step(g,.85);assert(e.pulses>=4);}if(id==='velvet'){assert(e.patternAge>0);assert.equal(g.telemetry.damageTaken,0);}if(id==='erpin'){step(g,.55);assert.equal(e.pulses,4);assert.equal(g.shots.filter(b=>b.kind==='magic').length,4);}
 }
});
test('regular enemy population increases, adds shield/drone roles and stays bounded',()=>{
 const g=fresh();quiet(g);g.time=160;g.spawnTimer=0;g.eliteAt=999;g.burstAt=999;E.tick(g,.1);assert.equal(g.enemies.length,4);assert(E.ROLES.guard&&E.ROLES.drone);
 for(let i=0;i<300;i++)E.spawnEnemy(g,'fan');assert.equal(g.enemies.length,E.MAX_ENEMIES);assert(E.spawnElite(g,'velvet'));assert.equal(g.enemies.length,E.MAX_ENEMIES);
});
test('legacy profile imports once into a new key without erasing old active runs or repeating rewards',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},old=Old.freshProfile();old.shards=12;old.studies.vitality=1;
 assert(Old.saveStore(storage,old,oldGame('legacy71')));const before=data.get(Old.SAVE_KEY);const loaded=P.loadStore(storage);assert.equal(loaded.profile.shards,12);assert(loaded.importedLegacy&&loaded.legacyActive);assert(P.saveStore(storage,loaded.profile,fresh()));assert.equal(data.get(Old.SAVE_KEY),before);assert.equal(P.loadStore(storage).active.version,71);old.shards=999;Old.saveStore(storage,old);assert.equal(P.loadStore(storage).profile.shards,12);
 const corrupted=structuredClone(P.loadStore(storage).active);corrupted.world.points[0].x++;assert(!P.validRun(corrupted));corrupted.world.points[0].x--;corrupted.enemies=[{eliteId:'script'}];assert(!P.validRun(corrupted));
});
