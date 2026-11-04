import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../poker-engine.js';
const cards=(ranks,suits=[])=>ranks.map((rank,i)=>({id:'t'+i,rank,suit:suits[i]||['hearts','clubs','diamonds','spades'][i%4]}));
function started(seed=58,starter='echo'){const g=E.createGame(seed);assert(E.chooseStarter(g,starter));return g;}
function settle(g){for(let n=0;g.phase==='resolve'&&n<120;n++)E.tick(g,1/30);assert.notEqual(g.phase,'resolve');}
function shop(){const g=started();g.enemyHp=1;assert(E.attack(g));settle(g);assert.equal(g.phase,'shop');return g;}
const serialized=g=>JSON.stringify(g);
function conservation(g){const ids=[...g.hand.map(c=>c.id),...g.drawPile,...g.discardPile];assert.equal(ids.length,g.deck.length);assert.equal(new Set(ids).size,ids.length);assert.deepEqual([...ids].sort(),g.deck.map(c=>c.id).sort());}
test('all thirteen exact scoring hands, ace-low and no ace wrap',()=>{
 for(const [ranks,suits,id]of [
 [[14],[],'high'],[[8,8],[],'pair'],[[8,8,4,4],[],'twoPair'],[[9,9,9],[],'three'],
 [[2,3,4,5,6],[],'straight'],[[14,2,3,4,5],[],'straight'],[[10,11,12,13,14],[],'straight'],
 [[2,4,7,9,13],Array(5).fill('hearts'),'flush'],[[5,5,5,9,9],[],'fullHouse'],[[7,7,7,7],[],'four'],
 [[5,6,7,8,9],Array(5).fill('clubs'),'straightFlush'],[[10,11,12,13,14],Array(5).fill('spades'),'royal'],
 [[7,7,7,7,7],[],'five'],[[5,5,5,9,9],Array(5).fill('diamonds'),'flushHouse'],[[7,7,7,7,7],Array(5).fill('hearts'),'flushFive']
 ])assert.equal(E.classify(cards(ranks,suits)),id,JSON.stringify(ranks));
 assert.equal(E.classify(cards([12,13,14,2,3])),null);assert.equal(E.classify(cards([2,3,4,5,5])),null);assert.equal(E.classify([]),null);assert.equal(E.classify([{rank:15,suit:'hearts'}]),null);
});
test('eight-card search finds quad/full house, chooses actual damage not nominal rank, excludes boss ban',()=>{
 const g=started();g.relics=[];g.hand=cards([9,9,9,9,4,4,10,14]);let r=E.evaluateHands(g);assert(r.four&&r.fullHouse&&r.three&&r.pair&&r.twoPair);assert.equal(E.bestHand(g).id,'four');
 g.training.pair=8;assert.equal(E.bestHand(g).id,'pair');g.foe.boss=true;g.lastPattern='pair';assert.notEqual(E.bestHand(g).id,'pair');assert(E.evaluateHands(g).pair.blocked);
 const h=started();h.hand=cards([10,11,12,13,14,2,4,8],Array(8).fill('hearts'));assert.equal(E.bestHand(h).id,'royal');
});
test('52 unique cards, reproducible shuffle, no replacement draws, held cards survive discard',()=>{
 const a=started('same'),b=started('same');assert.deepEqual(a,b);assert.equal(a.deck.length,52);assert.equal(new Set(a.deck.map(c=>c.id)).size,52);assert.equal(new Set(a.deck.map(E.cardName)).size,52);conservation(a);
 const keep=a.hand.slice(3).map(c=>c.id),old=a.hand.slice(0,3).map(c=>c.id);for(const id of old)assert(E.toggleCard(a,id));assert(E.discard(a));assert.equal(a.discards,2);assert(keep.every(id=>a.hand.some(c=>c.id===id)));assert(old.every(id=>a.discardPile.includes(id)));conservation(a);
 for(let turn=0;turn<2;turn++){for(const c of a.hand.slice(0,5))E.toggleCard(a,c.id);assert(E.discard(a));conservation(a);}const state=serialized(a);assert(!E.discard(a));assert.equal(serialized(a),state);
});
test('discard selection is finite, validates phase, no RNG or currency changes for browsing',()=>{
 const g=started(),rng=g.drawState;assert(!E.discard(g));assert(!E.toggleCard(g,'missing'));for(const c of g.hand)assert(E.toggleCard(g,c.id));assert.equal(g.selected.length,8);assert.equal(g.drawState,rng);const state=serialized(g);for(let i=0;i<5;i++){E.bestHand(g);E.evaluateHands(g);E.deckSummary(g);}assert.equal(serialized(g),state);E.pause(g);assert(!E.discard(g));assert(!E.toggleCard(g,g.hand[0].id));assert(!E.attack(g));
});
test('attacks commit strongest on click, apply exactly once at release, consume only scoring cards',()=>{
 const g=started();g.enemyHp=10000;const expected=E.bestHand(g),oldHand=g.hand.map(c=>c.id),hp=g.enemyHp;assert(E.attack(g));assert.equal(g.lastResult.damage,expected.damage);assert.equal(g.hands,3);assert.equal(g.enemyHp,hp);assert(!E.attack(g));while(!g.pending.applied)E.tick(g,1/30);assert.equal(g.enemyHp,hp-expected.damage);E.pause(g);const frozen=serialized(g);E.tick(g,1);assert.equal(serialized(g),frozen);E.resume(g);settle(g);assert.equal(g.enemyHp,hp-expected.damage);assert(oldHand.filter(id=>!expected.cardIds.includes(id)).every(id=>g.hand.some(c=>c.id===id)));assert.equal(g.discards,3);conservation(g);
});
test('four attacks are an actual fail condition; no infinite free throws',()=>{
 const g=started();g.enemyHp=100000;g.hp=g.maxHp=1000;for(let i=0;i<4;i++){assert(E.attack(g));settle(g);}assert.equal(g.phase,'dead');assert.equal(g.hands,0);assert.match(g.notice,/공격 기회/);assert(!E.attack(g));
});
test('real discard refill can recycle exhausted discard pile without duplicating cards',()=>{
 const g=started();g.deck=g.deck.slice(0,20);g.drawPile=g.deck.slice(8).map(c=>c.id);g.hand=g.deck.slice(0,8).map(c=>({...c}));g.discardPile=[];g.enemyHp=10000;g.hp=1000;
 for(let n=0;n<3;n++){for(const c of g.hand.slice(0,5))E.toggleCard(g,c.id);assert(E.discard(g));conservation(g);}assert.equal(g.drawPile.length,12);assert.equal(g.discardPile.length,0);assert.equal(g.hand.length,8);
});
test('remove/copy/suit/rank are atomic paid deck mutations that persist into next fight',()=>{
 const g=shop();g.gold=100;const removed=g.deck[0],copy=g.deck[1],change=g.deck[2];assert(E.editDeck(g,'remove',removed.id));assert.equal(g.deck.length,51);assert.equal(g.gold,96);assert.equal(E.serviceQuote(g,'remove').cost,6);
 assert(E.editDeck(g,'copy',copy.id));assert.equal(g.gold,90);assert.equal(g.deck.filter(c=>c.rank===copy.rank&&c.suit===copy.suit).length,2);assert.equal(new Set(g.deck.map(c=>c.id)).size,g.deck.length);
 assert(E.editDeck(g,'suit',change.id,'spades'));assert(E.editDeck(g,'rank',change.id,14));assert.equal(change.rank,14);assert.equal(change.suit,'spades');assert.equal(g.gold,84);const stable=serialized(g);assert(!E.editDeck(g,'rank',change.id,3));assert.equal(serialized(g),stable);
 assert(E.travel(g));assert(!g.deck.some(c=>c.id===removed.id));assert.equal(g.deck.find(c=>c.id===change.id).suit,'spades');conservation(g);
});
test('invalid and unaffordable purchases are no-ops; minimum deck20 and service quotas are enforced',()=>{
 const g=shop();g.gold=100;let before=serialized(g);assert(!E.editDeck(g,'remove','missing'));assert(!E.editDeck(g,'suit',g.deck[0].id,g.deck[0].suit));assert(!E.editDeck(g,'rank',g.deck[0].id,99));assert.equal(serialized(g),before);g.gold=0;before=serialized(g);assert(!E.editDeck(g,'copy',g.deck[0].id));assert(!E.train(g,'pair'));assert(!E.buyPack(g,0));assert(!E.buyRelic(g,g.shop.relics[0]));assert.equal(serialized(g),before);g.gold=100;g.deck=g.deck.slice(0,20);before=serialized(g);assert(!E.editDeck(g,'remove',g.deck[0].id));assert.equal(serialized(g),before);
});
test('training stacks by exact displayed increments, survives shops/fights, new run resets all growth',()=>{
 const g=shop();g.gold=100;const id='fullHouse',old=E.PATTERNS[id];g.hand=cards([6,6,6,9,9,2,3,14]);const before=E.evaluateHands(g)[id];assert(E.train(g,id));assert(E.train(g,id));assert.equal(g.training[id],2);const after=E.evaluateHands(g)[id];assert.equal(after.chips-before.chips,old.growth[0]*2);assert.equal(after.mult-before.mult,old.growth[1]*2);assert(!E.train(g,id));assert(E.travel(g));assert.equal(g.training[id],2);const fresh=E.createGame(g.seed);assert.equal(fresh.training[id],0);assert.equal(fresh.deck.length,52);assert.equal(fresh.gold,12);
});
test('shop offers are stable, interest pays once, no automatic heal, elite routes have real cost/reward',()=>{
 const g=started();g.hp=30;g.gold=25;g.enemyHp=1;assert(E.attack(g));settle(g);assert.equal(g.hp,30);assert.equal(g.gold,25+8+6+5);assert.equal(g.history.at(-1).interest,5);const frozen=serialized(g);for(let i=0;i<30;i++)E.tick(g,1/30);assert.equal(serialized(g),frozen);const stock=serialized(g.shop);E.deckSummary(g);E.serviceQuote(g,'train');assert.equal(serialized(g.shop),stock);assert(E.travel(g,true));assert(g.foe.elite);assert.equal(g.foe.maxHp,Math.round(340*1.45));assert.equal(E.enemyIntent(g).attack,6);
});
test('pack chooses exactly one card; full relic slots require explicit atomic replacement',()=>{
 const g=shop();g.gold=100;const expected=g.shop.booster[1];assert(E.buyPack(g,1));assert.deepEqual({...g.deck.at(-1),id:undefined},{...expected,id:undefined});assert.equal(g.deck.length,53);assert(!E.buyPack(g,0));g.relics=['echo','rubber','weather','yellow'];g.strikes=2;g.rage=3;g.shop.relics=['belt','lucky'];let before=serialized(g);assert(!E.buyRelic(g,'belt'));assert(!E.buyRelic(g,'belt','no'));assert.equal(serialized(g),before);assert(E.buyRelic(g,'belt','weather'));assert.equal(g.relics.length,4);assert.equal(g.strikes,0);assert.equal(g.rage,3);assert(!g.shop.relics.includes('belt'));
});
test('relic chains match previews, finite echoes, charge carry and actual HP loss only',()=>{
 const g=started();g.relics=['echo','weather','candy','pillow'];g.hand=cards([14,14,9,5,2,3,7,11]);g.hand[0].suit=g.hand[1].suit='hearts';const r=E.evaluateHands(g).pair;assert.equal(r.steps.filter(s=>s.source==='echo').length,2);assert.equal(r.steps.filter(s=>s.source==='weather').length,1);assert.equal(r.strikes,1);assert.equal(r.mult,4);const before=serialized(g);E.evaluateHands(g);assert.equal(serialized(g),before);
 g.relics=['yellow','mace','belt'];g.shield=8;g.enemyHp=10000;g.hand=cards([2,4,7,9,11,12,13,14]);assert(E.attack(g));settle(g);assert.equal(g.rage,0);assert.equal(g.maceHits,0);assert.equal(g.hp,48);
});
test('boss bans previous exact hand and no-legal-hand pass works without softlock',()=>{
 const g=started();g.foe.boss=true;g.hand=cards([2,4,6,8]);g.lastPattern='high';g.discards=0;assert.equal(E.bestHand(g),null);assert(E.canPass(g));const hp=g.hp;assert(E.pass(g));assert.equal(g.hands,3);assert(g.hp<hp);assert.equal(g.lastPattern,null);assert(E.bestHand(g));
});
test('boss enrage does not retroactively increase a committed counter, no death resurrection',()=>{
 const g=started();g.foe.boss=true;g.foe.maxHp=400;g.enemyHp=201;g.relics=[];g.hand=cards([5,5,2,3,7,9,11,14]);assert(E.attack(g));const committed=g.pending.returnDamage;while(!g.pending.applied)E.tick(g,1/30);assert(g.enemyHp<=200);assert.equal(E.counterPreview(g,g.pending.result).raw,committed);settle(g);
 const h=started();h.hp=1;h.relics=['komi'];h.enemyHp=10000;h.hand=cards([2,2,3,3,4,4,5,5]);assert(E.attack(h));settle(h);assert.equal(h.phase,'dead');assert.equal(h.hp,0);
});
test('previous root is preserved verbatim, new root loads finite-card engine',()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL('../dice57.html',import.meta.url))).digest('hex'),'16a8e425bba9ef28f17078fe3447dc6b5d0de801eef3000e68aa8f7fc387d066');assert.match(readFileSync(new URL('../cards67.html',import.meta.url),'utf8'),/poker\.js\?v=67/);
});
test('near-complete hints count unseen candidates without reading order or changing state',()=>{
 const g=started();g.hand=cards([10,11,12,13,2,4,7,9],['hearts','hearts','hearts','hearts','clubs','clubs','clubs','spades']).map(c=>({...g.deck.find(d=>d.rank===c.rank&&d.suit===c.suit)}));g.drawPile=g.deck.filter(c=>!g.hand.some(h=>h.id===c.id)).map(c=>c.id);const before=serialized(g),h=E.drawHints(g);assert(h.some(x=>x.text.includes('플러시')&&x.text.includes('더미 9장')));assert(h.every(x=>x.discard.length<=5&&x.discard.every(id=>g.hand.some(c=>c.id===id))));assert.equal(serialized(g),before);g.drawPile.reverse();assert.deepEqual(E.drawHints(g),h);g.discards=0;assert.deepEqual(E.drawHints(g),[]);
});
test('changing the actual deck changes draw distribution, copy cards enable real hidden hands',()=>{
 const g=shop();g.gold=100;const c=g.deck.find(c=>c.rank===14&&c.suit==='hearts');assert(E.editDeck(g,'copy',c.id));const twins=g.deck.filter(x=>x.rank===14&&x.suit==='hearts');assert.equal(twins.length,2);assert.notEqual(twins[0].id,twins[1].id);const summary=E.deckSummary(g);assert.equal(summary.ranks[14],5);assert.equal(summary.suits.hearts,14);assert(E.travel(g));assert(g.drawPile.includes(twins[0].id)||g.hand.some(x=>x.id===twins[0].id));assert(g.drawPile.includes(twins[1].id)||g.hand.some(x=>x.id===twins[1].id));
});
