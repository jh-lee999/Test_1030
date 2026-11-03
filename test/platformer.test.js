import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,makeRoom,seededRandom,landBody,heroMuzzle,heroPose,segmentHitsBody,chooseReward,enterNextRoom,hurtPlayer,FLOOR,STAGES,HERO_SIZE} from '../platformer-engine.js';
import {butterMuzzleOffset,selectButterFrame} from '../butter-original-motion.js';
import {applyItem,upperPower} from '../survivor-engine.js';
function safe(){const g=createGame(37);g.room.enemies=g.room.enemies.slice(0,1);g.room.enemies[0].x=2500;return g;}
function step(g,n,input={}){for(let i=0;i<n;i++)tick(g,input,1/120);}
test('seeded platform layouts are repeatable, varied and have open grounded exits',()=>{
  assert.deepEqual(makeRoom(0,seededRandom(7)),makeRoom(0,seededRandom(7)));
  const variants=new Set();for(let seed=0;seed<20;seed++){const r=makeRoom(0,seededRandom(seed));variants.add(JSON.stringify(r.platforms));assert.equal(r.platforms[0].w,r.width);assert.ok(r.exit.x<r.width);assert.equal(r.enemies.length,7);}
  assert.ok(variants.size>10);assert.equal(makeRoom(STAGES-1,seededRandom(1)).enemies[0].type,'ghost');
});
test('jump, release height cut, double jump, no third jump, landing reset',()=>{
  const g=safe();tick(g,{jump:true});assert.equal(g.player.jumps,1);assert.ok(g.player.vy<0);step(g,12,{jump:true});const fast=g.player.vy;tick(g,{});assert.ok(g.player.vy>fast);
  tick(g,{jump:true});assert.equal(g.player.jumps,2);tick(g,{});tick(g,{jump:true});assert.equal(g.player.jumps,2);
  step(g,200);assert.equal(g.player.y,FLOOR);assert.equal(g.player.jumps,0);assert.equal(g.player.grounded,true);
});
test('coyote jump counts as first, walking off without coyote uses second',()=>{
  const g=safe();Object.assign(g.player,{y:500,grounded:false,coyote:.05,jumps:0});tick(g,{jump:true});assert.equal(g.player.jumps,1);
  const h=safe();Object.assign(h.player,{y:500,grounded:false,coyote:0,jumps:0});tick(h,{jump:true});assert.equal(h.player.jumps,2);
});
test('event-buffered taps between animation frames still jump, dash and fire',()=>{
  const g=safe();tick(g,{jumpPressed:true,jumpReleased:true});assert.equal(g.player.jumps,1);assert.ok(g.player.vy<0);
  tick(g,{jumpPressed:true,jumpReleased:true});assert.equal(g.player.jumps,2);tick(g,{dashPressed:true});assert.ok(g.player.dash>0);
  tick(g,{attackPressed:true});assert.ok(g.player.action);tick(g,{skillPressed:true});assert.equal(g.player.action.type,'high');
});
test('buffered jump fires on landing and one-way platforms allow ascent',()=>{
  const g=safe();Object.assign(g.player,{y:FLOOR-8,vy:500,grounded:false,coyote:0,jumps:2});tick(g,{jump:true});step(g,4,{jump:true});assert.ok(g.player.vy<0);assert.equal(g.player.jumps,1);
  const p={x:100,y:520,w:30,vy:-400,jumps:1};landBody(p,[{x:0,y:500,w:200}],.1);assert.equal(p.y,480);assert.equal(p.grounded,false);
  p.vy=400;landBody(p,[{x:0,y:500,w:200}],.1);assert.equal(p.y,500);assert.equal(p.grounded,true);
});
test('mirroring transforms the whole-pose muzzle exactly; air fire keeps original poses',()=>{
  const g=safe(),p=g.player;p.action={type:'normal',time:.2,duration:.4};p.gait.amount=1;
  const q=butterMuzzleOffset(heroPose(p));p.facing=-1;const left=heroMuzzle(p);p.facing=1;const right=heroMuzzle(p);
  assert.ok(Math.abs(left.x-p.x-q.x)<1e-9);assert.ok(Math.abs(right.x-p.x+q.x)<1e-9);assert.equal(left.y,right.y);assert.equal(left.y,p.y+q.y-HERO_SIZE*.28);
  p.grounded=false;p.vy=-300;assert.equal(selectButterFrame(heroPose(p)).key,'walkShoot');const rise=heroPose(p).gait.phase;p.vy=300;assert.notEqual(heroPose(p).gait.phase,rise);
});
test('held attack repeats, moving fire animates, release occurs after windup',()=>{
  const g=safe();g.random=()=>.9;tick(g,{attack:true,right:true});assert.equal(g.projectiles.length,0);step(g,26,{attack:true,right:true});assert.ok(g.projectiles.length>0);assert.equal(selectButterFrame(heroPose(g.player)).key,'walkShoot');step(g,90,{attack:true,right:true});assert.ok(g.projectiles.length>=2);
});
test('fast projectiles sweep the full body and do not tunnel through at high speed',()=>{
  const body={x:100,y:200,w:30,h:80};assert.equal(segmentHitsBody(0,130,200,130,body,4),true);assert.equal(segmentHitsBody(0,80,200,80,body,4),false);
  const g=safe(),e=g.room.enemies[0];e.x=400;e.hp=48;g.projectiles=[{owner:'player',x:0,y:FLOOR-60,vx:70000,vy:0,r:6,life:1,damage:50,hitIds:[],bounces:0}];tick(g,{});assert.equal(e.hp,0);assert.equal(g.stats.kills,1);
});
test('dash has a cooldown, fixed facing, damage immunity, no repeated key auto-dash',()=>{
  const g=safe(),hp=g.stats.hp;tick(g,{dash:true,right:true});assert.ok(g.player.dash>0);assert.equal(hurtPlayer(g,30),false);assert.equal(g.stats.hp,hp);tick(g,{dash:true,left:true});assert.equal(g.player.facing,1);step(g,100,{dash:true});assert.equal(g.player.dash,0);assert.equal(g.player.dashCooldown,0);tick(g,{});tick(g,{dash:true});assert.ok(g.player.dash>0);
});
test('high skill produces bouncing piercing boulder and grants duration immunity',()=>{
  const g=safe();tick(g,{skill:true});assert.equal(g.boulders.length,0);assert.equal(hurtPlayer(g,50),false);step(g,85);assert.equal(g.boulders.length,1);
  const b=g.boulders[0];b.x=g.room.width-b.r-1;b.vx=660;tick(g,{});assert.ok(b.vx<0);const e=g.room.enemies[0];e.x=b.x;e.y=FLOOR;e.hp=500;e.maxHp=500;tick(g,{});assert.ok(e.hp<500);assert.equal(g.boulders.length,1);
  const stronger=applyItem(g.stats,'upper_book');assert.ok(upperPower(stronger).damage>upperPower(g.stats).damage);assert.ok(upperPower(stronger).duration>upperPower(g.stats).duration);
});
test('lower grade emits tracking chain projectile that cannot hit the same enemy twice',()=>{
  const g=createGame(8);g.random=()=>0;g.player.x=400;g.room.enemies=g.room.enemies.slice(0,2);g.room.enemies.forEach((e,i)=>{e.x=600+i*160;e.hp=300;e.cooldown=99;});
  step(g,30,{attack:true});assert.ok(g.projectiles.some(b=>b.homing&&b.bounces===1));step(g,120);assert.ok(g.room.enemies.every(e=>e.hp<300));
});
test('room clear queues one three-choice reward; invalid/double claim rejected; stats persist',()=>{
  const g=safe();assert.equal(enterNextRoom(g),false);g.room.enemies[0].hp=0;tick(g,{});assert.equal(g.phase,'reward');assert.equal(g.choices.length,3);assert.equal(chooseReward(g,'nope'),false);
  const choice=g.choices[0];assert.equal(chooseReward(g,choice),true);assert.equal(chooseReward(g,choice),false);assert.equal(g.stats.itemsTaken,1);assert.equal(enterNextRoom(g),false);
  g.player.x=g.room.exit.x;assert.equal(enterNextRoom(g),true);assert.equal(g.room.index,1);assert.equal(g.stats.inventory[choice],1);assert.equal(g.projectiles.length,0);
});
test('all four stages can be cleared through rewards and grounded exits, then victory',()=>{
  const g=createGame(1);for(let stage=0;stage<STAGES;stage++){assert.equal(g.room.index,stage);g.room.enemies.forEach(e=>e.hp=0);tick(g,{});assert.equal(g.phase,'reward');chooseReward(g,g.choices[0]);g.player.x=g.room.exit.x;g.player.y=FLOOR;assert.equal(enterNextRoom(g),true);}assert.equal(g.phase,'won');assert.equal(g.stats.itemsTaken,4);
});
test('pause, death and reward stop simulation; hurt cooldown prevents repeated damage',()=>{
  const g=safe();hurtPlayer(g,10);assert.equal(g.stats.hp,80);hurtPlayer(g,10);assert.equal(g.stats.hp,80);g.phase='paused';const x=g.player.x,t=g.time;step(g,120,{right:true});assert.equal(g.player.x,x);assert.equal(g.time,t);g.phase='playing';g.player.invulnerable=0;hurtPlayer(g,100);assert.equal(g.phase,'dead');assert.equal(g.stats.hp,0);step(g,30);assert.equal(g.time,t);
});
