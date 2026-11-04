import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TRICKCAL_ARTIFACTS} from '../trickcal-artifacts.js';
import {createGame,chooseRelic,evaluate,attack,tick,counterPreview,RELICS,pass} from '../dice-engine.js';
const settle=g=>{for(let n=0;n<300&&['rolling','resolve'].includes(g.phase);n++)tick(g,1/120);};
function fixture(relics){const g=createGame(53);chooseRelic(g,g.choices[0]);settle(g);Object.assign(g,{relics,hp:40,shield:0,enemyHp:1000,dice:[1,1,1,4,5],rerolls:0});return g;}
test('eight unchanged original icons have pinned hashes and distinct real-vs-fan identities',()=>{
 const sources=JSON.parse(readFileSync(new URL('../assets/trickcal-artifacts53/sources.json',import.meta.url)));
 assert.equal(sources.items.length,8);assert.equal(Object.keys(TRICKCAL_ARTIFACTS).length,8);assert.notEqual(RELICS.pillow.name,RELICS.komi.name);
 for(const item of sources.items){const bytes=readFileSync(new URL('../assets/trickcal-artifacts53/'+item.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.ok(item.url.includes(sources.commit));assert.ok(RELICS[item.id].original);}
});
test('each draft offers two sourced artifacts and one fan relic without duplicates',()=>{
 for(let seed=0;seed<100;seed++){const g=createGame(seed);assert.equal(g.choices.length,3);assert.equal(new Set(g.choices).size,3);assert.equal(g.choices.filter(id=>RELICS[id].sourceId).length,2);}
});
test('weather charge carries between attacks; ribbon retriggers are finite and previews read-only',()=>{
 const g=fixture(['weather','echo']);g.strikes=1;const before=JSON.stringify(g),r=evaluate(g,'kind');assert.equal(JSON.stringify(g),before);assert.equal(r.strikes,1);assert.equal(r.steps.filter(s=>s.source==='weather').length,2);assert.equal(r.chips,60);
 attack(g,'kind');settle(g);assert.equal(g.strikes,1);const once=g.enemyHp;settle(g);assert.equal(g.enemyHp,once);
 g.dice=[1,2,3,4,5];attack(g,'free');settle(g);assert.equal(g.strikes,0);
});
test('yellow card consumes full rage once on enhanced attack only, gains rage on HP counter',()=>{
 const g=fixture(['yellow']);g.rage=3;const before=JSON.stringify(g),r=evaluate(g,'kind');assert.equal(JSON.stringify(g),before);assert.ok(Math.abs(r.mult-8.1)<1e-9);assert.equal(evaluate(g,'free').rageSpent,false);
 attack(g,'kind');settle(g);assert.equal(g.rage,1);assert.equal(g.lastCounter.loss,6);
});
test('belt absorbs first and does not charge HP-damage relics; per-room refill is once',()=>{
 const g=fixture(['belt','yellow','mace']);g.shield=8;assert.deepEqual(counterPreview(g),{raw:6,stun:false,blocked:6,loss:0});attack(g,'free');settle(g);assert.equal(g.shield,2);assert.equal(g.hp,40);assert.equal(g.rage,0);assert.equal(g.maceHits,0);
 attack(g,'free');settle(g);assert.equal(g.shield,0);assert.equal(g.hp,36);assert.equal(g.rage,1);assert.equal(g.maceHits,1);
 g.enemyHp=1;attack(g,'free');settle(g);chooseRelic(g,g.choices[0]);assert.equal(g.shield,8);assert.equal(chooseRelic(g,g.relics.at(-1)),false);assert.equal(g.shield,8);
});
test('Komi recovers once per fight at <=30%, never revives a dead player',()=>{
 const g=fixture(['komi']);g.hp=18;attack(g,'free');settle(g);assert.equal(g.hp,20);assert.equal(g.komiUsed,true);g.hp=13;attack(g,'free');settle(g);assert.equal(g.hp,7);assert.equal(g.lastCounter.heal,0);
 const dead=fixture(['komi']);dead.hp=6;attack(dead,'free');settle(dead);assert.equal(dead.phase,'dead');assert.equal(dead.hp,0);assert.equal(dead.komiUsed,false);
});
test('lifesteal uses actual HP damage, caps at four, clamps HP and excludes enhanced attacks',()=>{
 const g=fixture(['lucky']);g.hp=30;g.enemyHp=20;assert.equal(evaluate(g,'free').heal,1);assert.equal(evaluate(g,'kind').heal,0);attack(g,'free');settle(g);assert.equal(g.hp,31);
 const h=fixture(['lucky','rubber','bell']);h.hp=39;h.rerolls=2;assert.equal(evaluate(h,'free').heal,1);h.hp=10;h.dice=[6,6,6,6,6];assert.equal(evaluate(h,'free').heal,4);
});
test('scythe executes normal enemies below threshold after attack, never bosses or enhanced attacks',()=>{
 const g=fixture(['scythe']);g.enemyHp=55;assert.equal(evaluate(g,'free').damage,55);assert.equal(evaluate(g,'free').execute,true);assert.equal(evaluate(g,'kind').execute,false);g.stage=3;assert.equal(evaluate(g,'free').execute,false);g.stage=0;g.enemyHp=100;assert.equal(evaluate(g,'free').execute,false);
});
test('rust depends on actual health and mace consumes only on normal attacks, cancels one counter',()=>{
 const g=fixture(['mace','rust']);g.maceHits=3;g.hp=30;assert.ok(Math.abs(evaluate(g,'free').mult-1.8)<1e-9);assert.equal(evaluate(g,'kind').stun,false);assert.equal(counterPreview(g,evaluate(g,'free')).loss,0);
 attack(g,'free');settle(g);assert.equal(g.hp,30);assert.equal(g.maceHits,0);assert.equal(g.lastCounter.stun,true);attack(g,'free');settle(g);assert.equal(g.hp,24);assert.equal(g.maceHits,1);
});
test('fresh runs reset charges, shield and once-per-fight effects; pass still pays counter',()=>{
 const g=createGame(53);assert.deepEqual([g.shield,g.rage,g.strikes,g.maceHits,g.komiUsed],[0,0,0,0,false]);Object.assign(g,{phase:'pick',stage:3,dice:[1,2,3,4,6],rerolls:0,lastPattern:'free',relics:['belt'],shield:8});assert.ok(pass(g));assert.equal(g.hp,36);assert.equal(g.shield,0);
});
test('decimal multipliers cannot lose one damage to binary rounding at exact integers',()=>{
 const g=fixture(['rust','mace']);g.hp=30;g.maceHits=3;g.dice=[1,1,1,5,5];let r=evaluate(g,'free');assert.equal(r.chips,30);assert.equal(r.damage,54);assert.equal(r.steps.at(-1).total,54);g.dice=[5,5,5,4,4];r=evaluate(g,'free');assert.equal(r.chips,50);assert.equal(r.damage,90);
});
