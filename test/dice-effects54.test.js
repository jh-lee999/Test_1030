import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGame,chooseRelic,attack,evaluate,tick,pause} from '../dice-engine.js';
import {butterMuzzleOffset} from '../butter-original-motion.js';
import {sampleDiceEffects,shotGeometry,flightPoint,EFFECT_REGIONS} from '../dice-effects.js';
function fixture(high=false){const g=createGame(54);chooseRelic(g,g.choices[0]);for(let i=0;i<40;i++)tick(g,1/120);g.relics=[];g.dice=high?[6,6,6,6,6]:[1,2,3,4,6];g.enemyHp=2000;attack(g,high?'kind':'free');return g;}
test('effect atlas contains a verified original stone and seven independently credited CC0 particles',()=>{
 const meta=JSON.parse(readFileSync(new URL('../assets/dice-fx54/atlas.json',import.meta.url))),bytes=readFileSync(new URL('../assets/dice-fx54/particles.png',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.equal(meta.sources.length,8);assert.equal(meta.sources.filter(s=>s.license==='CC0-1.0').length,7);assert.deepEqual(meta.sources[0].region,[529,63,43,43]);
 for(const [key,rect]of Object.entries(EFFECT_REGIONS)){const r=meta.regions[key];assert.deepEqual(rect,[r.x,r.y,r.width,r.height]);assert.ok(r.x>=8&&r.y>=8&&r.x+r.width<=meta.width-8&&r.y+r.height<=meta.height-8);}
});
test('normal and high shots start at the original release marker and reach the target exactly on the existing impact clock',()=>{
 for(const high of [false,true]){const g=fixture(high),q=shotGeometry(g),m=butterMuzzleOffset({size:80,action:{...g.action,time:q.release}});assert.deepEqual(q.from,{x:190+m.x,y:220+m.y});assert.ok(Math.abs(q.hitAt-q.release-.3)<1e-9);assert.deepEqual(flightPoint(q,0).x,q.from.x);assert.equal(flightPoint(q,1).x,q.to.x);assert.ok(Math.abs(flightPoint(q,1).y-q.to.y)<1e-8);
  g.pending.clock=q.release-.001;assert.equal(sampleDiceEffects(g).length,0);g.pending.clock=q.release+.15;const rock=sampleDiceEffects(g).find(s=>s.id==='rock');assert.equal(rock.width,high?48:26);assert.ok(rock.x>q.from.x&&rock.x<q.to.x);
 }
});
test('time sampling and drawing descriptions are deterministic/read-only and particles remain bounded',()=>{
 for(const high of [false,true]){const g=fixture(high);g.pending.result.rageSpent=true;g.pending.result.stun=true;g.pending.result.steps.push({source:'weather'});
  for(let i=0;i<200;i++){g.pending.clock=i/200*g.pending.endAt;g.pending.applied=g.pending.clock>=g.pending.hitAt;const before=JSON.stringify(g),a=sampleDiceEffects(g);assert.deepEqual(a,sampleDiceEffects(g));assert.equal(JSON.stringify(g),before);assert.ok(a.length<=32);
   for(const s of a){assert.ok(EFFECT_REGIONS[s.id]);assert.ok([s.x,s.y,s.width,s.height,s.alpha,s.angle].every(Number.isFinite));assert.ok(s.alpha>0&&s.alpha<=1);assert.ok(s.x-s.width/2>=0&&s.x+s.width/2<=1000);assert.ok(s.y-s.height/2>=0&&s.y+s.height/2<=300,s.id);}
  }
 }
});
test('weather bolts require an actual scoring proc; ownership alone cannot claim an extra hit',()=>{
 const g=fixture();g.relics=['weather'];g.pending.clock=g.pending.hitAt+.1;g.pending.applied=true;assert.equal(sampleDiceEffects(g).some(s=>s.id==='bolt'),false);g.pending.result.steps.push({source:'weather'});assert.equal(sampleDiceEffects(g).some(s=>s.id==='bolt'),true);
});
test('pause freezes sampled effects; reduced motion has no flying shot, flash, star spray or lightning',()=>{
 const g=fixture();g.pending.clock=shotGeometry(g).release+.15;pause(g);const before=sampleDiceEffects(g);for(let i=0;i<30;i++)tick(g,1/30);assert.deepEqual(sampleDiceEffects(g),before);assert.deepEqual(sampleDiceEffects(g,{reduced:true}),[]);g.pending.applied=true;g.pending.clock=g.pending.hitAt+.1;assert.deepEqual(sampleDiceEffects(g,{reduced:true}).map(s=>s.id),['ring']);g.phase='reward';assert.deepEqual(sampleDiceEffects(g),[]);
});
test('effects do not change any score, charges, HP, RNG or once-only impact settlement',()=>{
 const a=fixture(true),b=structuredClone(a);for(let i=0;i<200;i++){sampleDiceEffects(a);evaluate(a,'free');tick(a,1/120);tick(b,1/120);}assert.deepEqual(a,b);
});
