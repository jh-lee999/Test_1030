import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../survivor72-engine.js';
import * as P from '../survivor72-profile.js';
import * as Previous from '../survivor71-profile.js';
import {createGame as oldGame,useUltimate as oldUltimate,chooseUpgrade as oldChoose,tick as oldTick} from '../survivor71-engine.js';
import {DEFAULT_VIEWPORT,cameraFor,arenaFor} from '../survivor72-camera.js';
import {BOULDER,advanceBoulder,boulderVelocity,projectBoulder} from '../survivor72-boulder.js';
import {SPAWN} from '../survivor71-world.js';
import {sceneLayout,cacheInfo,clearSceneCache} from '../survivor72-scenery.js';
const fresh=()=>{const g=E.createGame('72');E.chooseUpgrade(g,'relic:comet');return g;};
const seconds=(g,t,input={})=>{for(let i=0;i<Math.ceil(t*90)&&g.phase==='playing';i++)E.tick(g,1/90,input);};
const quiet=g=>{g.spawnTimer=g.eliteAt=g.burstAt=999;g.championSpawned=true;g.moves.stone.timer=999;};
function card(g){const p=g.world.points.find(p=>p.artifact==='yellow');Object.assign(g.player,{x:p.x,y:p.y});E.interact(g);assert(E.chooseUpgrade(g,'relic:yellow'));return g;}
test('root pins v72 while v71 is preserved verbatim and diagnostics match combat sources',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url));
 assert.match(read('survivor72.html').toString(),/survivor72\.js\?v=72/);
 assert.equal(createHash('sha256').update(read('survivor71.html')).digest('hex'),'060202a0abfa959350b62eb06114fb0efe23231722864faaf8a61c9ef64eb45e');
 const data=JSON.parse(read('docs/survivor72-balance.json')),hash=createHash('sha256').update(['survivor72-engine.js','survivor71-world.js','survivor72-content.js','survivor72-camera.js','survivor72-boulder.js'].map(read).join('\n')).digest('hex');
 assert.equal(data.runs.reduce((n,r)=>n+r.results.length,0),48);for(const r of data.runs)assert.equal(r.sourceSHA256,hash);assert(data.native.nativeOnly);assert.deepEqual(data.native.errors,[]);
});
test('painted map layouts are seeded, bounded and never consume combat RNG or mutate the world',()=>{
 clearSceneCache();const g=fresh(),before=JSON.stringify(g),a=sceneLayout(g);assert(a.roads.length>0);assert(a.decorations.length>0);assert.equal(JSON.stringify(g),before);assert.equal(sceneLayout(g),a);
 clearSceneCache();assert.deepEqual(sceneLayout(g),a);for(let i=0;i<10;i++)sceneLayout(E.createGame('map72-'+i));assert(cacheInfo().layouts<=4);clearSceneCache();
});
test('all three gun ranks are stronger PER HIT and per second than their same-rank slingshot',()=>{
 for(let level=1;level<=3;level++){const g=fresh();g.moves.stone.level=level;const a=E.primaryStats(g);g.relics.push('yellow');const b=E.primaryStats(g);assert(b.damage>=a.damage*1.49);assert(b.damage/b.cooldown>a.damage/a.cooldown*2.5);assert.equal(b.pierce,a.pierce+1);}
});
test('real projectile damage in a controlled lane increases, not just the description',()=>{
 for(let level=1;level<=3;level++){
  const damage=[];for(const gun of [false,true]){const g=fresh();quiet(g);g.moves.stone={level,awake:false,timer:.1};g.world.obstacles=[];g.world.hazards=[];if(gun)g.relics.push('yellow');const e=E.spawnEnemy(g,'fan',{x:g.player.x-240,y:g.player.y});e.speed=0;e.hp=e.maxHp=100000;seconds(g,8);damage.push(g.telemetry.damageBy[gun?'gun':'stone']||0);}
  assert(damage[1]>damage[0]*1.8,JSON.stringify({level,damage}));
 }
});
test('screen physics follows the exact rendering camera and keeps full rocks inside across aspect ratios/panning',()=>{
 for(const viewport of [{width:320,height:681},{width:568,height:261},{width:844,height:324},{width:1366,height:702},{width:7680,height:4254}]){
  const p={...SPAWN},b={x:p.x,y:p.y-90,radius:BOULDER.radius,...boulderVelocity(p,null,-1),trail:[]};let reflections=0;
  for(let i=0;i<720;i++){p.x+=Math.sin(i*.01)*1.5;p.y+=Math.cos(i*.013)*1.2;reflections+=advanceBoulder(b,1/90,p,viewport).bounces;const a=b.arena,c=cameraFor(p,viewport);assert(b.x>=a.left-1e-6&&b.x<=a.right+1e-6&&b.y>=a.top-1e-6&&b.y<=a.bottom+1e-6);assert((b.x-b.radius-4-c.left)*c.zoom>=0);assert((b.y-b.radius-4-c.top)*c.zoom>=0);assert((b.x+b.radius+4-c.left)*c.zoom<=viewport.width+1e-6);assert((b.y+b.radius+4-c.top)*c.zoom<=viewport.height+1e-6);assert(Math.abs(Math.hypot(b.vx,b.vy)-BOULDER.speed)<1e-6);}
  assert(reflections>=2);
 }
});
test('corner collision reflects both axes and preserves the remaining travel distance',()=>{
 const p={...SPAWN},a=arenaFor(p,DEFAULT_VIEWPORT,36),b={x:a.right-5,y:a.bottom-5,radius:36,vx:100,vy:100,arena:a,trail:[]},path=advanceBoulder(b,.1,p,DEFAULT_VIEWPORT);assert.equal(b.vx,-100);assert.equal(b.vy,-100);assert(Math.abs(b.x-(a.right-5))<1e-6);assert(Math.abs(b.y-(a.bottom-5))<1e-6);assert.equal(path.bounces,1);assert.equal(path.segments.length,2);
});
test('resize and camera warp remap the screen position without a cross-map damage sweep; render projection is pure',()=>{
 const p={...SPAWN},b={x:p.x,y:p.y-90,radius:36,...boulderVelocity(p,null,-1),trail:[]};advanceBoulder(b,.1,p,DEFAULT_VIEWPORT);const old=b.arena,u=(b.x-old.left)/(old.right-old.left),before=JSON.stringify(b),projected=projectBoulder(b,p,{width:390,height:785});assert.equal(JSON.stringify(b),before);assert(Math.abs((projected.x-projected.arena.left)/(projected.arena.right-projected.arena.left)-u)<1e-8);const path=advanceBoulder(b,0,{x:p.x+1000,y:p.y+500},{width:390,height:785});assert.equal(path.segments.length,0);
});
test('king rock ignores terrain/world boundaries, penetrates enemies and expires after exactly eight live seconds',()=>{
 const g=fresh();quiet(g);g.world.hazards=[];g.player.x=65;g.player.y=1000;g.player.invuln=100;E.useUltimate(g,{width:844,height:324});seconds(g,.8);const b=g.bullets.find(b=>b.kind==='boulder');assert(b);assert.equal(b.damage,90);assert(b.arena.left<0);const e=E.spawnEnemy(g,'fan',{x:b.x+b.vx/90,y:b.y+b.vy/90});e.hp=e.maxHp=10000;e.speed=0;g.world.obstacles.push({x:b.x-20,y:b.y-20,w:80,h:80,style:0});seconds(g,.12);assert(g.telemetry.damageBy.boulder>0);assert(g.bullets.includes(b));seconds(g,8);assert(!g.bullets.some(b=>b.kind==='boulder'));
});
test('pause, save/resume and second Yellow Card cast preserve arena and remaining lifetime exactly once',()=>{
 const g=card(fresh());quiet(g);E.useUltimate(g,{width:390,height:785});seconds(g,.9);assert.equal(g.telemetry.procs.ultimateShot,1);E.pause(g);const before=JSON.stringify(g);E.tick(g,.15,{viewport:{width:844,height:324}});assert.equal(JSON.stringify(g),before);const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};assert(P.saveStore(storage,P.freshProfile(),g));const restored=P.loadStore(storage).active;assert(restored);E.resume(restored);seconds(restored,1.2,{viewport:{width:844,height:324}});assert.equal(restored.telemetry.procs.ultimateShot,2);assert.equal(restored.bullets.filter(b=>b.kind==='boulder').length,2);assert(P.validRun(restored));
});
test('v71 active games migrate without changing IDs/RNG/HP/resources or granting another reward',()=>{
 const g=oldGame('carry72');oldChoose(g,g.offers[0].id);oldUltimate(g);for(let i=0;i<80;i++)oldTick(g,1/90);const before=JSON.stringify(g),next=P.upgradeLegacy(g);assert(next);assert.equal(JSON.stringify(g),before);for(const k of ['seed','runId','time','level','xp','spawnRng','lootRng','cores','kills','pendingLevels','pendingRewards'])assert.deepEqual(next[k],g[k]);assert.equal(next.player.hp,g.player.hp);assert.equal(next.player.ultCooldown,g.player.ultCooldown);assert(P.validRun(next));
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},profile=Previous.freshProfile();profile.shards=17;assert(Previous.saveStore(storage,profile,g));const raw=map.get(Previous.SAVE_KEY),loaded=P.loadStore(storage);assert(loaded.active);assert.equal(loaded.profile.shards,17);assert(P.saveStore(storage,loaded.profile,loaded.active));assert.equal(map.get(Previous.SAVE_KEY),raw);assert.equal(P.loadStore(storage).profile.shards,17);
});
