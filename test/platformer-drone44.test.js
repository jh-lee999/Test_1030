import test from 'node:test';
import assert from 'node:assert/strict';
import {updateDrone} from '../platformer-drone.js';
import {createGame,tick,hitEnemy} from '../platformer-engine.js';
function scene(x=600,playerX=300){
  const e={id:1,x,y:634,h:75,home:{y:634},facing:-1,cooldown:0,timer:0,mode:'idle',attackId:0},p={x:playerX,y:634,grounded:true},shots=[];
  const g={player:p,room:{width:2200,cleared:false}};
  const step=(n=1)=>{for(let i=0;i<n;i++){e.cooldown=Math.max(0,e.cooldown-1/120);updateDrone(g,e,1/120,(_g,source,angle)=>shots.push({x:source.x,y:source.y-source.h*.55,angle}));}};
  return{e,p,g,shots,step};
}
test('distant drones remain in place; entering detection range wakes them',()=>{
  const {e,p,step,shots}=scene(1700,150);step(600);assert.equal(e.x,1700);assert.equal(e.y,634);assert.equal(shots.length,0);
  p.x=1050;step(120);assert.equal(e.droneActive,true);assert.ok(e.x<1700);
});
test('settled player produces a stable hover instead of oscillating at an exact offset',()=>{
  const {e,step}=scene();step(1200);const x=e.x,y=e.y;step(600);assert.ok(Math.abs(e.x-x)<1);assert.ok(Math.abs(e.y-y)<1);assert.ok(e.attackId>=3);
  assert.ok(Math.abs((e.y-e.h*.55)-(634-60))<30,'ordinary horizontal fire can reach the flight lane');
});
test('jumping and falling do not pull the drone upward/downward with the player',()=>{
  const {e,p,step}=scene();e.cooldown=999;step(480);const lane=e.y;p.grounded=false;p.y=250;step(180);assert.ok(Math.abs(e.y-lane)<1);
  p.y=1000;step(180);assert.ok(e.y<634);p.grounded=true;p.y=500;step(480);assert.ok(Math.abs(e.y-466)<2);
});
test('aim origin, target and facing stay locked even if the player crosses during the warning',()=>{
  const {e,p,step,shots}=scene();for(let n=0;n<600&&e.mode!=='attack';n++)step();assert.equal(e.mode,'attack');const origin={x:e.x,y:e.y},target={...e.aimTarget},angle=e.aimAngle,facing=e.facing;
  p.x=950;p.y=400;p.grounded=false;step(90);assert.equal(e.x,origin.x);assert.equal(e.y,origin.y);assert.equal(e.facing,facing);assert.deepEqual(e.aimTarget,target);assert.equal(e.aimAngle,angle);assert.equal(shots.length,2);
  for(const shot of shots){assert.equal(shot.x,origin.x);assert.ok(Math.abs(shot.angle-angle)<=.121);}step(60);assert.ok(e.x!==origin.x||e.y!==origin.y);
});
test('crowding and crossing use bounded acceleration; edge drones can still attack',()=>{
  const {e,p,step}=scene(2100,2180);let oldVX=0;
  for(let n=0;n<480;n++){if(n===180)p.x=e.x-80;step();assert.ok(Math.abs(e.vx-oldVX)<=650/120+.01||e.mode==='attack');oldVX=e.vx;assert.ok(e.x>=30&&e.x<=2170);}
  assert.ok(e.attackId>0);
});
test('the reported seed no longer sends its first drone to the spawn from outside detection range',()=>{
  const g=createGame('1793682210169'),d=g.room.enemies.find(e=>e.type==='drone'),x=d.x;g.player.invulnerable=999;
  for(let n=0;n<960;n++)tick(g,{});assert.equal(d.x,x);assert.equal(d.attackId,0);
});
test('hitting roaming enemies outside their original platform never teleports them home',()=>{
  const g=createGame('1793682210169');for(const type of ['drone','rusher']){
    const e=g.room.enemies.find(e=>e.type===type);assert.ok(e);e.hp=100;e.x=600;e.home={x:1100,w:200,y:634};
    hitEnemy(g,e,10,8);assert.equal(e.x,608);assert.equal(e.hp,90);
    hitEnemy(g,e,10,-8);assert.equal(e.x,600);
  }
});
