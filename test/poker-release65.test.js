import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../poker-engine.js';
import {validRun,encodeRun,decodeRun,createProfile,readProfile} from '../poker-profile.js';
import {ENCOUNTERS,relicImpact,trainingImpact,buildAdvice,tacticalView} from '../poker-release-ui.js';
import {createCardAudio,createMotionPreference} from '../poker-audio.js';
const game=()=>{const g=E.createGame('61');E.chooseStarter(g,'echo');return g;};
const settle=g=>{for(let i=0;g.phase==='resolve'&&i<120;i++)E.tick(g,1/30);};
const copy=g=>JSON.parse(JSON.stringify(g));
const storage=()=>{const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
test('valid snapshots roundtrip draft, selection, resolve before/after hit, paused and edited shop',()=>{
 const draft=E.createGame('61');assert(validRun(draft));
 const g=game();E.selectAllCards(g);assert(validRun(g));assert.deepEqual(decodeRun(encodeRun(g,'a')).state,g);E.discard(g);E.attack(g);
 assert(validRun(g));let resumed=decodeRun(encodeRun(g,'a')).state;settle(resumed);const expected=copy(g);settle(expected);assert.deepEqual(resumed,expected);
 while(!g.pending.applied)E.tick(g,1/30);assert(validRun(g));resumed=decodeRun(encodeRun(g,'b')).state;const hp=resumed.enemyHp;settle(resumed);assert.equal(resumed.enemyHp,hp,'applied hit never applied twice');
 E.pause(g);assert(validRun(g));resumed=decodeRun(encodeRun(g,'c')).state;const frozen=copy(resumed);E.tick(resumed,1);assert.deepEqual(resumed,frozen);E.resume(resumed);settle(resumed);assert.equal(resumed.enemyHp,hp);
 const shop=game();E.attack(shop);settle(shop);assert.equal(shop.phase,'shop');assert(validRun(shop));E.editDeck(shop,'remove',shop.hand[0].id);assert(validRun(shop),'shop can hold a spent hand containing removed IDs');assert.deepEqual(decodeRun(encodeRun(shop,'shop')).state,shop);
});
test('corrupt, foreign, incomplete and oversized save data never loads',()=>{
 const g=game();for(const change of [h=>h.deck.push(h.deck[0]),h=>h.hand[0].id='fake',h=>h.drawPile.push(h.drawPile[0]),h=>h.gold=-1,h=>h.hp=0,h=>h.hands=99,h=>h.relics=['<script>'],h=>h.selected=['not-a-card'],h=>h.training.pair=999,h=>h.foe=null,h=>h.phase='unknown',h=>h.nextCard=1]){const bad=copy(g);change(bad);assert.equal(validRun(bad),false);assert.equal(decodeRun(JSON.stringify({version:1,id:'a',state:bad})),null);}
 for(const raw of ['',null,'{bad','x'.repeat(100001),JSON.stringify({version:999,id:'a',state:g})])assert.equal(decodeRun(raw),null);
 E.attack(g);const bad=copy(g);bad.pending.result.steps[0].label='<img onerror=alert(1)>';assert.equal(validRun(bad),false);
});
test('automatic checkpoints survive reload, skip animation clocks and preserve settings/history without stat bonuses',()=>{
 const s=storage(),profile=createProfile(s),g=game();profile.begin();profile.checkpoint(g);const saved=[...s.data.values()];E.tick(g,.02);profile.checkpoint(g);assert.deepEqual([...s.data.values()],saved,'no per-frame disk writes');
 profile.preference('volume',.3);profile.preference('motion','reduce');profile.preference('coach',false);
 const reloaded=createProfile(s);assert.equal(reloaded.preferences.volume,.3);assert.equal(reloaded.preferences.motion,'reduce');assert.equal(reloaded.preferences.coach,false);assert.deepEqual(reloaded.resume().hand,g.hand);
 g.phase='dead';g.hp=0;profile.checkpoint(g);profile.checkpoint(g);assert.equal(profile.records.length,1);assert.equal(profile.saved,null);
 const again=createProfile(s);assert.equal(again.records.length,1);assert.equal(again.records[0].seed,g.seed);assert.equal(again.saved,null);assert.deepEqual(E.resourceLimits(E.createGame(g.seed)),{hands:4,discards:3});
});
test('blocked storage and invalid settings degrade without throwing or touching game state',()=>{
 const p=createProfile({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}}),g=game(),before=copy(g);assert.equal(p.available,false);p.begin();assert.doesNotThrow(()=>p.checkpoint(g));assert.deepEqual(g,before);assert.equal(p.preference('volume',2),false);assert.equal(p.preference('motion','flash'),false);assert.deepEqual(readProfile('not json').preferences,{volume:.55,motion:'auto',coach:true});
});
test('shop impact previews use exact engine fold and next-fight caps without spending, charging or RNG',()=>{
 const g=game();E.attack(g);settle(g);g.relics=['pillow','rubber','extraDiscard','echo'];const before=copy(g),p=relicImpact(g,'extraHand','extraDiscard');assert(p);assert.deepEqual(p.limits.after,{hands:5,discards:3});assert.equal(relicImpact(g,'extraHand'),null);assert(trainingImpact(g,'twoPair'));assert.equal(trainingImpact(g,'unknown'),null);assert.deepEqual(g,before);
 g.relics=['echo'];const value=relicImpact(g,'rubber');assert(value.after>value.before);assert.match(buildAdvice(g).name,/같은数字|같은 숫자/);assert.deepEqual(g.drawState,before.drawState);
});
test('tactical forecast distinguishes lethal, fatal counter, final hand and committed nonlethal impact',()=>{
 const g=game(),r=E.bestHand(g);assert(tacticalView(g,r).lethal);g.enemyHp=10000;g.hp=1;g.relics=[];const normal=E.bestHand(g);g.turn=3;assert(tacticalView(g,normal).danger);g.hp=48;g.hands=1;assert.match(tacticalView(g,normal).message,/패배/);
 g.hands=4;E.attack(g);while(!g.pending.applied)E.tick(g,1/30);assert.equal(tacticalView(g,g.pending.result).lethal,false);assert.equal(tacticalView(g,g.pending.result).title,'공격 확정');
});
test('documented encounter data stays aligned with actual six-room campaign',()=>{
 const g=game();for(let i=0;i<6;i++){assert.equal(g.foe.maxHp,ENCOUNTERS[i].hp);assert.equal(g.foe.enemy,ENCOUNTERS[i].enemy);assert.equal(g.foe.name,ENCOUNTERS[i].name);if(i<5){g.phase='shop';assert(E.travel(g));}}
});
test('audio volume and live reduced-motion preferences work without WebAudio availability',()=>{
 const audio=createCardAudio(.5);assert.equal(audio.setVolume(2),false);assert.equal(audio.toggle(),false);assert.equal(audio.volume,0);assert.equal(audio.toggle(),true);assert.equal(audio.volume,.5);assert.doesNotThrow(()=>audio.play(['ui']));
 let systemListener,events=0;const media={matches:false,addEventListener(type,fn){systemListener=fn;}},body={dataset:{}},motion=createMotionPreference(media,'auto',body);motion.addEventListener('change',()=>events++);assert.equal(motion.matches,false);motion.setMode('reduce');assert.equal(motion.matches,true);assert.equal(body.dataset.motion,'reduce');motion.setMode('auto');assert.equal(motion.matches,false);media.matches=true;systemListener();assert.equal(motion.matches,true);assert.equal(events,3);
});
test('optional deep mode adds real pressure only for successful discards and resets per turn/fight',()=>{
 const g=E.createGame('61','deep');E.chooseStarter(g,'echo');assert.equal(g.foe.maxHp,216);assert.equal(E.enemyIntent(g).attack,7);const before=copy(g);assert(!E.discard(g));assert.deepEqual(g,before);E.selectAllCards(g);E.discard(g);assert.equal(g.pressure,1);assert.equal(g.discards,2);assert.equal(E.enemyIntent(g).attack,8);assert.equal(E.counterPreview(g,E.bestHand(g)).loss,5);assert(validRun(g));
 E.attack(g);assert.equal(g.pending.returnDamage,8);assert.equal(g.pending.result.damage,176);const committed=decodeRun(encodeRun(g,'deep')).state;settle(committed);assert.equal(committed.pressure,0);assert.equal(committed.hp,43);assert.equal(committed.hands,3);assert.equal(committed.discards,3);assert.equal(E.enemyIntent(committed).attack,5);assert(validRun(committed));
 g.phase='shop';g.pending=null;g.action=null;assert(E.travel(g));assert.equal(g.pressure,0);assert.equal(g.foe.maxHp,476);g.depth=1;assert.equal(E.encounterPreview(2,false,'deep').maxHp,941);const guard={...g,foe:E.encounterPreview(2,false,'deep'),turn:1,armorBroken:false};assert.equal(E.enemyIntent(guard).armor,50);guard.armorBroken=true;assert.equal(E.enemyIntent(guard).armor,0);
 const classic=game();E.selectAllCards(classic);E.discard(classic);assert.equal(classic.pressure,0);assert.equal(E.enemyIntent(classic).attack,5);assert.equal(E.encounterPreview(6),null);
});
test('deep boss first-hit ward caps oversized damage, preview is pure and real impact spends once',()=>{
 const g=E.createGame('ward','deep');E.chooseStarter(g,'ladder');g.depth=4;g.phase='shop';E.travel(g);g.hand=[10,11,12,13,14,2,4,7].map((rank,i)=>({id:'c'+i,rank,suit:'hearts'}));g.training.royal=8;const before=copy(g),r=E.bestHand(g);assert.equal(r.damage,2990);assert(r.steps.some(s=>s.source==='ward'));assert.deepEqual(g,before);E.attack(g);assert.equal(g.wardUsed,false);while(!g.pending.applied)E.tick(g,1/30);assert.equal(g.wardUsed,true);assert.equal(g.enemyHp,2990);assert.equal(g.pending.result.damage,2990);const hp=g.enemyHp;E.pause(g);E.tick(g,1);assert.equal(g.enemyHp,hp);E.resume(g);settle(g);assert.equal(g.enemyHp,hp);assert.equal(g.wardUsed,true);g.lastPattern=null;assert(!E.bestHand(g).steps.some(s=>s.source==='ward'));
});
