import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../poker-engine.js';
function game(){const g=E.createGame('turn61');E.chooseStarter(g,'echo');g.enemyHp=100000;g.hp=g.maxHp=1000;return g;}
function settle(g){for(let n=0;g.phase==='resolve'&&n<120;n++)E.tick(g,1/30);assert.notEqual(g.phase,'resolve');}
function spend(g,n=3){for(let i=0;i<n;i++){assert(E.toggleCard(g,g.hand[0].id));assert(E.discard(g));}}
function conserve(g){const ids=[...g.drawPile,...g.discardPile,...g.hand.map(c=>c.id)];assert.equal(ids.length,g.deck.length);assert.equal(new Set(ids).size,ids.length);}
test('spent discards refill only after attack/counter completes; hands remain per-fight',()=>{
 const g=game();spend(g);assert.equal(g.discards,0);assert(E.attack(g));assert.equal(g.discards,0);assert.equal(g.hands,3);assert.equal(g.turn,1);const saved=g.pending.result,remaining=g.hand.filter(c=>!saved.cardIds.includes(c.id)).map(c=>c.id);
 while(!g.pending.applied)E.tick(g,1/30);assert.equal(g.discards,0);assert.equal(g.pending.result,saved);settle(g);assert.equal(g.phase,'pick');assert.equal(g.turn,2);assert.equal(g.discards,E.DISCARDS_PER_TURN);assert.equal(g.hands,3);assert(remaining.every(id=>g.hand.some(c=>c.id===id)));assert.match(g.notice,/버리기 3회 충전/);conserve(g);
 spend(g);assert(E.attack(g));settle(g);assert.equal(g.turn,3);assert.equal(g.discards,3);assert.equal(g.hands,2);conserve(g);
});
test('partial and unused budgets reset to exactly3, never carry into4..6',()=>{
 for(const used of [0,1,2,3]){const g=game();spend(g,used);assert(E.attack(g));settle(g);assert.equal(g.discards,3,'used '+used);assert.equal(g.hands,3);}
});
test('discard/refill, invalid input, inspection, pause, time and reordering never replenish a turn',()=>{
 const g=game();spend(g);const old=g.drawState;assert(!E.discard(g));assert.equal(g.drawState,old);assert.equal(g.discards,0);for(let i=0;i<20;i++){E.tick(g,1/30);E.bestHand(g);E.drawHints(g);}assert.equal(g.discards,0);E.pause(g);assert(!E.discard(g));const frozen=JSON.stringify(g);E.tick(g,1);assert.equal(JSON.stringify(g),frozen);E.resume(g);assert.equal(g.discards,0);g.relics=['empty','rubber'];E.moveRelic(g,0,1);assert.equal(g.discards,0);
});
test('no-legal-hand pass pays its counter/attack and starts with fresh discards',()=>{
 const g=game();g.foe.boss=true;g.hand=[2,4,6,8].map((rank,i)=>({id:'pass'+i,rank,suit:'hearts'}));g.lastPattern='high';g.discards=0;const hp=g.hp;assert(E.canPass(g));assert(E.pass(g));assert.equal(g.turn,2);assert.equal(g.hands,3);assert(g.hp<hp);assert.equal(g.discards,3);assert.equal(g.lastPattern,null);assert(!E.canPass(g));
});
test('death, last nonlethal hand and victory do not create a new turn or refund an attack',()=>{
 const dead=game();dead.hand=[2,3,4,5,6].map((rank,i)=>({id:'death'+i,rank,suit:'hearts'}));dead.discards=0;dead.hp=1;assert(E.attack(dead));settle(dead);assert.equal(dead.phase,'dead');assert.equal(dead.discards,0);assert.equal(dead.turn,1);
 const last=game();last.hands=1;last.discards=1;assert(E.attack(last));settle(last);assert.equal(last.phase,'dead');assert.equal(last.discards,1);assert.equal(last.hands,0);assert.equal(last.turn,1);
 const won=game();won.enemyHp=1;won.discards=0;assert(E.attack(won));settle(won);assert.equal(won.phase,'shop');assert.equal(won.discards,0);assert.equal(won.turn,1);assert(E.travel(won));assert.equal(won.turn,1);assert.equal(won.discards,3);assert.equal(won.hands,4);
});
test('empty and bell use committed current-turn budget, then recompute with next-turn3',()=>{
 const g=game();g.relics=['empty','bell','rubber'];spend(g);assert(E.attack(g));const committed=g.pending.result;assert(committed.steps.some(s=>s.source==='empty'&&s.active));assert(!committed.steps.some(s=>s.source==='bell'&&s.active));E.pause(g);assert.equal(g.pending.result,committed);assert.equal(g.discards,0);E.resume(g);settle(g);assert.equal(g.discards,3);const next=E.bestHand(g);assert(!next.steps.some(s=>s.source==='empty'&&s.active));assert(next.steps.some(s=>s.source==='bell'&&s.active));assert.equal(g.lastResult,committed);
});
