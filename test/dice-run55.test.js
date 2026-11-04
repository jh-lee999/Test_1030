import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dice-run-engine.js';
import {settle,bestMove,play} from '../tools/playtest-dice55.mjs';
function ready(){const g=E.createGame(55);E.chooseRelic(g,g.choices[0]);settle(g);g.relics=[];return g;}
function clear(g){g.enemyHp=1;g.lastPattern=null;E.attack(g,'free');settle(g);}
test('same v55 seed repeats draft, rolls and routes; previews/planner do not consume state',()=>{const a=ready(),b=ready();assert.deepEqual(a,b);const before=JSON.stringify(a);for(const id of Object.keys(E.PATTERNS))E.evaluate(a,id);E.enemyIntent(a);bestMove(a);assert.equal(JSON.stringify(a),before);E.reroll(a);settle(a);assert.notEqual(a.rollState,b.rollState);assert.equal(a.lootState,b.lootState);assert.equal(a.routeState,b.routeState);});
test('a lower damage pair can save HP; temporary guard absorbs before permanent shield and expires',()=>{
 const g=ready();g.dice=[1,1,6,5,4];g.shield=8;const pair=E.evaluate(g,'pair'),free=E.evaluate(g,'free');assert.equal(pair.guard,6);assert.equal(free.guard,0);assert.ok(pair.damage<free.damage);assert.equal(E.counterPreview(g,pair).shieldSpent,0);assert.equal(E.counterPreview(g,free).shieldSpent,6);
 g.enemyHp=1000;E.attack(g,'pair');settle(g);assert.equal(g.hp,48);assert.equal(g.shield,8);assert.equal(g.turnGuard,0);assert.equal(g.lastCounter.ward,6);
});
test('only a real reroll adds pressure; all-held and duplicate actions cannot farm or inflate it',()=>{
 const g=ready(),before=E.incoming(g);for(let i=0;i<5;i++)E.toggleHold(g,i);assert.equal(E.reroll(g),false);assert.equal(E.incoming(g),before);E.toggleHold(g,0);E.reroll(g);assert.equal(E.incoming(g),before+1);assert.equal(E.reroll(g),false);settle(g);E.reroll(g);settle(g);assert.equal(E.incoming(g),before+2);
});
test('enemy cycles are explicit, expose windows, and pairs permanently break current fight armor',()=>{
 const g=ready();g.foe=E.makeFoe(2,2);g.stage=2;g.enemyHp=1000;g.dice=[4,4,4,5,6];assert.equal(E.enemyIntent(g).armor,28);const pair=E.evaluate(g,'pair'),kind=E.evaluate(g,'kind');assert.equal(pair.breakArmor,true);assert.equal(kind.raw-kind.damage,28);E.attack(g,'pair');settle(g);assert.equal(g.armorBroken,true);assert.equal(E.enemyIntent(g).armor,0);g.turn=3;g.dice=[4,4,4,5,6];assert.equal(E.enemyIntent(g).exposed,true);const r=E.evaluate(g,'kind');assert.ok(r.steps.some(s=>s.source==='exposed'));
});
test('camp awards no automatic heal/relic: one mutually exclusive activity, training stacks and is capped',()=>{
 const g=ready();g.hp=20;clear(g);assert.equal(g.phase,'camp');assert.equal(g.hp,20);assert.equal(g.campPoints,1);assert.equal(E.leaveCamp(g),false);assert.ok(E.camp(g,'train','pair'));assert.equal(g.training.pair,1);assert.equal(E.camp(g,'rest'),false);assert.equal(g.hp,20);assert.ok(E.leaveCamp(g));assert.ok(E.chooseRoute(g,'safe'));settle(g);g.dice=[4,4,1,2,3];const r=E.evaluate(g,'pair');assert.equal(r.chips,32);assert.equal(r.mult,2.75);assert.equal(E.camp(g,'train','kind'),false);
 g.phase='camp';g.campPoints=4;assert.ok(E.camp(g,'train','pair'));assert.ok(E.camp(g,'train','pair'));assert.equal(E.camp(g,'train','pair'),false);assert.equal(g.training.pair,3);
});
test('relic browsing can cancel with no charge; selection charges exactly once and never starts combat',()=>{
 const g=ready();clear(g);const rng=g.rollState;E.camp(g,'relic');const choices=[...g.choices],loot=g.lootState;assert.equal(g.phase,'reward');assert.equal(g.campPoints,1);assert.ok(E.cancelReward(g));assert.equal(g.campPoints,1);E.camp(g,'relic');assert.deepEqual(g.choices,choices);assert.equal(g.lootState,loot);const id=g.choices[0];assert.ok(E.chooseRelic(g,id));assert.equal(g.phase,'camp');assert.equal(g.campPoints,0);assert.equal(E.chooseRelic(g,id),false);assert.equal(g.rollState,rng);
});
test('normal/elite routes change enemy and reward stakes; route selection resets only per-fight flags',()=>{
 const g=ready();g.rage=2;g.strikes=1;g.maceHits=2;g.relics=['belt'];clear(g);E.camp(g,'train','kind');E.leaveCamp(g);const [safe,elite]=g.routes;assert.notEqual(safe.enemy,elite.enemy);assert.equal(elite.maxHp,Math.round(safe.maxHp*1.6));assert.ok(E.chooseRoute(g,'elite'));assert.equal(g.depth,1);assert.equal(g.shield,8);assert.deepEqual([g.rage,g.strikes,g.maceHits],[2,1,2]);settle(g);clear(g);assert.equal(g.campPoints,2);
});
test('all six encounters must be cleared; boss bans repeat and safe pass always clears a dead-end',()=>{
 const g=ready();for(let depth=0;depth<6;depth++){assert.equal(g.depth,depth);clear(g);if(depth===5){assert.equal(g.phase,'won');break;}assert.notEqual(g.phase,'won');E.camp(g,'train',Object.keys(g.training).find(id=>g.training[id]<3));E.leaveCamp(g);E.chooseRoute(g,g.routes[0].id);settle(g);}
 const b=ready();b.foe=E.makeFoe(5,3);b.enemyHp=b.foe.maxHp;b.depth=5;b.stage=3;b.lastPattern='free';b.rerolls=0;b.dice=[1,2,3,4,6];assert.ok(E.canPass(b));assert.ok(E.pass(b));assert.equal(b.lastPattern,null);assert.equal(b.hp,36);
});
test('menus freeze, once-only settlement survives repeated ticks, and fresh runs reset growth/history',()=>{
 const g=ready();g.dice=[1,1,2,3,4];g.enemyHp=1000;const r=E.evaluate(g,'free');E.attack(g,'free');E.pause(g);const before=JSON.stringify(g);for(let n=0;n<100;n++)E.tick(g,1);assert.equal(JSON.stringify(g),before);E.resume(g);settle(g);assert.equal(g.enemyHp,1000-r.damage);assert.equal(g.attacks,1);const fresh=E.createGame(55);assert.equal(fresh.history.length,0);assert.deepEqual(Object.values(fresh.training),[0,0,0,0]);assert.equal(fresh.depth,0);
});
test('four relic slots require an explicit atomic replacement and reset only the removed relic charge',()=>{
 const g=ready();clear(g);g.relics=['echo','weather','belt','mace'];g.rage=2;g.strikes=2;g.maceHits=3;g.shield=4;g.phase='reward';g.choices=['yellow','pillow','komi'];const before=JSON.stringify(g);assert.equal(E.chooseRelic(g,'yellow'),false);assert.equal(JSON.stringify(g),before);assert.equal(E.chooseRelic(g,'yellow','missing'),false);assert.equal(E.chooseRelic(g,'yellow','weather'),true);assert.equal(g.relics.length,4);assert.ok(!g.relics.includes('weather'));assert.equal(g.strikes,0);assert.equal(g.rage,2);assert.equal(g.maceHits,3);assert.equal(g.shield,4);assert.equal(g.campPoints,0);
});
