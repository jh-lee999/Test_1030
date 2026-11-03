import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,hurtPlayer,grantItem,FLOOR} from '../platformer-engine.js';
import {lowerPower} from '../platformer-build.js';
function scene(){const g=createGame(45),floor={id:'floor',x:0,y:FLOOR,w:2500,ground:true};g.room.width=2500;g.room.platforms=[floor];g.room.hazards=[];g.room.marks=[];g.room.pickups=[];g.room.enemies=[{...g.room.enemies[0],id:1,type:'archer',x:1500,y:FLOOR,home:floor,hp:10000,maxHp:10000,w:44,h:94,cooldown:999,mode:'idle'}];g.random=()=>.99;return g;}
const step=(g,n,input={})=>{for(let i=0;i<n;i++)tick(g,input);};
test('holding fire cannot damage enemies beyond effective range, even with automatic low procs',()=>{
  const g=scene();step(g,600,{attack:true});assert.ok(g.shotsFired>=9);assert.ok(g.lowerProcs>0);assert.equal(g.room.enemies[0].hp,10000);assert.ok(g.projectiles.every(b=>b.x<=g.player.x+700));
  const range=g.stats.projectileRange;grantItem(g,'long_gloves');assert.equal(g.stats.projectileRange,range*1.25);
});
test('cover intercepts both teams bullets; repositioning beyond it allows a hit',()=>{
  const g=scene(),e=g.room.enemies[0];e.x=800;g.player.x=200;g.room.platforms.push({id:'cover',x:430,y:500,w:100,ground:true});
  const bullet=(owner,x,vx)=>({owner,x,y:570,vx,vy:0,r:6,life:2,damage:10,pierce:0,hitIds:[]});
  g.projectiles=[bullet('player',200,2000),bullet('enemy',800,-2000)];step(g,60);assert.equal(e.hp,10000);assert.equal(g.stats.hp,90);assert.equal(g.projectiles.length,0);
  g.projectiles=[bullet('player',600,2000)];step(g,20);assert.equal(e.hp,9990);
});
test('a real projectile avoided during dash awards one counter and the next shot spends it',()=>{
  const g=scene();g.player.x=300;g.projectiles=[{owner:'enemy',x:410,y:590,vx:-900,vy:0,r:10,life:1,damage:10}];
  tick(g,{dash:true});for(let i=0;i<20&&!g.perfectDodges;i++)tick(g,{});
  assert.equal(g.perfectDodges,1);assert.ok(g.player.counterCharge>0);assert.equal(g.stats.hp,90);hurtPlayer(g,10);assert.equal(g.perfectDodges,1);
  step(g,35,{attack:true});const b=g.projectiles.find(b=>b.owner==='player');assert.ok(b);assert.equal(b.homing,true);assert.equal(b.damage,lowerPower(g.stats).damage*1.5);assert.equal(g.player.counterCharge,0);
  assert.ok(g.soundEvents.includes('evade')&&g.soundEvents.includes('counter'));
});
test('empty dashes and pre-existing immunity cannot farm counter shots',()=>{
  const g=scene();tick(g,{dash:true});step(g,30);assert.equal(g.perfectDodges,undefined);assert.equal(g.player.counterCharge,0);
  g.player.dash=.1;g.player.skillTime=1;hurtPlayer(g,10);assert.equal(g.perfectDodges,undefined);
  g.player.skillTime=0;g.player.y=900;tick(g,{});assert.equal(g.perfectDodges,undefined);
});
test('compact first rooms reduce empty traversal while retaining mixed enemies',()=>{
  let total=0;for(let seed=0;seed<100;seed++){const g=createGame(seed);total+=g.room.width;assert.ok(new Set(g.room.enemies.map(e=>e.type)).size>=3);assert.equal(g.room.navigation.valid,true);}
  assert.ok(total/100<2800);
});
