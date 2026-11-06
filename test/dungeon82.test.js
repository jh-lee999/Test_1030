import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../dungeon82-engine.js';
import * as Save from '../dungeon80-save.js';
import {spawnPlan,advanceFriendly,traceBeam} from '../dungeon82-shots.js';
import {shotBounds,segmentBox,firstShotHit,blockedShot} from '../dungeon82-collision.js';
import {shotProfile} from '../dungeon82-build.js';
import {links,random,blocked} from '../dungeon80-world.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
function fixture(){const g=E.createGame('collision82'),r=E.current(g);r.obstacles=[{x:600,y:400,w:52,h:42,hp:1,kind:'pot'}];r.enemies=[];r.cleared=true;r.terrain=[];r.biome=null;g.player.invuln=999;return {g,r,o:r.obstacles[0]};}
function apiFor(g){return {bullet:b=>g.bullets.push({id:++g.id,age:0,hits:{},...b}),breakCrate:o=>E.breakCrate(g,o),effect(){},hit(e,d){e.hp-=d;},area(){},lightning(){},los(){return true;},nearest(b,except,range,accept){return E.current(g).enemies.filter(e=>e.id!==except&&e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<range&&(!accept||accept(e))).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];}};}
const pellet=(g,data={})=>{const b={id:++g.id,kind:'stone',x:560,y:420,vx:600,vy:0,life:3,age:0,radius:7,damage:14,hits:{},pierce:0,wallBounces:0,...data};g.bullets.push(b);return b;};
test('82 preserves exact81 archive and original optimized renderer/cache, uses same save',()=>{
 assert.equal(createHash('sha256').update(read('dungeon81.html')).digest('hex'),'355b3502e6484425aca8dba57ef7179fe77359cfdc47e1e24dc20a8f65f22d2e');assert.match(read('index.html'),/dungeon82.js\?v=82/);assert.match(read('dungeon82-renderer.js'),/dungeon81-cache.js/);assert.match(read('dungeon82.js'),/dungeon80-save.js/);
 for(const [path,hash]of Object.entries(JSON.parse(read('docs/dungeon81-performance.json')).sourceHashes)){
  let source=read(path==='index.html'?'dungeon81.html':path);
  if(path==='test/dungeon81.test.js')source=source.replace("read('dungeon81.html'),/dungeon81","read('index.html'),/dungeon81");
  if(['tools/check-dungeon81-browser.mjs','tools/playtest-dungeon81.mjs','tools/check-dungeon81-cache-browser.mjs'].includes(path))source=source.replace("root+'/dungeon81.html?test=1","root+'/?test=1");
  if(path==='tools/check-dungeon81-performance.mjs')source=source.replace("version===80?'/dungeon80.html':'/dungeon81.html'","version===80?'/dungeon80.html':'/'");
  assert.equal(createHash('sha256').update(source).digest('hex'),hash,path);
 }
});
test('crate shot box matches rendered top, body footprint and gaps remain unchanged',()=>{
 const {r,o}=fixture(),b=shotBounds(o);assert(b.top<o.y-20);assert.equal(b.left,o.x-4);assert(blockedShot(r,620,b.top+2,0));assert(!blocked(r,620,b.top+2,0));
 o.kind='gap';assert(!blockedShot(r,620,420,0));assert(blocked(r,620,420,0));
});
test('slab sweep catches high speed, radius-only grazing, corners and inside origins',()=>{
 const box={left:600,right:652,top:400,bottom:442};assert(segmentBox({x:500,y:420},{x:900,y:420},box));assert(segmentBox({x:580,y:388},{x:700,y:388},box,13));assert.equal(segmentBox({x:605,y:410},{x:610,y:410},box).t,0);assert(!segmentBox({x:500,y:380},{x:900,y:380},box,13));assert(segmentBox({x:500,y:300},{x:600,y:400},box));
});
test('ordinary/gun/fan/charged/inside/visible-top/fast shots actually destroy wooden crates',()=>{
 for(const data of [{},{kind:'gun',radius:6,vx:850},{kind:'charged',x:585,radius:13},{x:605},{y:386},{vx:12000}]){
  const {g,o}=fixture();pellet(g,data);for(let i=0;i<25&&o.hp;i++){g.time+=1/120;advanceFriendly(g,1/120,apiFor(g));}assert.equal(o.hp,0,JSON.stringify(data));const rng=g.rewardRng.rng;assert(!E.breakCrate(g,o));assert.equal(g.rewardRng.rng,rng);
 }
});
test('closest solid cover blocks a shot/beam from destroying a box behind it',()=>{
 for(const shape of ['pellet','beam','cleave']){const {g,r,o}=fixture();r.obstacles.unshift({x:580,y:350,w:12,h:120,hp:1,kind:'rock'});const api=apiFor(g);if(shape==='pellet'){pellet(g,{vx:12000});advanceFriendly(g,1/120,api);}else spawnPlan(g,api,{...shotProfile(g),shape,range:200},560,420,0);assert.equal(o.hp,1,shape);}
});
test('beams and front melee break boxes; rear/out-of-range boxes are untouched',()=>{
 for(const shape of ['beam','cleave']){const {g,r,o}=fixture();r.obstacles.push({x:480,y:400,w:40,h:40,hp:1,kind:'pot'});spawnPlan(g,apiFor(g),{...shotProfile(g),shape,range:120},560,420,0);assert.equal(o.hp,0,shape);assert.equal(r.obstacles[1].hp,1,shape);}
 const {g,o}=fixture();spawnPlan(g,apiFor(g),{...shotProfile(g),shape:'cleave',range:20},560,420,0);assert.equal(o.hp,1);
});
test('king stone crushes crates without losing lifetime/piercing; gold chest never shot-opened',()=>{
 const {g,r,o}=fixture();r.chests=[{id:999,x:650,y:420,keyCost:1,opened:false}];const b=pellet(g,{kind:'boulder',radius:36,x:560,life:8});advanceFriendly(g,.1,apiFor(g));assert.equal(o.hp,0);assert(b.life>7.8);assert.equal(r.chests[0].opened,false);assert.equal(g.keys,1);
});
test('large-room beams use real bounds and top-wall muzzle entry still works',()=>{
 const r={bounds:{left:130,right:1790,top:205,bottom:680},view:{width:1920,height:800},obstacles:[]};const seg=traceBeam(r,{x:1400,y:420},0,700,0);assert.equal(seg[0].b.x,1786);assert(!firstShotHit(r,{x:640,y:180},{x:640,y:220},7));assert(firstShotHit(r,{x:640,y:180},{x:640,y:900},7));
});
test('junior/ricochet flies along manual aim before any hit; zero nearest-enemy steering',()=>{
 const {g,r}=fixture();r.obstacles=[];const e=E.spawnEnemy(g,'guard',700,350);e.appear=0;const b=pellet(g,{kind:'chain',bounces:5,plan:{...shotProfile(g),flags:{}}});let searches=0;const api=apiFor(g);api.nearest=()=>{searches++;return e;};for(let i=0;i<15;i++){g.time+=1/120;advanceFriendly(g,1/120,api);}assert.equal(b.vx,600);assert.equal(b.vy,0);assert.equal(b.bounces,5);assert.equal(searches,0);
});
test('seeking launches straight, then bends gradually; no target snapping or rear acquisition',()=>{
 const {g,r}=fixture();r.obstacles=[];const e=E.spawnEnemy(g,'guard',700,380);e.appear=0;const b=pellet(g,{plan:{...shotProfile(g),flags:{seeking:true}}}),api=apiFor(g);
 for(let i=0;i<12;i++){g.time+=1/120;advanceFriendly(g,1/120,api);}assert.equal(b.vy,0);const prev=Math.atan2(b.vy,b.vx);for(let i=0;i<4;i++){g.time+=1/120;advanceFriendly(g,1/120,api);}assert(b.vy<0);assert(Math.abs(Math.atan2(b.vy,b.vx)-prev)<=1.9*4/120+1e-8);
});
test('seeking cannot choose a rear target or curve through opaque cover',()=>{
 for(const behind of [true,false]){const {g,r}=fixture();r.obstacles=[];const e=E.spawnEnemy(g,'guard',behind?500:700,400);e.appear=0;const b=pellet(g,{plan:{...shotProfile(g),flags:{seeking:true}}}),api=apiFor(g);if(!behind)api.los=()=>false;for(let i=0;i<24;i++){g.time+=1/120;advanceFriendly(g,1/120,api);}assert.equal(b.vy,0);assert.equal(g.telemetry.homing,0);}
});
test('ricochet randomizes ONLY on hit, uses saved combat RNG and retains finite school budget',()=>{
 const angles=[];for(let seed=1;seed<=10;seed++){const {g,r}=fixture();r.obstacles=[];g.combatRng.rng=seed;const expected=random({rng:seed})*Math.PI*2,e=E.spawnEnemy(g,'guard',605,446);Object.assign(e,{appear:0,hp:1000,maxHp:1000});const b=pellet(g,{kind:'chain',x:595,bounces:5}),api=apiFor(g);advanceFriendly(g,1/120,api);assert.equal(b.bounces,4);assert.equal(b.last,e.id);assert(Math.abs(b.vx-Math.cos(expected)*590)<1e-8);assert(Math.abs(b.vy-Math.sin(expected)*590)<1e-8);const angle=Math.atan2(b.vy,b.vx);g.time+=1/120;advanceFriendly(g,1/120,api);assert.equal(Math.atan2(b.vy,b.vx),angle);angles.push(angle);}assert(new Set(angles.map(a=>a.toFixed(3))).size>5);
});
test('real engine firing breaks generated boxes and saved destroyed state resumes exactly',()=>{
 const g=E.createGame('1793941607142'),r=g.rooms.find(r=>r.type==='combat'&&r.id>0),from=g.rooms.find(q=>links(g,q).some(l=>l.to===r.id));g.room=from.id;from.cleared=true;g.transition=0;assert(E.enterRoom(g,links(g).find(l=>l.to===r.id).dir));const o=r.obstacles.find(o=>o.kind==='pot');assert(o);r.enemies.forEach(e=>e.appear=999);g.player.invuln=999;
 // Queue through normal attack/release code, using an explicit legal-room fixture.
 const target={x:o.x+o.w/2,y:shotBounds(o).top+15};Object.assign(g.player,{x:o.x-100,y:o.y+30});for(let i=0;i<100&&o.hp;i++)E.tick(g,1/120,{fire:true,target,aim:{x:1,y:0}});assert.equal(o.hp,0);E.pause(g);assert(Save.validRun(g));const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};assert(Save.save(storage,Save.freshProfile(),g));assert.deepEqual(Save.load(storage).active,g);
});
test('queued/random ricochet resumes deterministically; pause consumes no RNG',()=>{
 const g=E.createGame('random-resume82'),r=E.current(g);Object.assign(g.player,{x:400,y:470,invuln:999});const e=E.spawnEnemy(g,'guard',600,446);Object.assign(e,{appear:0,hp:10000,maxHp:10000,speed:0,timer:999});pellet(g,{kind:'chain',x:575,bounces:5,plan:shotProfile(g)});E.pause(g);assert(Save.validRun(g));
 const before=structuredClone(g);E.tick(g,.1);assert.deepEqual(g,before);const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};assert(Save.save(storage,Save.freshProfile(),g));const h=Save.load(storage).active;E.resume(g);E.resume(h);
 for(let i=0;i<200;i++){E.tick(g,1/120);E.tick(h,1/120);}assert.deepEqual(h,g);assert.notEqual(g.combatRng.rng,before.combatRng.rng);
});
