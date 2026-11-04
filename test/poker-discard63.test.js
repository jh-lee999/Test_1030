import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../poker-engine.js';
function game(){const g=E.createGame('discard63');E.chooseStarter(g,'echo');return g;}
function conserve(g){const ids=[...g.hand.map(c=>c.id),...g.drawPile,...g.discardPile];assert.equal(ids.length,g.deck.length);assert.equal(new Set(ids).size,ids.length);assert.deepEqual([...ids].sort(),g.deck.map(c=>c.id).sort());}
test('individual selection allows6,7,8; full-hand discard replaces8 for exactly one use',()=>{
 const g=game(),old=g.hand.map(c=>c.id),rng=g.drawState;for(const c of g.hand)assert(E.toggleCard(g,c.id));assert.equal(g.selected.length,8);assert(E.allCardsSelected(g));assert.equal(g.drawState,rng);assert.equal(g.discards,3);assert(E.discard(g));assert.equal(g.discards,2);assert.equal(g.hand.length,8);assert(g.hand.every(c=>!old.includes(c.id)));assert(old.every(id=>g.discardPile.includes(id)));assert.equal(g.selected.length,0);assert.equal(g.hands,4);conserve(g);
});
test('bulk select, bulk clear, partial-to-full only touch selection, never score/RNG/resources',()=>{
 const g=game();E.toggleCard(g,g.hand[0].id);const {selected,...before}=structuredClone(g),damage=E.bestHand(g).damage;assert(E.selectAllCards(g));assert.equal(g.selected.length,8);assert(E.allCardsSelected(g));assert(E.selectAllCards(g));assert.deepEqual(g.selected,[]);assert(!E.allCardsSelected(g));const {selected:after,...rest}=structuredClone(g);assert.deepEqual(rest,before);assert.equal(E.bestHand(g).damage,damage);
});
test('any nonempty subset up to the actual hand size costs one, not one per card',()=>{
 for(let n=1;n<=8;n++){const g=game(),old=g.hand.map(c=>c.id),kept=old.slice(n);for(const c of g.hand.slice(0,n))E.toggleCard(g,c.id);assert(E.discard(g));assert.equal(g.discards,2);assert.equal(g.hand.length,8);assert(kept.every(id=>g.hand.some(c=>c.id===id)));assert.equal(g.discardPile.length,n);conserve(g);}
});
test('invalid, duplicate, foreign IDs, zero budget and locked phases are atomic no-ops',()=>{
 const g=game();for(const selected of [[],['missing'],[g.hand[0].id,g.hand[0].id],g.hand.map(c=>c.id).concat('missing')]){g.selected=selected;const before=JSON.stringify(g);assert(!E.discard(g));assert.equal(JSON.stringify(g),before);}g.selected=[];E.selectAllCards(g);g.discards=0;let before=JSON.stringify(g);assert(!E.discard(g));assert.equal(JSON.stringify(g),before);
 for(const phase of ['resolve','paused','shop','draft','won','dead']){g.phase=phase;before=JSON.stringify(g);assert(!E.selectAllCards(g));assert(!E.toggleCard(g,g.hand[0].id));assert(!E.discard(g));assert.equal(JSON.stringify(g),before);}
});
test('full-hand replacement cycles a small finite deck without duplicating/loss or free refill',()=>{
 const g=game();g.deck=g.deck.slice(0,20);g.hand=g.deck.slice(0,8).map(c=>({...c}));g.drawPile=g.deck.slice(8).map(c=>c.id);g.discardPile=[];g.relics=['extraDiscard'];g.discards=4;for(let i=0;i<4;i++){assert(E.selectAllCards(g));assert(E.discard(g));assert.equal(g.discards,3-i);assert.equal(g.hand.length,8);conserve(g);}const before=JSON.stringify(g);assert(!E.discard(g));assert.equal(JSON.stringify(g),before);
});
test('bulk discard remains separate from scoring maximum5 and next-turn bonus refill',()=>{
 const g=game();g.relics=['extraDiscard'];g.discards=4;g.enemyHp=100000;g.hp=1000;E.selectAllCards(g);E.discard(g);assert.equal(g.discards,3);assert(E.bestHand(g).indices.length<=5);E.attack(g);assert.equal(g.discards,3);for(let i=0;i<120&&g.phase==='resolve';i++)E.tick(g,1/30);assert.equal(g.phase,'pick');assert.equal(g.discards,4);assert.equal(g.hands,3);assert.equal(g.selected.length,0);conserve(g);
});
