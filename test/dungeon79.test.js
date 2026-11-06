import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../dungeon79-engine.js';
import * as S from '../dungeon79-save.js';
import * as Old from '../dungeon77-save.js';
import {createGame as oldGame} from '../dungeon77-engine.js';
import {hash,random,reachable,links} from '../dungeon76-world.js';
import {LOOT_RULES,availableArtifacts,dropArtifact,initContainers,addGoldenChest,rollArtifact} from '../dungeon79-loot.js';
import {eligibleItems,rarityOdds} from '../dungeon77-economy.js';
import {ITEMS} from '../dungeon77-content.js';
import {itemPeek} from '../dungeon79-items-ui.js';
import {selectionUI,eventUI} from '../dungeon79-ui.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url));
function enter(g,type){const r=g.rooms.find(r=>r.type===type),from=g.rooms.find(q=>links(g,q).some(l=>l.to===r.id));g.room=from.id;from.cleared=true;g.transition=0;g.phase='playing';g.keys=20;if(['secret','archive'].includes(type))r.unlocked=true;assert(E.enterRoom(g,links(g).find(l=>l.to===r.id).dir));return r;}
function memory(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),m};}
function rollSeed(want){for(let i=0;i<100000;i++){const v=random({rng:i});if(want(v))return i;}throw Error('seed not found');}
const low=rollSeed(x=>x<.03),medium=rollSeed(x=>x>=.03&&x<.3),miss=rollSeed(x=>x>=.55);

