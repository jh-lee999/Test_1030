import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dice-run-engine.js';
import {settle} from '../tools/playtest-dice55.mjs';
function ready(){const g=E.createGame(56);E.chooseRelic(g,g.choices[0]);settle(g);g.relics=[];return g;}
test('two manual pips per fight, no RNG/pressure cost, auto hold, no artificial kept bonus',()=>{
 const g=ready();g.dice=[2,3,4,5,5];g.kept[4]=true;const rng=[g.rollState,g.lootState,g.routeState],pressure=E.incoming(g);assert.equal(E.nudgeDie(g,4,1),true);assert.equal(g.dice[4],6);assert.equal(g.held[4],true);assert.equal(g.kept[4],false);assert.equal(g.nudges,1);assert.equal(g.nudgesUsed,1);assert.equal(E.incoming(g),pressure);assert.deepEqual([g.rollState,g.lootState,g.routeState],rng);assert.ok(E.evaluate(g,'straight'));assert.equal(E.nudgeDie(g,4,-1),true);const before=JSON.stringify(g);assert.equal(E.nudgeDie(g,0,1),false);assert.equal(JSON.stringify(g),before);
});
test('invalid edit range, index, delta and phases are complete no-ops',()=>{
 const g=ready();g.dice=[1,6,3,4,5];for(const args of [[0,-1],[1,1],[-1,1],[5,-1],[.5,1],[0,0],[0,2],[0,'1']]){const before=JSON.stringify(g);assert.equal(E.nudgeDie(g,...args),false);assert.equal(JSON.stringify(g),before);}for(const phase of ['rolling','resolve','paused','camp','reward','route','dead','won']){g.phase=phase;const before=JSON.stringify(g);assert.equal(E.nudgeDie(g,2,1),false);assert.equal(JSON.stringify(g),before);}
});
test('hand suggestions are pure, bounded, use real scoring and never recommend banned combos',()=>{
 const g=ready();g.relics=['pillow','echo'];g.kept.fill(true);g.dice=[2,3,4,5,5];g.enemyHp=2000;const before=JSON.stringify(g),suggestions=E.nudgeSuggestions(g);assert.equal(JSON.stringify(g),before);assert.ok(suggestions.length>0&&suggestions.length<=2);assert.ok(suggestions.some(s=>s.id==='straight'));for(const s of suggestions){const clone=structuredClone(g);assert.ok(E.nudgeDie(clone,s.index,s.delta));const actual=E.evaluate(clone,s.id);assert.equal(actual.damage,s.damage);assert.equal(actual.guard,s.guard);}g.foe=E.makeFoe(5,3);g.enemyHp=g.foe.maxHp;g.lastPattern='straight';assert.ok(E.nudgeSuggestions(g).every(s=>s.id!=='straight'));g.nudges=0;assert.deepEqual(E.nudgeSuggestions(g),[]);
});
test('edits do not refill each turn, do refill on a new encounter, and restarts reset all usage',()=>{
 const g=ready();g.enemyHp=2000;g.dice=[2,2,3,4,5];E.nudgeDie(g,0,1);E.attack(g,'free');settle(g);assert.equal(g.nudges,1);g.enemyHp=1;E.attack(g,'free');settle(g);E.camp(g,'train','pair');assert.ok(E.travelFromCamp(g,'safe'));assert.equal(g.nudges,2);assert.equal(g.nudgesUsed,1);assert.equal(E.createGame(56).nudgesUsed,0);
});
test('camp travel is atomic and valid only after spending activities, without an extra confirm phase',()=>{
 const g=ready();g.enemyHp=1;E.attack(g,'free');settle(g);const before=JSON.stringify(g);assert.equal(E.travelFromCamp(g,'safe'),false);assert.equal(JSON.stringify(g),before);E.camp(g,'train','pair');const after=JSON.stringify(g);assert.equal(E.travelFromCamp(g,'bad'),false);assert.equal(JSON.stringify(g),after);assert.ok(E.travelFromCamp(g,'safe'));assert.equal(g.depth,1);assert.equal(g.phase,'rolling');assert.deepEqual(g.history[0].camp,['짝꿍 Lv1']);
});
test('boss enrage is meaningful but cannot retroactively increase a committed counter',()=>{
 const g=ready();g.foe=E.makeFoe(5,3);g.stage=3;g.depth=5;g.enemyHp=g.foe.maxHp*.5+10;g.dice=[1,2,3,4,6];const intent=E.enemyIntent(g);assert.equal(intent.enraged,false);assert.ok(E.attack(g,'free'));const expected=E.counterPreview(g,g.pending.result).loss;for(let i=0;i<120&&!g.pending.applied;i++)E.tick(g,1/120);assert.ok(g.pending.applied);assert.equal(E.enemyIntent(g).enraged,true);assert.equal(E.counterPreview(g,g.pending.result).loss,expected);settle(g);assert.equal(g.hp,48-expected);assert.equal(g.lastCounter.raw,intent.attack);assert.equal(E.enemyIntent(g).attack,21);assert.equal(E.enemyIntent(g).exposed,true);
});
test('synergy hints describe existing mechanics, do not create hidden bonuses or mutate state',()=>{
 const g=ready();g.relics=['echo'];const before=JSON.stringify(g);assert.equal(E.synergyHints(g).length,0);assert.ok(E.synergyHints(g,'weather').some(t=>t.includes('번개')));assert.equal(JSON.stringify(g),before);g.relics.push('weather','bell');const plain=E.evaluate(g,'free');assert.equal(E.synergyHints(g).length,2);assert.deepEqual(E.evaluate(g,'free'),plain);
});
test('near-miss hints disappear when a legal lethal combo is already ready',()=>{
 const g=ready();g.dice=[2,3,4,5,5];assert.ok(E.nudgeSuggestions(g).length);E.nudgeDie(g,4,1);assert.ok(E.evaluate(g,'straight').damage>=g.enemyHp);assert.deepEqual(E.nudgeSuggestions(g),[]);
});
