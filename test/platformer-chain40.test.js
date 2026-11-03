import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,grantItem,FLOOR,CHAIN_HIT_INTERVAL} from '../platformer-engine.js';
import {createBuildState,lowerPower,LOWER_CHAIN_RANGE} from '../platformer-build.js';

function fixture(positions=[600,850]){
  const g=createGame('chain40'),floor={id:'flat',x:0,y:FLOOR,w:4000,ground:true},template=g.room.enemies[0];
  g.room.width=4000;g.room.platforms=[floor];g.room.pickups=[];g.room.cleared=true;g.room.rewardTaken=true;g.player.invulnerable=100;g.random=()=>.99;
  g.room.enemies=positions.map((x,i)=>({...template,id:`e${i}`,type:'archer',x,y:FLOOR,w:44,h:94,home:floor,hp:100000,maxHp:100000,mode:'idle',cooldown:999}));return g;
}
function emit(g,bounces,extra={}){
  const first=g.room.enemies[0],b={owner:'player',x:first.x-40,y:first.y-first.h/2,vx:1000,vy:0,speed:1000,r:9,damage:10,life:2.4,homing:true,homingStrength:10,bounces,chainRange:LOWER_CHAIN_RANGE,pierce:0,hitIds:[],...extra};g.projectiles.push(b);return b;
}
function finish(g,b,seconds=10){for(let i=0;i<seconds*120&&g.projectiles.includes(b);i++)tick(g,{});assert.equal(g.projectiles.includes(b),false,'chain failed to terminate');return b.hitIds;}
test('Lv1/2/3/5 provide exactly 1/2/3/5 bounces plus the initial hit between two enemies',()=>{
  for(const level of [1,2,3,5]){const g=fixture(),power=lowerPower({...createBuildState(),lowerGrade:level}),b=emit(g,power.bounces),hits=finish(g,b);assert.equal(power.bounces,level);assert.deepEqual(hits,Array.from({length:level+1},(_,i)=>`e${i%2}`));assert.equal(b.bounces,0);assert.equal(g.room.enemies.reduce((sum,e)=>sum+(e.maxHp-e.hp)/10,0),level+1);}
});
test('acquired grade books and inscription bounce bonuses reach the real emitted projectile',()=>{
  const g=fixture();grantItem(g,'lower_book');grantItem(g,'lower_book');assert.equal(g.stats.lowerGrade,3);const power=lowerPower(g.stats);assert.equal(power.bounces,4);
  g.player.action={type:'low',time:.99,duration:1,fired:false};tick(g,{});assert.equal(g.projectiles.length,2);const b=g.projectiles[0];assert.equal(b.bounces,4);assert.equal(b.chainRange,480);
  g.projectiles=[b];finish(g,b);assert.deepEqual(b.hitIds,['e0','e1','e0','e1','e0']);
});
test('the nearest living enemy can be an already hit victim; no lifetime blacklist',()=>{
  const g=fixture([600,850,1250]),b=emit(g,4);assert.deepEqual(finish(g,b),['e0','e1','e0','e1','e0']);assert.equal(g.room.enemies[2].hp,100000);
});
test('a lone enemy cannot reflect onto itself, and distant/dead enemies are not candidates',()=>{
  for(const xs of [[600],[600,1200]]){const g=fixture(xs),b=emit(g,30);assert.deepEqual(finish(g,b),['e0']);assert.equal(g.room.enemies[0].hp,99990);}
  const g=fixture([600,850]);g.room.enemies[1].hp=0;const b=emit(g,10);assert.deepEqual(finish(g,b),['e0']);
});
test('bounce range is measured in both axes and includes the configured boundary',()=>{
  // The first hit knocks e0 from 600 to 608; the boundary is 608 + 480.
  const inside=fixture([600,608+LOWER_CHAIN_RANGE]),a=emit(inside,1);assert.deepEqual(finish(inside,a),['e0','e1']);
  const outside=fixture([600,609+LOWER_CHAIN_RANGE]),b=emit(outside,1);assert.deepEqual(finish(outside,b),['e0']);
  const vertical=fixture([600,610]);vertical.room.enemies[1].y=FLOOR-490;const c=emit(vertical,1);assert.deepEqual(finish(vertical,c),['e0']);
});
test('overlapping bodies alternate with an 80ms hop interval, never every physics frame',()=>{
  const g=fixture([600,600]),b=emit(g,6),times=[];let count=0;
  for(let i=0;i<240&&g.projectiles.includes(b);i++){tick(g,{});if(b.hitIds.length>count){assert.equal(b.hitIds.length,count+1);times.push(g.time);count++;}}
  assert.deepEqual(b.hitIds,['e0','e1','e0','e1','e0','e1','e0']);assert.equal(g.projectiles.length,0);
  for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=CHAIN_HIT_INTERVAL-1e-9);
});
test('if the locked target dies in flight, retarget nearby without spending another bounce',()=>{
  const g=fixture([600,850,950]),b=emit(g,2);while(!b.hitIds.length)tick(g,{});assert.equal(b.targetId,'e1');assert.equal(b.bounces,1);g.room.enemies[1].hp=0;tick(g,{});assert.equal(b.targetId,'e2');assert.equal(b.bounces,1);assert.deepEqual(finish(g,b),['e0','e2','e0']);
  const h=fixture(),c=emit(h,10);while(!c.hitIds.length)tick(h,{});h.room.enemies[1].hp=0;assert.deepEqual(finish(h,c),['e0']);
});
test('one low projectile can revisit and kill targets but death/coins are awarded once',()=>{
  const g=fixture(),b=emit(g,10);g.room.enemies.forEach(e=>e.hp=e.maxHp=20);assert.deepEqual(finish(g,b),['e0','e1','e0','e1']);assert.equal(g.stats.kills,2);assert.equal(g.coins,4);
});
test('slow chains renew enough flight time and survive a long valid hop',()=>{
  const g=fixture([600,1000]),b=emit(g,2,{x:575,vx:100,speed:100,life:.02});tick(g,{});assert.ok(b.life>4);assert.deepEqual(finish(g,b,12),['e0','e1','e0']);
});
test('normal piercing shots still hit each target at most once for their whole lifetime',()=>{
  const g=fixture(),b=emit(g,0,{homing:false,pierce:5});while(b.hitIds.length<2)tick(g,{});b.vx=-1000;finish(g,b);assert.deepEqual(b.hitIds,['e0','e1']);assert.equal(g.room.enemies[0].hp,99990);assert.equal(g.room.enemies[1].hp,99990);
});
