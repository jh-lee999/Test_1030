import test from 'node:test';
import assert from 'node:assert/strict';
import {strongestPattern,attackSelectionKey} from '../dice-selection.js';
import * as E from '../dice-run-engine.js';
const results=g=>Object.keys(E.PATTERNS).map(id=>E.evaluate(g,id));
test('choose actual damage, not pattern rarity, array order or the previous valid free attack',()=>{
 assert.equal(strongestPattern([{id:'free',damage:60},{id:'pair',damage:96}]).id,'pair');assert.equal(strongestPattern([{id:'kind',damage:100},{id:'pair',damage:140},{id:'straight',damage:120}]).id,'pair');
 assert.equal(strongestPattern([null,{id:'kind',damage:999,blocked:true},{id:'free',damage:20},{id:'bad',damage:NaN}]).id,'free');assert.equal(strongestPattern([null,{damage:999,blocked:true}]),null);
});
test('exact damage ties prefer guard, then stable existing order',()=>{
 assert.equal(strongestPattern([{id:'free',damage:64,guard:0},{id:'pair',damage:64,guard:6}]).id,'pair');assert.equal(strongestPattern([{id:'pair',damage:64,guard:6},{id:'kind',damage:64,guard:6}]).id,'pair');
});
test('selection signature changes for new dice, rerolls and scoring but not time, holds or menus',()=>{
 const g=E.createGame(57),r=results(g),before=JSON.stringify(g),key=attackSelectionKey(g,r);strongestPattern(r);assert.equal(JSON.stringify(g),before);
 const cosmetic=structuredClone(g);cosmetic.time+=10;cosmetic.held[0]=true;cosmetic.phase='paused';assert.equal(attackSelectionKey(cosmetic,r),key);
 for(const edit of [s=>s.rollSerial++,s=>s.turn++,s=>s.depth++,s=>s.dice[0]=6,s=>s.kept[0]=true,s=>s.rerolls--]){const s=structuredClone(g);edit(s);assert.notEqual(attackSelectionKey(s,r),key);}
 const changed=structuredClone(r);changed[0].damage++;assert.notEqual(attackSelectionKey(g,changed),key);
});
test('real relic/training/armor/boss rules drive the choice without changing game state',()=>{
 const g=E.createGame(57);Object.assign(g,{dice:[6,6,6,5,1],relics:[],phase:'pick'});assert.equal(strongestPattern(results(g)).id,'kind');
 g.foe=E.makeFoe(5,3);g.enemyHp=g.foe.maxHp;g.stage=3;g.lastPattern='kind';const before=JSON.stringify(g);const r=strongestPattern(results(g));assert.notEqual(r.id,'kind');assert.equal(JSON.stringify(g),before);
});
