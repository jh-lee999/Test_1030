import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,patternMatch,evaluate,chooseRelic,toggleHold,reroll,attack,tick,pause,resume,canPass,pass,incoming,RELICS,ENCOUNTERS} from '../dice-engine.js';
import {HERO,ENEMY_SCALE} from '../dice-renderer.js';
import {BUTTER_ORIGINAL} from '../butter-original-motion.js';
import {STAGE_ART} from '../platformer-art.js';
const settle=g=>{for(let i=0;i<300&&['rolling','resolve'].includes(g.phase);i++)tick(g,1/120);};
function ready(seed=52){const g=createGame(seed);chooseRelic(g,g.choices[0]);settle(g);return g;}
test('seed replay, three unique offers, fourteen bounded non-duplicate relics and isolated RNG streams',()=>{
 const a=ready('52'),b=ready('52');assert.deepEqual(a,b);assert.equal(Object.keys(RELICS).length,14);assert.equal(ENCOUNTERS.length,4);assert.equal(new Set(createGame(52).choices).size,3);
 const control=structuredClone(a),before=JSON.stringify(a);for(let i=0;i<20;i++)for(const id of ['free','pair','kind','straight'])evaluate(a,id);assert.equal(JSON.stringify(a),before);
 reroll(a);settle(a);assert.equal(a.lootState,control.lootState);assert.notEqual(a.rollState,control.rollState);
});
test('four scoring patterns, fallback, correct scoring indices, four/five-kind and invalid dice',()=>{
 assert.deepEqual(patternMatch([1,2,3,4,6],'free').indices,[0,1,2,3,4]);assert.equal(patternMatch([1,2,3,4,6],'straight'),null);
 assert.equal(patternMatch([2,3,4,5,6],'straight').mult,4);assert.equal(patternMatch([6,6,2,2,1],'pair').indices.join(','),'0,1');
 assert.equal(patternMatch([3,3,3,4,4],'kind').mult,3);assert.equal(patternMatch([3,3,3,3,4],'kind').mult,5);assert.equal(patternMatch([3,3,3,3,3],'kind').mult,9);
 assert.equal(patternMatch([0,1,2,3,4],'free'),null);assert.equal(patternMatch([1,2,3,4],'free'),null);assert.equal(patternMatch([1,2,3,4,5],'invalid'),null);
});
test('held dice are preserved, only rerolled dice consume RNG, exactly two rerolls, no all-held exploit',()=>{
 const g=ready();for(let i=0;i<5;i++)toggleHold(g,i);const before=JSON.stringify(g);assert.equal(reroll(g),false);assert.equal(JSON.stringify(g),before);
 toggleHold(g,4);const held=g.dice.slice(0,4);assert.ok(reroll(g));assert.equal(g.phase,'rolling');assert.equal(toggleHold(g,0),false);settle(g);
 assert.deepEqual(g.dice.slice(0,4),held);assert.deepEqual(g.kept,[true,true,true,true,false]);assert.equal(g.rerolls,1);reroll(g);settle(g);assert.equal(g.rerolls,0);assert.equal(reroll(g),false);
});
test('ribbon retriggers candy and kept pillow, with a finite exact calculation and final multiplication',()=>{
 const g=ready();g.dice=[1,1,1,4,5];g.relics=['echo','candy','pillow','empty','rubber','bell'];g.kept=[true,true,true,false,false];g.rerolls=0;
 const r=evaluate(g,'kind');assert.equal(r.chips,72);assert.equal(r.mult,12);assert.equal(r.damage,864);
 assert.equal(r.steps.filter(s=>s.source==='echo').length,3);assert.equal(r.steps.filter(s=>s.source==='candy').length,6);assert.equal(r.steps.filter(s=>s.source==='pillow').length,6);
 assert.equal(r.steps.at(-1).source,'rubber');assert.ok(r.steps.length<40);
});
test('freshly clicking hold earns no pillow bonus; unused rerolls and spent rerolls are competing bonuses',()=>{
 const g=ready();g.relics=['pillow'];g.dice=[4,4,4,2,6];const base=evaluate(g,'kind');for(let i=0;i<5;i++)toggleHold(g,i);assert.equal(evaluate(g,'kind').damage,base.damage);
 g.relics=['bell','empty'];g.rerolls=2;const early=evaluate(g,'kind');assert.equal(early.chips,60);assert.equal(early.mult,3);g.rerolls=0;const late=evaluate(g,'kind');assert.equal(late.chips,36);assert.equal(late.mult,5);
});
test('a committed attack applies once at impact, locks inputs, then one telegraphed counter',()=>{
 const g=ready();g.relics=[];g.dice=[1,1,2,3,4];g.enemyHp=1000;const before=g.hp,r=evaluate(g,'free');assert.ok(attack(g,'free'));assert.equal(attack(g,'free'),false);assert.equal(reroll(g),false);assert.equal(toggleHold(g,0),false);
 const p=g.pending;tick(g,1/120);assert.equal(g.enemyHp,1000);settle(g);assert.equal(g.enemyHp,1000-r.damage);assert.equal(g.hp,before-6);assert.equal(g.attacks,1);assert.equal(g.turn,2);assert.equal(p.applied,true);
});
test('pause freezes dice and attack clocks, invalid/double relic selection is rejected',()=>{
 const g=createGame(52);assert.equal(chooseRelic(g,'invalid'),false);chooseRelic(g,g.choices[0]);assert.equal(chooseRelic(g,'echo'),false);pause(g);const before=JSON.stringify(g);tick(g,1);assert.equal(JSON.stringify(g),before);resume(g);settle(g);attack(g,'free');pause(g);const clock=g.pending.clock;tick(g,1);assert.equal(g.pending.clock,clock);resume(g);settle(g);
});
test('boss repeat ban, mandatory safe fallback through pass, guard reduction and visible escalating counter',()=>{
 const g=ready();g.stage=3;g.dice=[1,2,3,4,6];g.lastPattern='free';g.rerolls=0;assert.equal(evaluate(g,'free').blocked,true);assert.equal(attack(g,'free'),false);assert.equal(canPass(g),true);const hp=g.hp;pass(g);assert.equal(g.hp,hp-12);assert.equal(g.lastPattern,null);settle(g);assert.equal(evaluate(g,'free').blocked,false);
 g.stage=2;g.turn=1;g.relics=[];g.dice=[1,2,3,4,5];assert.equal(evaluate(g,'straight').raw-evaluate(g,'straight').damage,30);g.turn=2;assert.equal(evaluate(g,'straight').raw,evaluate(g,'straight').damage);
 g.stage=1;g.turn=3;assert.equal(incoming(g),11);g.turn=4;assert.equal(incoming(g),13);
});
test('clears award a new relic and heal only once; only fourth encounter wins; replay resets all growth',()=>{
 const g=ready();for(let stage=0;stage<4;stage++){
  assert.equal(g.stage,stage);g.enemyHp=1;g.hp=20;assert.ok(attack(g,'free'));settle(g);
  if(stage===3){assert.equal(g.phase,'won');break;}
  assert.equal(g.phase,'reward');assert.equal(g.hp,20);const id=g.choices[0];assert.ok(!g.relics.includes(id));assert.ok(chooseRelic(g,id));assert.equal(chooseRelic(g,id),false);assert.equal(g.hp,32);settle(g);
 }
 assert.equal(g.relics.length,4);assert.deepEqual(createGame(52).relics,[]);assert.equal(createGame(52).attacks,0);
});
test('complete Butter cells share one scale/anchor; all used monster cells fit the scene',()=>{
 const s=HERO.size/112;for(const key of ['idle','shoot','high']){const c=BUTTER_ORIGINAL.clips[key],x=HERO.x-c.origin[0]*s,y=HERO.y+HERO.size*.28-c.origin[1]*s;assert.ok(x>=0&&y>=0&&x+c.width*s<=1000&&y+c.height*s<=300,key);}
 for(const [type,scale]of Object.entries(ENEMY_SCALE))for(const key of ['idle','attack','die']){const c=STAGE_ART.monsters[type].clips[key],x=810-c.origin[0]*scale,y=228-c.origin[1]*scale;assert.ok(x>=0&&y>=0&&x+c.width*scale<=1000&&y+c.height*scale<=300,type+':'+key);}
});
