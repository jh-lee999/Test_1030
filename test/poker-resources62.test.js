import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../poker-engine.js';
const settle=g=>{for(let i=0;i<120&&g.phase==='resolve';i++)E.tick(g,1/30);};
function shop(seed='resources62'){const g=E.createGame(seed);E.chooseStarter(g,'echo');g.enemyHp=1;E.attack(g);settle(g);assert.equal(g.phase,'shop');return g;}
function offerBoth(g){g.shop.relics=['extraHand','extraDiscard'];g.gold=100;}
function startWithBoth(){const g=shop();offerBoth(g);const used={hands:g.hands,discards:g.discards};assert(E.buyRelic(g,'extraHand'));assert(E.buyRelic(g,'extraDiscard'));assert.equal(g.hands,used.hands);assert.equal(g.discards,used.discards);assert(E.travel(g));return g;}
test('caps derive from unique equipped relics, pure previews and no reordering bonuses',()=>{
 const g=E.createGame('limits');assert.deepEqual(E.resourceLimits(g),{hands:4,discards:3});g.relics=['extraHand','extraDiscard','echo','rubber'];const before=JSON.stringify(g);assert.deepEqual(E.resourceLimits(g),{hands:5,discards:4});const p=E.relicResourcePreview(g,'weather','extraHand');assert.deepEqual(p,{before:{hands:5,discards:4},after:{hands:4,discards:4}});assert.equal(JSON.stringify(g),before);assert.equal(E.relicResourcePreview(g,'weather'),null);assert.equal(E.relicResourcePreview(g,'extraHand','echo'),null);g.relics.reverse();assert.deepEqual(E.resourceLimits(g),{hands:5,discards:4});g.relics.push('extraHand','extraDiscard');assert.deepEqual(E.resourceLimits(g),{hands:5,discards:4});
});
test('real paid acquisitions cost8/one slot each, do not refill in shop, and start fight5/4',()=>{
 const g=shop();offerBoth(g);const hands=g.hands,discards=g.discards;assert(E.buyRelic(g,'extraHand'));assert.equal(g.gold,92);assert.equal(g.relics.length,2);assert.equal(g.hands,hands);assert.equal(g.discards,discards);assert(E.buyRelic(g,'extraDiscard'));assert.equal(g.gold,84);assert.equal(g.relics.length,3);assert.deepEqual(E.resourceLimits(g),{hands:5,discards:4});assert.equal(g.hands,hands);assert.equal(g.discards,discards);assert(E.travel(g));assert.equal(g.hands,5);assert.equal(g.discards,4);
});
test('four legal discards and a fifth attack are real usable resources; next turn refills4 not hands',()=>{
 const g=startWithBoth();g.enemyHp=100000;g.hp=g.maxHp=1000;for(let turn=1;turn<=5;turn++){assert.equal(g.discards,4);for(let n=0;n<4;n++){E.toggleCard(g,g.hand[0].id);assert(E.discard(g));}assert.equal(g.discards,0);const before=JSON.stringify(g);assert(!E.discard(g));assert.equal(JSON.stringify(g),before);assert(E.attack(g));assert.equal(g.discards,0);settle(g);assert.equal(g.hands,5-turn);if(turn<5){assert.equal(g.phase,'pick');assert.equal(g.discards,4);assert.equal(g.turn,turn+1);}}assert.equal(g.phase,'dead');assert.match(g.notice,/공격 기회 5회/);assert.equal(g.discards,0);assert(!E.attack(g));
});
test('replacing resource relic removes its cap without free refill; purchases cannot exceed slots',()=>{
 const g=shop();offerBoth(g);g.relics=['extraHand','extraDiscard','echo','rubber'];g.hands=2;g.discards=4;g.shop.relics=['weather','candy'];const before=JSON.stringify(g);assert(!E.buyRelic(g,'weather'));assert.equal(JSON.stringify(g),before);assert(E.buyRelic(g,'weather','extraDiscard'));assert.equal(g.discards,3);assert.equal(g.hands,2);assert.deepEqual(E.resourceLimits(g),{hands:5,discards:3});assert(E.buyRelic(g,'candy','extraHand'));assert.equal(g.relics.length,4);assert.equal(g.hands,2);assert.deepEqual(E.resourceLimits(g),{hands:4,discards:3});assert(E.travel(g));assert.equal(g.hands,4);assert.equal(g.discards,3);
});
test('changing utility identity in the same slot cannot farm remaining resources',()=>{
 const g=shop();g.gold=100;g.relics=['extraHand','echo','rubber','bell'];g.hands=1;g.discards=0;g.shop.relics=['extraDiscard'];const p=E.relicResourcePreview(g,'extraDiscard','extraHand');assert.deepEqual(p.after,{hands:4,discards:4});assert(E.buyRelic(g,'extraDiscard','extraHand'));assert.equal(g.hands,1);assert.equal(g.discards,0);assert.equal(g.relics[0],'extraDiscard');assert.equal(g.gold,92);const before=JSON.stringify(g);assert(!E.buyRelic(g,'extraDiscard','echo'));assert.equal(JSON.stringify(g),before);
});
test('utility offers are accessible, seeded, cached, unique and exclude owned relics',()=>{
 for(let seed=0;seed<12;seed++){const g=shop('offer'+seed),other=shop('offer'+seed);assert.deepEqual(g.shop,other.shop);assert(g.shop.relics.some(id=>E.RELIC_STAGES[id]==='resource'));assert.equal(new Set(g.shop.relics).size,g.shop.relics.length);const before=JSON.stringify(g);for(let i=0;i<10;i++){E.resourceLimits(g);E.relicResourcePreview(g,g.shop.relics[0]);}assert.equal(JSON.stringify(g),before);}
 const g=startWithBoth();g.enemyHp=1;E.attack(g);settle(g);assert(!g.shop.relics.some(id=>['extraHand','extraDiscard'].includes(id)));
});
test('bonus discards feed current-turn bell/empty and pass refill, without extra damage from utility order',()=>{
 const g=startWithBoth();g.enemyHp=100000;g.hp=1000;g.relics=['extraHand','extraDiscard','bell','empty'];const r=E.bestHand(g);assert(r.steps.some(s=>s.source==='bell'&&s.label.includes('40')));assert(!r.steps.some(s=>s.source==='extraHand'||s.source==='extraDiscard'));for(let n=0;n<4;n++){E.toggleCard(g,g.hand[0].id);E.discard(g);}E.attack(g);assert(g.pending.result.steps.some(s=>s.source==='empty'&&s.active));settle(g);assert.equal(g.discards,4);g.foe.boss=true;g.hand=[2,4,6,8].map((rank,i)=>({id:'pass'+i,rank,suit:'hearts'}));g.lastPattern='high';g.discards=0;const hands=g.hands;assert(E.pass(g));assert.equal(g.hands,hands-1);assert.equal(g.discards,4);
});
test('unauthorized phase/insufficient money/preview cannot equip or change caps; fresh run resets',()=>{
 const g=shop();offerBoth(g);g.gold=7;let before=JSON.stringify(g);assert(!E.buyRelic(g,'extraHand'));assert.equal(JSON.stringify(g),before);g.gold=100;g.phase='pick';before=JSON.stringify(g);assert(!E.buyRelic(g,'extraHand'));assert.equal(JSON.stringify(g),before);g.phase='shop';g.shop.relics=['unknown'];before=JSON.stringify(g);assert(!E.buyRelic(g,'unknown'));assert.equal(JSON.stringify(g),before);assert.deepEqual(E.resourceLimits(E.createGame(g.seed)),{hands:4,discards:3});
});
