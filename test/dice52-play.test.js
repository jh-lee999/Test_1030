import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,chooseRelic} from '../dice-engine.js';
import {bestMove,play,settle} from '../tools/playtest-dice52.mjs';
test('sampled dice policy is read-only and completes a genuine four-encounter resource run',()=>{
 const g=createGame(52);chooseRelic(g,g.choices[0]);settle(g);const before=JSON.stringify(g);bestMove(g);assert.equal(JSON.stringify(g),before);
 const result=play('52');assert.equal(result.phase,'won');assert.ok(result.hp>0);assert.equal(result.relics.length,4);assert.ok(result.trace.some(t=>t.stage===4));assert.ok(new Set(result.trace.map(t=>t.pattern)).size>=2);
});
