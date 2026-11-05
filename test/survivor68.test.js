import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../survivor68-engine.js';
import {validSave,saveRun,loadRun} from '../survivor68-save.js';
import {butterReleasePoint} from '../butter-original-motion.js';
const advance=(g,t,input={})=>{for(let i=0;i<Math.ceil(t*100);i++)E.tick(g,.01,input);};
const sandbox=()=>{const g=E.createGame('test');g.spawnTimer=1e6;return g;};
const enemy=(g,x=1450,y=1000)=>{const e=E.spawnEnemy(g,'fan',{x,y});e.hp=e.maxHp=10000;e.speed=0;e.damage=0;e.timer=1e6;return e;};
function pick(g,id){g.offers=E.eligibleUpgrades(g).filter(o=>o.id===id);g.phase='upgrade';g.pendingLevels=1;assert(E.chooseUpgrade(g,id));}
test('root is the survivor; archived card entry remains unchanged',()=>{
 assert.match(readFileSync(new URL('../survivor68.html',import.meta.url),'utf8'),/survivor68\.js\?v=68/);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../cards67.html',import.meta.url))).digest('hex'),'2ab738b1056819422baeed5fc8e040980152b120b7cbf12744ab7fdf9cb16ee5');
});
test('seeded simulation is deterministic and uses independent loot RNG',()=>{
 const a=E.createGame('same'),b=E.createGame('same');advance(a,8,{x:1});advance(b,8,{x:1});assert.deepEqual(a,b);
 const c=E.createGame('same'),d=E.createGame('same');E.grantXp(c,8);assert.notEqual(c.lootRng,d.lootRng);assert.equal(c.spawnRng,d.spawnRng);
 assert.notEqual(E.seedNumber('x'),E.seedNumber('y'));
});
test('movement normalizes diagonals, clamps bounds/invalid input; pause freezes every clock',()=>{
 const g=sandbox(),s=E.stats(g);advance(g,1,{x:1,y:1});assert(Math.abs(Math.hypot(g.player.x-1300,g.player.y-1000)-s.speed)<.01);
 const p={...g.player};E.tick(g,.1,{x:NaN,y:Infinity});assert.equal(g.player.x,p.x);assert.equal(g.player.y,p.y);
 g.player.x=E.WORLD.width-70;E.tick(g,.1,{x:1});assert.equal(g.player.x,E.WORLD.width-70);
 E.pause(g);const frozen=JSON.stringify(g);advance(g,1,{x:-1});assert.equal(JSON.stringify(g),frozen);E.resume(g);assert.equal(g.phase,'playing');
});
test('arena corners cannot collapse spawn rings onto the player',()=>{
 for(const [x,y]of [[70,70],[2530,70],[70,1930],[2530,1930]]){const g=sandbox();g.player.x=x;g.player.y=y;for(let i=0;i<100;i++){const e=E.spawnEnemy(g);assert(Math.hypot(e.x-x,e.y-y)>=364);}const boss=E.spawnEnemy(g,'ghost',{distance:400,final:true});assert(Math.hypot(boss.x-x,boss.y-y)>=280);}
});
test('overflow XP queues ALL levels, freezes combat and spends one choice each',()=>{
 const g=sandbox(),amount=E.xpNeeded(1)+E.xpNeeded(2)+E.xpNeeded(3)+2;E.grantXp(g,amount);
 assert.equal(g.level,4);assert.equal(g.pendingLevels,3);assert.equal(g.xp,2);const frozen=JSON.stringify(g);advance(g,3);assert.equal(JSON.stringify(g),frozen);
 assert.equal(E.chooseUpgrade(g,'bogus'),false);for(let n=3;n>0;n--){assert.equal(g.pendingLevels,n);assert.equal(new Set(g.offers.map(o=>o.id)).size,g.offers.length);assert(E.chooseUpgrade(g,g.offers[0].id));}assert.equal(g.phase,'playing');assert.equal(g.pendingLevels,0);
});
test('growth stacks in derived stats; slots/level/awakening caps are enforced',()=>{
 const g=sandbox();for(let i=0;i<3;i++)pick(g,'passive:power');assert.equal(E.stats(g).damage,1.45);
 pick(g,'passive:heart');assert.equal(E.stats(g).maxHp,120);assert.equal(g.player.hp,120);
 pick(g,'passive:lower');assert.equal(g.moves.chain.level,1);pick(g,'move:pillow');pick(g,'move:storm');assert.equal(Object.keys(g.moves).length,4);assert(!E.eligibleUpgrades(g).some(o=>o.id==='move:bomb'));
 for(let i=0;i<4;i++)pick(g,'move:chain');assert(!E.eligibleUpgrades(g).some(o=>o.id==='awake:chain'));g.cores=1;pick(g,'awake:chain');assert.equal(g.cores,0);assert(g.moves.chain.awake);assert(!E.eligibleUpgrades(g).some(o=>o.id==='awake:chain'));assert(E.moveStats('chain',5,true).bounces>E.moveStats('chain',1).bounces);
});
test('normal shot waits for original release frame and uses the visible muzzle/facing',()=>{
 const g=sandbox(),e=enemy(g);E.tick(g,.11);assert.equal(g.bullets.length,0);assert.equal(g.queue.length,1);const at=g.queue[0].at;assert(at>g.time);assert(Math.abs(at-(.1+butterReleasePoint('normal')*.48))<.02);
 e.x=1150;advance(g,at-g.time+.03,{x:1});assert(g.bullets.length>0);assert.equal(g.player.action.facing,1);assert(g.bullets[0].vx<0);assert(g.bullets[0].x<g.player.x);assert(g.player.gait.amount>.15);
});
test('chain re-hits A after B, but has finite bounce budget and excludes only immediate target',()=>{
 const g=sandbox();g.moves={stone:{level:1,awake:false,timer:1e6},chain:{level:1,awake:false,timer:0}};
 const a=enemy(g,1380,1000),b=enemy(g,1450,1000);advance(g,1.4);assert(a.hp<a.maxHp-17);assert(b.hp<b.maxHp);assert.equal(g.bullets.length,0);
});
test('piercing stones cannot repeatedly damage a stationary overlapping target',()=>{
 const g=sandbox(),e=enemy(g);g.bullets.push({id:99,kind:'stone',x:e.x,y:e.y,vx:0,vy:0,radius:7,life:1,damage:10,pierce:3,hits:{},lock:0});advance(g,.3);assert.equal(e.hp,e.maxHp-10);
});
test('pillow knockback, lightning stun and delayed area bomb affect actual enemies',()=>{
 const g=sandbox(),e=enemy(g,1389,1000);g.moves.pillow={level:3,awake:false,timer:0};E.tick(g,.01);assert(e.hp<e.maxHp);assert(e.vx>0);
 g.moves.storm={level:1,awake:false,timer:0};E.tick(g,.01);assert(e.stun>0);
 g.moves.bomb={level:1,awake:false,timer:0};E.tick(g,.01);const hp=e.hp;advance(g,.8);assert(e.hp<hp);assert(g.effects.some(e=>e.kind==='blast'));
});
test('ultimate releases once, only casting grants immunity, and cooldown blocks reuse',()=>{
 const g=sandbox();enemy(g);assert(E.useUltimate(g));assert(!E.useUltimate(g));advance(g,.95);assert.equal(g.bullets.filter(b=>b.kind==='boulder').length,1);assert(g.player.invuln>0);advance(g,.3);assert.equal(g.player.invuln,0);assert.equal(g.bullets.filter(b=>b.kind==='boulder').length,1);assert(g.player.ultCooldown>0);
});
test('rusher locks aim before charging; caster damage waits for ground warning',()=>{
 const g=sandbox();g.moves.stone.timer=1e6;const e=E.spawnEnemy(g,'rusher',{x:1450,y:1000});e.timer=0;E.tick(g,.01);assert.equal(e.state,'windup');const aim=e.aimY;g.player.y+=150;advance(g,.3);assert.equal(e.aimY,aim);assert.equal(e.state,'windup');
 const c=E.spawnEnemy(g,'caster',{x:1400,y:1150});c.timer=0;E.tick(g,.01);assert.equal(c.state,'windup');assert.equal(g.player.hp,100);const target={x:c.aimX,y:c.aimY};g.player.x=target.x-200;advance(g,1.1);assert.equal(g.player.hp,100);
});
test('final boss spawns at capacity and victory requires actual damage',()=>{
 const g=sandbox();for(let i=0;i<E.MAX_ENEMIES;i++)E.spawnEnemy(g,'fan',{x:200,y:200});g.time=E.FINAL_AT;g.championSpawned=true;g.eliteAt=1e6;E.tick(g,.01);assert.equal(g.enemies.length,E.MAX_ENEMIES);const boss=g.enemies.find(e=>e.final);assert(boss);assert.equal(g.phase,'playing');boss.hp=1;boss.x=1450;boss.y=1000;boss.speed=0;g.moves.storm={level:1,awake:false,timer:0};E.tick(g,.01);assert.equal(g.phase,'won');assert(g.won);
});
test('save/load preserves queued choices, live projectiles and pause; corrupt/blocked storage fails safely',()=>{
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k)},g=sandbox();enemy(g,1700);advance(g,.45);assert(g.bullets.length>0);E.grantXp(g,40);assert(validSave(g));assert(saveRun(storage,g));const loaded=loadRun(storage);assert.deepEqual(loaded,g);E.pause(loaded);assert(validSave(loaded));E.resume(loaded);assert.equal(loaded.phase,'upgrade');
 const corrupt=structuredClone(g);corrupt.moves.unknown={level:1,awake:false,timer:0};assert(!validSave(corrupt));for(const change of [h=>delete h.bullets[0].hits,h=>delete h.bullets[0].vx,h=>h.offers[0].id='move:not-real',h=>h.player.hp=201,h=>h.moves.stone.awake=true]){const bad=structuredClone(g);change(bad);assert(!validSave(bad));}assert.equal(loadRun({getItem:()=>'{bad'}),null);assert.equal(loadRun({getItem(){throw Error('denied');}}),null);assert.equal(saveRun(null,g),false);
 g.phase='dead';assert(saveRun(storage,g));assert.equal(loadRun(storage),null);
});
