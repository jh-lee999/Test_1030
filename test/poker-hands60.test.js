import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../poker-engine.js';
import {completedHandView,completedHandsMarkup} from '../poker-hand-ui.js';
function game(ranks=[9,9,9,4,4,2,7,14]){const g=E.createGame('hands60');E.chooseStarter(g,'echo');g.relics=[];g.hand=ranks.map((rank,i)=>({id:'fixture'+i,rank,suit:Object.keys(E.SUITS)[i%4]}));g.enemyHp=10000;return g;}
const view=(g,id=null)=>{const results=E.evaluateHands(g);return completedHandView(g,results,E.bestHand(g,results),id);};
test('always-visible completed hands match exact engine results, best damage first, no RNG writes',()=>{
 const g=game(),before=JSON.stringify(g),results=E.evaluateHands(g),v=view(g);assert.equal(v.entries[0].id,E.bestHand(g).id);assert.deepEqual(new Set(v.entries.map(r=>r.id)),new Set(Object.keys(results)));assert(v.entries.some(r=>r.id==='fullHouse'));assert(v.entries.some(r=>r.id==='three'));assert(v.entries.some(r=>r.id==='pair'));assert.equal(v.completed,Object.keys(results).length);assert.equal(v.blocked,0);assert.equal(v.automatic.damage,results[v.automatic.id].damage);assert.equal(JSON.stringify(g),before);
});
test('inspecting a weaker hand changes only inspection cards, never automatic attack or resources',()=>{
 const g=game(),before=JSON.stringify(g),v=view(g,'pair');assert.equal(v.inspected.id,'pair');assert.equal(v.inspectingOther,true);assert.deepEqual(v.highlightIds,E.evaluateHands(g).pair.cardIds);assert.equal(v.inspected.cards.length,2);assert(v.inspected.cards.every(c=>c.label&&c.color));assert.notEqual(v.automatic.id,'pair');assert.match(completedHandsMarkup(v),/자동 · 최강/);assert.match(completedHandsMarkup(v),/최강 족보로 돌아가기/);assert.equal(JSON.stringify(g),before);E.attack(g);assert.equal(g.lastResult.id,v.automatic.id);
});
test('completed-but-banned hand remains inspectable without becoming playable',()=>{
 const g=game();g.foe.boss=true;g.lastPattern='fullHouse';const v=view(g,'fullHouse'),banned=v.entries.find(e=>e.id==='fullHouse');assert(banned.blocked);assert.equal(v.blocked,1);assert.notEqual(v.automatic.id,'fullHouse');assert.equal(v.inspected.id,'fullHouse');assert.match(completedHandsMarkup(v),/완성 · 보스 봉인/);assert.match(completedHandsMarkup(v),/봉인되어 발사 불가/);
 const h=game([2,4,6,9]);h.foe.boss=true;h.lastPattern='high';const noLegal=view(h,'high');assert.equal(noLegal.automatic,null);assert.equal(noLegal.completed,1);assert.match(completedHandsMarkup(noLegal),/공격 가능한 족보 없음/);h.discards=0;assert.match(completedHandsMarkup(view(h)),/빈손으로 넘기면 반격/);
});
test('committed resolution shows only the frozen attack even after the boss ban/scoring state changes',()=>{
 const g=game();g.foe.boss=true;E.attack(g);const expected=structuredClone(g.pending.result);g.hp=10;g.training[expected.id]++;let v=view(g,'pair');assert.equal(v.resolving,true);assert.equal(v.entries.length,1);assert.equal(v.automatic.id,expected.id);assert.equal(v.automatic.damage,expected.damage);assert.equal(v.automatic.mult,expected.mult);assert.deepEqual(v.highlightIds,[]);assert.match(completedHandsMarkup(v),/공격 확정/);assert.match(completedHandsMarkup(v),/disabled/);E.pause(g);v=view(g,'pair');assert.equal(v.resolving,true);assert.equal(v.automatic.damage,expected.damage);
});
test('royal, quad and ace-low hands use existing rules; no false missing pattern invented',()=>{
 const royal=game([10,11,12,13,14]);royal.hand.forEach(c=>c.suit='hearts');assert.equal(view(royal).automatic.id,'royal');assert.match(completedHandsMarkup(view(royal)),/로열 스트레이트 플러시/);
 const four=game([8,8,8,8,2,3,4,14]);assert(view(four).entries.some(r=>r.id==='four'));
 const low=game([14,2,3,4,5]);assert(view(low).entries.some(r=>r.id==='straight'));const bad=game([12,13,14,2,3]);assert(!view(bad).entries.some(r=>r.id==='straight'));
});
test('relic reorder updates automatic hand and completed damage without sorting/mutating game state',()=>{
 const g=game();g.hand=[12,5,6,44,14,29,32,25].map(i=>({...g.deck[i]}));g.relics=['pillow','rubber'];g.training.pair=1;assert.equal(view(g).automatic.id,'twoPair');E.moveRelic(g,0,1);const before=JSON.stringify(g),v=view(g,'twoPair');assert.equal(v.automatic.id,'pair');assert.equal(v.automatic.damage,235);assert.equal(v.inspected.id,'twoPair');assert.equal(JSON.stringify(g),before);
});
