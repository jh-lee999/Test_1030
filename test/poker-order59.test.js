import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../poker-engine.js';
import {relicOrderMarkup} from '../poker-order-ui.js';
function game(){const g=E.createGame('order59');E.chooseStarter(g,'echo');g.hand=[{id:'a',rank:5,suit:'hearts'},{id:'b',rank:5,suit:'hearts'}];g.relics=['pillow','rubber'];g.enemyHp=10000;return g;}
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(rest=>[v,...rest])):[[]];
function settle(g){for(let n=0;g.phase==='resolve'&&n<100;n++)E.tick(g,1/30);}
test('add-mult and multiply-mult execute at their actual visible slots',()=>{
 const g=game();assert.equal(E.bestHand(g).damage,90);const before=JSON.stringify(g),p=E.reorderPreview(g,0,1);assert.deepEqual(p,{order:['rubber','pillow'],before:90,after:80,delta:-10,pattern:'pair'});assert.equal(JSON.stringify(g),before);assert(E.moveRelic(g,0,1));assert.equal(E.bestHand(g).damage,80);assert.deepEqual(E.bestHand(g).steps.filter(s=>s.phase==='relic').map(s=>[s.source,s.slot,s.mult]),[['rubber',0,3],['pillow',1,4]]);
 g.discards=0;g.relics=['empty','rubber'];assert.equal(E.bestHand(g).damage,150);assert(E.moveRelic(g,0,1));assert.equal(E.bestHand(g).damage,120);
});
test('all24 permutations match a sequential arithmetic oracle; no hidden additions-first regrouping',()=>{
 for(const order of permutations(['echo','pillow','empty','rubber'])){const g=game();g.discards=0;g.relics=order;let mult=2;for(const id of order){if(id==='pillow')mult+=2;if(id==='empty')mult+=3;if(id==='rubber')mult*=1.5;}const r=E.evaluateHands(g).pair;assert.equal(r.chips,30);assert.equal(r.mult,mult,order.join(','));assert.equal(r.damage,Math.floor(30*mult));assert.deepEqual(r.relicOrder,order);assert.deepEqual(r.steps.filter(s=>s.phase==='relic').map(s=>s.slot),order.map((_,i)=>i).filter(i=>order[i]!=='echo'));}
});
test('card retriggers still trigger card-stage relics once, with charge previews read-only',()=>{
 const g=game();g.hand.forEach(c=>c.rank=14);g.relics=['weather','echo','candy','pillow'];const before=JSON.stringify(g),r=E.evaluateHands(g).pair;assert.equal(r.steps.filter(s=>s.source==='echo').length,2);assert.equal(r.steps.filter(s=>s.source==='weather').length,1);assert.equal(r.steps.filter(s=>s.source==='candy').length,4);assert.equal(r.strikes,1);assert.equal(r.mult,4);assert.equal(JSON.stringify(g),before);
 for(const order of permutations(['weather','echo','candy'])){g.relics=order;const q=E.evaluateHands(g).pair;assert.equal(q.chips,r.chips);assert.equal(q.strikes,1);assert.equal(q.steps.filter(s=>s.source==='echo').length,2);}
});
test('invalid moves and pending/paused resolutions cannot change scores, resources or RNG',()=>{
 const g=game();g.rage=3;g.strikes=2;g.maceHits=3;g.shield=8;for(const [from,to]of [[-1,0],[0,2],[0,0],[.5,1],[0,'1'],[NaN,1]]){const before=JSON.stringify(g);assert(!E.moveRelic(g,from,to));assert.equal(E.reorderPreview(g,from,to),null);assert.equal(JSON.stringify(g),before);}
 for(const phase of ['resolve','paused','won','dead']){g.phase=phase;g.returnPhase='resolve';const before=JSON.stringify(g);assert(!E.moveRelic(g,0,1));assert.equal(JSON.stringify(g),before);}
 g.phase='pick';const {relics,...before}=structuredClone(g);assert(E.moveRelic(g,0,1));const {relics:after,...rest}=structuredClone(g);assert.deepEqual(rest,before);assert.deepEqual(after,[...relics].reverse());
});
test('committed shot freezes its exact relic order and damage through menus and impact',()=>{
 const g=game();assert(E.attack(g));const p=g.pending;assert.equal(p.result.damage,90);assert.deepEqual(p.result.relicOrder,['pillow','rubber']);assert(!E.moveRelic(g,0,1));assert(E.pause(g));assert(!E.moveRelic(g,0,1));const before=JSON.stringify(g);E.tick(g,1);assert.equal(JSON.stringify(g),before);E.resume(g);settle(g);assert.equal(g.enemyHp,10000-90);assert.equal(g.lastResult.damage,90);assert.deepEqual(g.lastResult.relicOrder,['pillow','rubber']);
});
test('reorder survives shop and fight transition, replacement preserves chosen slot, fresh run resets',()=>{
 const g=game();g.phase='shop';g.shop={relics:['weather'],booster:[],cuts:0,copies:0,changes:0,lessons:0,rested:false,packBought:false};g.gold=100;g.relics=['pillow','rubber','echo','belt'];assert(E.moveRelic(g,0,3));assert.deepEqual(g.relics,['rubber','echo','belt','pillow']);assert(E.buyRelic(g,'weather','echo'));assert.deepEqual(g.relics,['rubber','weather','belt','pillow']);assert(E.travel(g));assert.deepEqual(g.relics,['rubber','weather','belt','pillow']);assert.deepEqual(E.createGame(g.seed).relics,[]);
});
test('stage-aware UI exposes real deltas, inactive conditions and move locks',()=>{
 const g=game(),before=JSON.stringify(g),html=relicOrderMarkup(g);assert.match(html,/-10/);assert.match(html,/90 → 80/);assert.match(html,/data-move-from="0"/);assert.equal(JSON.stringify(g),before);g.phase='paused';const locked=relicOrderMarkup(g);assert.match(locked,/배치 잠김/);assert(!locked.includes('draggable="true"'));
 g.phase='pick';g.relics=['empty','rubber'];const r=E.evaluateHands(g).pair;assert.equal(r.steps.find(s=>s.source==='empty').active,false);assert.equal(r.mult,3);
});
test('best legal hand is re-searched after reorder, not a stale damage-only label',()=>{
 const g=game();g.hand=[12,5,6,44,14,29,32,25].map(i=>({...g.deck[i]}));g.training.pair=1;assert.equal(E.bestHand(g).id,'twoPair');assert.equal(E.bestHand(g).damage,261);assert(E.moveRelic(g,0,1));assert.equal(E.bestHand(g).id,'pair');assert.equal(E.bestHand(g).damage,235);assert(E.attack(g));assert.equal(g.lastResult.id,'pair');assert.equal(g.lastResult.damage,235);
});
