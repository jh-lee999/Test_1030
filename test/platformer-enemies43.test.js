import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,hitEnemy,hurtPlayer,FLOOR} from '../platformer-engine.js';
import {generateWorld,generateRoom} from '../platformer-world.js';
import {ENEMY_TYPES} from '../platformer-enemies.js';
function scene(type){
  const g=createGame(43),home={id:'arena',x:0,y:FLOOR,w:2200},profile=ENEMY_TYPES[type];
  g.room.width=2200;g.room.platforms=[home];g.room.hazards=[];g.room.marks=[];
  const e={...profile,id:1,type,home,x:650,y:FLOOR,hp:500,maxHp:500,facing:-1,mode:'idle',timer:0,cooldown:0,clock:0,flash:0,death:0,act:0,attackId:0};g.room.enemies=[e];g.player.x=420;return{g,e};
}
const step=(g,n)=>{for(let i=0;i<n;i++)tick(g,{},1/120);};
test('all combat encounters contain mixed silhouettes and original pose sets',()=>{
  const seen=new Set();for(let seed=0;seed<50;seed++)for(const node of generateWorld(seed).nodes){if(!['combat','elite'].includes(node.type))continue;const r=generateRoom(node),types=new Set(r.enemies.map(e=>e.type));assert.ok(types.size>=3);for(const t of types)seen.add(t);}
  for(const t of ['rusher','guard','caster','drone','fan','archer'])assert.ok(seen.has(t));
});
test('shield blocks frontal shots, exposes recovery and rear, and skills break guard',()=>{
  const {g,e}=scene('guard');e.facing=-1;hitEnemy(g,e,100,8);assert.equal(e.hp,475);
  hitEnemy(g,e,100,-8);assert.equal(e.hp,375);e.mode='attack';hitEnemy(g,e,100,8);assert.equal(e.hp,275);
  e.mode='idle';hitEnemy(g,e,100,8,{guardBreak:true});assert.equal(e.hp,175);
  e.turnCooldown=.8;e.facing=-1;g.player.x=900;e.cooldown=99;tick(g,{},.02);assert.equal(e.facing,-1);step(g,100);assert.equal(e.facing,1);
});
test('berserker has a windup, crosses the old platform boundary, then settles after its leap',()=>{
  const {g,e}=scene('rusher');g.player.x=1080;e.home={id:'small',x:500,y:FLOOR,w:230};g.room.platforms=[e.home,{id:'next',x:800,y:FLOOR,w:1000}];e.x=680;
  step(g,50);assert.equal(e.x,680);step(g,80);assert.ok(e.x>800);assert.equal(e.facing,1);step(g,180);assert.ok(e.y<=FLOOR);assert.ok(Number.isFinite(e.y));
});
test('caster locks a visible delayed zone; moving, jumping or killing the caster avoids it',()=>{
  for(const response of ['stay','move','jump','kill']){
    const {g,e}=scene('caster');tick(g,{});assert.equal(g.room.marks.length,1);const target=g.room.marks[0].x;step(g,60);assert.equal(g.stats.hp,90);
    if(response==='move')g.player.x=target+140;if(response==='jump'){g.player.y-=100;g.player.vy=-1000;g.player.grounded=false;}if(response==='kill')e.hp=0;
    step(g,65);assert.equal(g.stats.hp,response==='stay'?75:90);assert.equal(g.room.marks.length,0);
  }
});
test('drone leaves its home platform, tracks airborne targets and fires a dodgeable two-shot burst',()=>{
  const {g,e}=scene('drone');e.home={id:'old',x:500,y:FLOOR,w:200};g.player.x=150;step(g,125);assert.ok(e.x<500);assert.ok(e.y<FLOOR-40);assert.equal(g.projectiles.filter(b=>b.owner==='enemy').length,2);
});
test('high skill immunity ends before boulder expiry, and menus freeze new attacks',()=>{
  const {g}=scene('caster');tick(g,{skill:true});assert.ok(g.player.skillTime<=1.1);assert.equal(hurtPlayer(g,10),false);step(g,150);assert.ok(g.boulders.length);assert.equal(g.player.skillTime,0);
  g.player.invulnerable=0;assert.equal(hurtPlayer(g,10),true);g.phase='paused';const before=structuredClone(g.room.marks);step(g,200);assert.deepEqual(g.room.marks,before);
});
