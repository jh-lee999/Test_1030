import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,hitEnemy} from '../platformer-engine.js';
import {generateWorld,generateRoom} from '../platformer-world.js';
import {ENEMY_TYPES} from '../platformer-enemies.js';
import {attackWindup,reserveEnemyAttack} from '../platformer-threats.js';
function scene(type){
  const g=createGame(47,'barrage'),home={id:'arena',x:0,y:634,w:1600,ground:true};
  Object.assign(g.room,{width:1600,platforms:[home],hazards:[],pickups:[],marks:[]});
  const e={...ENEMY_TYPES[type],id:1,type,home,x:650,y:634,hp:1000,maxHp:1000,facing:-1,mode:'idle',timer:0,cooldown:0,clock:0,flash:0,death:0,attackId:0};g.room.enemies=[e];g.player.x=570;return {g,e};
}
const step=(g,n,input={})=>{for(let i=0;i<n;i++)tick(g,input);};
test('arenas preserve movement freedom and cluster pressure instead of isolated shooting islands',()=>{
  const layouts=new Set();for(let seed=0;seed<100;seed++)for(const n of generateWorld(seed).nodes.filter(n=>['combat','elite'].includes(n.type))){const r=generateRoom(n);layouts.add(r.arena.layout);assert.ok(r.width>=1450&&r.width<=1940);assert.equal(r.platforms[0].w,r.width);assert.equal(r.spawn.platformId,r.exit.platformId);assert.ok(r.enemies.filter(e=>e.home===r.platforms[0]).length>=4);assert.ok(new Set(r.enemies.map(e=>e.type)).size>=3);assert.equal(r.navigation.valid,true);assert.ok(r.enemies.every(e=>e.x-r.spawn.x>=340));}assert.equal(layouts.size,4);
});
test('archer tells commit their facing and ballistic aim; dodging behind avoids melee hitboxes',()=>{
  const {g,e}=scene('archer');tick(g,{});const angle=e.aimAngle;g.player.x=900;step(g,70);const shot=g.projectiles.find(b=>b.owner==='enemy');assert.ok(shot);assert.equal(e.facing,-1);assert.ok(Math.abs(Math.atan2(shot.vy,shot.vx)-angle)<1e-8);
  for(const type of ['fan','guard']){const {g,e}=scene(type);tick(g,{});assert.equal(e.mode,'attack');g.player.x=e.x+60;step(g,Math.ceil(attackWindup(e)*120)+2);assert.equal(e.facing,-1);assert.equal(g.stats.hp,90);assert.ok(e.exposedUntil>g.time);}
});
test('post-attack openings multiply primary damage but not skills and do not stay permanent',()=>{
  const {g,e}=scene('guard');e.exposedUntil=g.time+.6;hitEnemy(g,e,100,8);assert.equal(e.hp,850);hitEnemy(g,e,100,8,{skill:true,guardBreak:true});assert.equal(e.hp,750);g.time+=.7;hitEnemy(g,e,100,8);assert.equal(e.hp,725);
});
test('attack scheduling staggers tells, caps concurrent warnings and pauses with menus',()=>{
  const {g,e}=scene('archer');const other={...e,id:2,x:700},third={...e,id:3,x:750};g.room.enemies.push(other,third);
  tick(g,{});assert.equal(g.room.enemies.filter(e=>e.mode==='attack').length,1);step(g,34);assert.ok(g.room.enemies.filter(e=>e.mode==='attack'&&e.timer<attackWindup(e)).length<=2);
  for(const q of g.room.enemies)Object.assign(q,{mode:'attack',timer:0});g.room.nextAttackTime=0;assert.equal(reserveEnemyAttack(g,e),false);g.phase='paused';const before=structuredClone(g.room.enemies);step(g,100);assert.deepEqual(g.room.enemies,before);
});
test('reported seed has real early pressure without increasing enemy health or damage',()=>{
  const g=createGame('1793686699326','barrage');step(g,2400,{attack:true});assert.ok(g.stats.hp<90);assert.notEqual(g.phase,'reward');assert.equal(g.room.enemies.find(e=>e.type==='rusher').maxHp,65);
});