test('79 archive and root retain78 hints and whole source art',()=>{
 assert.equal(createHash('sha256').update(read('dungeon78.html')).digest('hex'),'581cdb31d9fed56dfc36501c220e55d409d2ce00d8c22db845a21ab719bf20cf');
 assert.match(read('index.html').toString(),/dungeon79.js\?v=79/);assert.match(read('dungeon79-renderer.js').toString(),/from '.\/dungeon78-hints.js'/);
});
test('every seed and unlocked loadout starts without artifacts, chest or hidden grant',()=>{
 const progress={bestClears:20,bestKills:100,bestFloor:3,bosses:['velvet','erpin','shady'],trial:true,secret:true,bargain:true};
 for(let i=0;i<30;i++)for(const loadout of ['random','charged','spread','scout','prism']){
  const g=E.createGame('empty79-'+i,{progress,loadout,hero:i%2?'velvet':'butter'}),r=E.current(g);assert.equal(r.pedestal,null);assert.deepEqual(r.artifacts,[]);assert.deepEqual(r.chests,[]);assert.deepEqual(g.items,[]);assert.equal(g.loadout,'random');assert(S.validRun(g));E.tick(g,.1,{y:-1});assert.deepEqual(g.items,[]);
 }
 assert(!selectionUI(S.freshProfile()).includes('loadout-select'));
});
test('gold rooms grant exactly one cached walk-over item, never a three-choice draft',()=>{
 const g=E.createGame('treasure79'),r=enter(g,'treasure'),q=r.pedestal;assert(q.item);assert.equal(q.source,'treasure');assert.equal(g.keys,19);const saved=JSON.stringify(q),rng=g.loot.rng;
 for(let i=0;i<4;i++){E.nearby(g);itemPeek(g);}assert.equal(JSON.stringify(q),saved);assert.equal(g.loot.rng,rng);
 Object.assign(g.player,{x:q.x,y:q.y});assert(E.collectArtifact(g));assert.equal(g.items.length,1);assert(!E.collectArtifact(g));assert.equal(g.choice,null);assert.equal(g.phase,'playing');assert(S.validRun(g));
});
test('secret/archive give a locked gold chest, not a guaranteed artifact',()=>{
 for(const type of ['secret','archive']){const g=E.createGame('secret79',{progress:{...S.freshProfile().progress,bosses:['erpin']},route:'wild'}),r=enter(g,type);assert.equal(r.pedestal,null);assert.equal(r.chests.length,1);assert(!r.chests[0].opened);assert.deepEqual(g.items,[]);assert(S.validRun(g));}
});
test('wooden crates roll3%, destroyed once; item lands reachable and away from player',()=>{
 const g=E.createGame('crate79'),r=enter(g,'combat'),o=r.obstacles.find(o=>o.kind==='pot');assert(o);g.rewardRng.rng=low;Object.assign(g.player,{x:o.x+o.w/2,y:o.y+o.h/2});
 assert(E.breakCrate(g,o));const q=r.artifacts[0];assert(q);assert.equal(q.source,'crate');assert(reachable(r,q,32));assert(Math.hypot(q.x-g.player.x,q.y-g.player.y)>=84);assert.equal(g.items.length,0);const rng=g.rewardRng.rng;assert(!E.breakCrate(g,o));assert.equal(g.rewardRng.rng,rng);assert.equal(r.artifacts.length,1);assert(S.validRun(g));
 Object.assign(g.player,{x:q.x,y:q.y});assert(E.collectArtifact(g));assert.equal(g.items.length,1);assert(!E.collectArtifact(g));
});
test('gold chests require explicit F, a cleared room, proximity and one actual key',()=>{
 const g=E.createGame('chest79'),r=enter(g,'secret'),c=r.chests[0];Object.assign(g.player,{x:c.x,y:c.y});g.keys=1;g.rewardRng.rng=medium;
 E.tick(g,.02);assert.equal(g.keys,1);assert(!c.opened);const rng=g.rewardRng.rng,loot=g.loot.rng;
 r.cleared=false;assert(!E.openGoldenChest(g,c.id));r.cleared=true;g.keys=0;assert(!E.interact(g));assert.equal(g.rewardRng.rng,rng);assert.equal(g.loot.rng,loot);g.keys=1;E.pause(g);assert(!E.openGoldenChest(g,c.id));E.resume(g);
 assert(E.interact(g));assert.equal(g.keys,0);assert(c.opened);assert(c.result.item);assert.equal(g.items.length,0);assert.equal(r.artifacts.length,1);assert.equal(r.artifacts[0].source,'goldChest');const snapshot=JSON.stringify(g);assert(!E.openGoldenChest(g,c.id));assert.equal(JSON.stringify(g),snapshot);assert(S.validRun(g));
});
test('gold-chest misses give3–6 coins and one supply, never an empty key sink',()=>{
 const g=E.createGame('miss79'),r=enter(g,'secret'),c=r.chests[0];Object.assign(g.player,{x:c.x,y:c.y});g.keys=1;g.rewardRng.rng=miss;const before=r.pickups.length;assert(E.openGoldenChest(g,c.id));assert.equal(c.result.item,null);assert(c.result.coins>=3&&c.result.coins<=6);assert(['key','bomb','heart'].includes(c.result.kind));assert.equal(r.pickups.length,before+2);assert.equal(r.artifacts.length,0);assert(S.validRun(g));
});
test('fixed-seed actual crate and chest outcomes match3%/30% tables, no pity guarantee',()=>{
 const g=E.createGame('table79'),r=enter(g,'combat'),o=r.obstacles.find(o=>o.kind==='pot');assert(o);r.enemies=[];r.cleared=true;r.chests=[];const c=addGoldenChest(g,r);Object.assign(g.player,{x:c.x,y:c.y});let crates=0,gold=0,expectedCrates=0,expectedGold=0;
 for(let i=0;i<2000;i++){
  const chance=random({rng:i});expectedCrates+=chance<.03;expectedGold+=chance<.3;
  r.artifacts=[];r.pickups=[];o.hp=1;g.rewardRng.rng=i;E.breakCrate(g,o);crates+=r.artifacts.length;
  r.artifacts=[];r.pickups=[];c.opened=false;delete c.result;g.keys=1;g.rewardRng.rng=i;assert(E.openGoldenChest(g,c.id));gold+=!!c.result.item;
 }
 assert.equal(crates,expectedCrates);assert.equal(gold,expectedGold);assert(crates>30&&crates<95);assert(gold>500&&gold<700);assert.equal(LOOT_RULES.crateArtifact,.03);assert.equal(LOOT_RULES.goldArtifact,.3);
});
test('container placement uses its own seeded layout stream and persists on revisit',()=>{
 let n=0;for(let i=0;i<80;i++){const g=E.createGame('layout79-'+i),r=enter(g,'combat'),before=g.loot.rng,rewards=g.rewardRng.rng,s=JSON.stringify(r.chests);if(r.chests.length)n++;initContainers(g,r);assert.equal(JSON.stringify(r.chests),s);assert.equal(g.loot.rng,before);assert.equal(g.rewardRng.rng,rewards);for(const c of r.chests)assert(reachable(r,c,32));}assert(n>3&&n<30);
});
test('multiple pending drops reserve IDs and expose only nearby actual item previews',()=>{
 const g=E.createGame('multi79'),r=enter(g,'combat');const a=dropArtifact(g,{x:640,y:450},'crate'),b=dropArtifact(g,{x:640,y:450},'crate');assert(a&&b);assert.notEqual(a.item,b.item);assert(Math.hypot(a.x-b.x,a.y-b.y)>=68);Object.assign(g.player,{x:a.x+45,y:a.y});assert(itemPeek(g).includes(E.ITEMS[a.item].name));const before=JSON.stringify(g);itemPeek(g);availableArtifacts(g);assert.equal(JSON.stringify(g),before);
});
test('uncollected luck artifacts do not grant phantom luck to later rolls',()=>{
 const g=E.createGame('reserved-luck79'),r=enter(g,'combat'),luckId=Object.keys(ITEMS).find(id=>ITEMS[id].stats?.luck||id==='luckyClover');assert(luckId);
 r.artifacts.push({id:++g.id,x:640,y:415,item:luckId,taken:false,source:'crate'});
 const pool=eligibleItems(g).filter(id=>id!==luckId),odds=rarityOdds(g),grades=[0,1,2,3].filter(i=>pool.some(id=>ITEMS[id].rarity===i));
 for(let i=0;i<300;i++){g.loot.rng=i;let n=random({rng:i})*grades.reduce((n,i)=>n+odds[i],0),expected=grades.at(-1);for(const grade of grades){n-=odds[grade];if(n<=0){expected=grade;break;}}const id=rollArtifact(g);assert.equal(ITEMS[id].rarity,expected);assert.notEqual(id,luckId);}
});
test('a real timed bomb breaks a crate through combat code and rolls a floor drop',()=>{
 const g=E.createGame('crate79'),r=enter(g,'combat'),o=r.obstacles.find(o=>o.kind==='pot');assert(o);r.enemies.forEach(e=>e.appear=999);Object.assign(g.player,{x:o.x+o.w/2,y:o.y+o.h/2,invuln:999});assert(E.placeBomb(g));g.rewardRng.rng=low;for(let i=0;i<14;i++)E.tick(g,.1);assert.equal(o.hp,0);assert(r.artifacts.some(q=>q.source==='crate'));assert.equal(g.items.length,0);assert(S.validRun(g));
});
test('boss clear gives one fixed artifact alongside augment; repeat ticks/reload never duplicate',()=>{
 const g=E.createGame('boss79'),r=enter(g,'boss');g.player.invuln=999;r.enemies.forEach(e=>e.hp=0);E.tick(g,.02);assert.equal(g.phase,'augment');assert.equal(g.choice.length,3);assert(r.pedestal.item);assert.equal(r.pedestal.source,'boss');assert(S.validRun(g));
 const st=memory();assert(S.save(st,S.capture(S.freshProfile(),g),g));const resumed=S.load(st).active;assert.deepEqual(resumed,g);const cached=JSON.stringify(resumed.rooms[resumed.room].pedestal);E.chooseAugment(resumed,resumed.choice[0]);E.tick(resumed,.1);assert.equal(JSON.stringify(resumed.rooms[resumed.room].pedestal),cached);Object.assign(resumed.player,{x:r.pedestal.x,y:r.pedestal.y});assert(E.collectArtifact(resumed));assert.equal(resumed.items.length,1);assert(!E.collectArtifact(resumed));assert(S.validRun(resumed));
 Object.assign(resumed.player,{x:640,y:420});assert(E.nextFloor(resumed));assert.equal(resumed.floorIndex,1);assert.equal(E.current(resumed).pedestal,null);assert.equal(resumed.items.length,1);assert(S.validRun(resumed));
});
test('unwanted boss trolls can be left behind, including final-floor exit',()=>{
 const g=E.createGame('skip79');for(let floor=0;floor<3;floor++){const r=enter(g,'boss');r.enemies.forEach(e=>e.hp=0);g.player.invuln=999;E.tick(g,.02);assert(r.pedestal.item);assert(!r.pedestal.taken);if(floor<2)E.chooseAugment(g,g.choice[0]);Object.assign(g.player,{x:640,y:420});g.player.action=null;assert(E.nextFloor(g));}assert.equal(g.phase,'won');assert.equal(g.items.length,0);
});
test('challenge and timed success award chests, while failure grants no artifact',()=>{
 for(const type of ['challenge','rush']){
  const g=E.createGame('event79'),r=enter(g,type);Object.assign(g.player,{x:640,y:415,invuln:999});assert(E.interact(g));if(type==='challenge'){assert(E.acceptTrial(g));r.enemies=[];E.tick(g,.02);for(let i=0;i<15;i++)E.tick(g,.1);r.enemies=[];}else{assert(eventUI(g).includes('황금상자'));assert(E.chooseEvent(g,'rush'));r.enemies=[];}
  E.tick(g,.02);assert(r.cleared);assert.equal(r.pedestal,null);assert.equal(r.chests.length,1);assert.equal(g.items.length,0);assert(S.validRun(g));
 }
 const g=E.createGame('rush-fail79'),r=enter(g,'rush');Object.assign(g.player,{x:640,y:430,invuln:999});E.interact(g);E.chooseEvent(g,'rush');r.rush.deadline=0;g.time=1;r.enemies=[];E.tick(g,.02);assert.equal(r.chests.length,0);assert.equal(r.pedestal,null);assert.equal(r.rush.state,'failed');
});
test('new save stores opened chest and exact pending drops;77 active/profile is not overwritten',()=>{
 const st=memory(),old=oldGame('old79'),profile=Old.freshProfile();profile.discovered=['fireworks'];assert(Old.save(st,profile,old));const previous=st.getItem(Old.SAVE_KEY),imported=S.load(st);assert(imported.legacyActive);assert.equal(imported.active,null);assert.deepEqual(imported.profile,profile);
 const g=E.createGame('saved79'),r=enter(g,'secret'),c=r.chests[0];Object.assign(g.player,{x:c.x,y:c.y});g.rewardRng.rng=medium;E.openGoldenChest(g,c.id);E.pause(g);assert(S.save(st,S.capture(imported.profile,g),g));assert.deepEqual(S.load(st).active,g);assert.equal(st.getItem(Old.SAVE_KEY),previous);const loaded=S.load(st).active;E.resume(loaded);assert(!E.openGoldenChest(loaded,c.id));assert.equal(loaded.rooms[loaded.room].artifacts.length,1);
});
test('invalid containers and illegal starter pedestal are rejected without dropping profile',()=>{
 const g=E.createGame('invalid79');g.rooms[0].pedestal={x:640,y:415,item:'fireworks',taken:false,source:'treasure'};assert(!S.validRun(g));g.rooms[0].pedestal=null;g.rooms[0].chests.push({id:1,x:640,y:430,opened:false,keyCost:1});assert(!S.validRun(g));
});
