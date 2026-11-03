import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,generateRoom,validateRoom,seedNumber,BIOMES,STAGES} from '../platformer-world.js';
import {createGame,tick,chooseRoute,routeOptions,chooseReward,enterNextRoom,interactRoom} from '../platformer-engine.js';
import {PHYSICS} from '../platformer-physics.js';

function finish(g){
  if(g.room.shrine){Object.assign(g.player,{x:g.room.shrine.x,y:g.room.shrine.y,grounded:true});interactRoom(g);}
  else{g.room.enemies.forEach(e=>e.hp=0);tick(g,{});}
  if(g.phase==='reward')chooseReward(g,g.choices[0]);Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});assert.equal(enterNextRoom(g),true);
}
test('1,000 seeded worlds: branching, merging, no orphan, every route ends at the boss',()=>{
  for(let seed=0;seed<1000;seed++){
    const world=generateWorld(seed),visited=new Set(),queue=[world.startId];
    while(queue.length){const id=queue.shift();if(visited.has(id))continue;visited.add(id);const node=world.nodes.find(n=>n.id===id);assert.ok(node);
      if(id===world.bossId){assert.equal(node.type,'boss');assert.equal(node.depth,STAGES-1);assert.equal(node.next.length,0);}
      else{assert.ok(node.next.length);for(const next of node.next){assert.equal(world.nodes.find(n=>n.id===next).depth,node.depth+1);queue.push(next);}}
    }assert.equal(visited.size,world.nodes.length);assert.ok(world.nodes.some(n=>n.next.length>1));assert.ok(world.nodes.some(n=>world.nodes.filter(p=>p.next.includes(n.id)).length>1));assert.ok(world.nodes.some(n=>n.type==='rest'));assert.ok(world.nodes.some(n=>n.type==='treasure'));
  }
});
test('1,000 seeds / every generated room: all platforms, enemies, loot, shrines and exits have paths',()=>{
  let rooms=0,fallbacks=0;const biomes=new Set(),widths=new Set(),counts=new Set();
  for(let seed=0;seed<1000;seed++)for(const node of generateWorld(seed).nodes){
    const room=generateRoom(node);rooms++;fallbacks+=Number(room.generation.fallback);assert.equal(room.navigation.valid,true);assert.equal(room.navigation.reachable.length,room.platforms.length);assert.equal(room.navigation.exitReachable.length,room.platforms.length);biomes.add(room.biome);widths.add(room.width);counts.add(room.platforms.length);
    assert.equal(room.enemies.length===0,['treasure','rest','shop'].includes(room.type));assert.ok(room.generation.attempt<=8);
  }assert.equal(biomes.size,Object.keys(BIOMES).length);assert.ok(widths.size>500);assert.ok(counts.size>=6);assert.ok(fallbacks/rooms<.02);console.log(`world47: ${rooms} rooms across 1,000 seeds; ${fallbacks} safe fallbacks; ${widths.size} widths; ${counts.size} platform counts`);
});
test('numeric/text seeds reproduce graph + geometry; combat and loot randomness cannot perturb rooms',()=>{
  assert.equal(seedNumber('42'),seedNumber(42));assert.deepEqual(generateWorld('버터'),generateWorld('버터'));
  const a=createGame('BUTTER-38'),b=createGame('BUTTER-38');assert.deepEqual(a.room,b.room);for(let i=0;i<999;i++){a.random();a.rewardRandom();}
  finish(a);finish(b);const id=routeOptions(a)[0].id;assert.equal(chooseRoute(a,id),true);assert.equal(chooseRoute(b,id),true);assert.deepEqual(a.room,b.room);
  assert.notDeepEqual(createGame('different').room.platforms,createGame('BUTTER-38').room.platforms);
  const fresh=createGame();assert.deepEqual(createGame(fresh.seedLabel).world,fresh.world);
});
test('jump witnesses execute in the live tick at base speed, including return paths',()=>{
  let checked=0;for(let seed=0;seed<20;seed++)for(const node of generateWorld(seed).nodes){
    const room=generateRoom(node),g=createGame(seed);g.room=room;room.enemies=[];room.cleared=true;g.stats.moveSpeed=235;
    for(const witness of [...room.navigation.witnesses,...room.navigation.returnWitnesses]){
      const from=room.platforms.find(p=>p.id===witness.from),to=room.platforms.find(p=>p.id===witness.to);
      Object.assign(g.player,{x:witness.startX,y:from.y,vx:0,vy:0,grounded:true,jumps:0,coyote:.1,jumpBuffer:0,dash:0,action:null});g.previous={};
      for(let frame=0;frame<witness.frames;frame++){
        const p=g.player,dx=witness.aimX-p.x,brake=p.vx*p.vx/(2*PHYSICS.braking),axis=Math.abs(dx)>brake+2?Math.sign(dx):0;
        tick(g,{left:axis<0,right:axis>0,jump:true,jumpPressed:frame===0},PHYSICS.step);
      }assert.equal(g.player.grounded,true);assert.equal(g.player.platformId,to.id);assert.ok(g.player.x>=to.x+18&&g.player.x<=to.x+to.w-18);checked++;
    }
  }assert.ok(checked>2000);console.log(`world45: ${checked} jump witnesses replayed through live physics`);
});
test('validator rejects unreachable geometry, unsupported loot and exit traps',()=>{
  const room=generateRoom(generateWorld(99).nodes[0]);room.platforms.push({id:'bad',x:100,y:0,w:150});assert.equal(validateRoom(room).valid,false);
  const other=generateRoom(generateWorld(99).nodes[0]);other.pickups.push({x:-100,y:0,platformId:'missing'});assert.equal(validateRoom(other).valid,false);
});
test('route UI state only accepts linked next rooms, cannot skip or claim a reward twice',()=>{
  const g=createGame(3);assert.equal(chooseRoute(g,g.world.bossId),false);finish(g);const options=routeOptions(g);assert.ok(options.length>=2);assert.equal(chooseRoute(g,g.world.bossId),false);assert.equal(chooseRoute(g,g.currentNodeId),false);assert.equal(chooseRoute(g,options[0].id),true);assert.equal(chooseRoute(g,options[1].id),false);assert.equal(g.room.index,1);
});
test('treasure must be opened nearby and rest heals once without an automatic free item',()=>{
  const g=createGame(5);finish(g);const treasure=routeOptions(g).find(n=>n.type==='treasure');chooseRoute(g,treasure.id);const old=g.stats.itemsTaken;tick(g,{});assert.equal(g.phase,'playing');assert.equal(interactRoom(g),false);
  Object.assign(g.player,{x:g.room.shrine.x,y:g.room.shrine.y,grounded:true});assert.equal(interactRoom(g),true);assert.equal(g.phase,'reward');chooseReward(g,g.choices[0]);assert.equal(interactRoom(g),false);assert.equal(g.stats.itemsTaken,old+1);
  const rest=g.world.nodes.find(n=>n.type==='rest');g.room=generateRoom(rest);g.currentNodeId=rest.id;g.stats.hp=10;Object.assign(g.player,{x:g.room.shrine.x,y:g.room.shrine.y,grounded:true});assert.equal(interactRoom(g),true);const hp=g.stats.hp;assert.equal(hp,10+Math.ceil(g.stats.maxHp*.4));assert.equal(interactRoom(g),false);assert.equal(g.stats.hp,hp);
});
test('falls recover to the last safe platform even during invulnerability; raised exits work',()=>{
  const g=createGame(8);g.player.y=900;g.player.invulnerable=1;const hp=g.stats.hp;tick(g,{});assert.equal(g.player.y,g.checkpoint.y);assert.equal(g.stats.hp,hp);assert.ok(g.player.grounded);
  g.player.invulnerable=0;g.player.y=900;tick(g,{});assert.equal(g.stats.hp,hp-8);
  g.room.enemies.forEach(e=>e.hp=0);tick(g,{});chooseReward(g,g.choices[0]);Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});assert.equal(enterNextRoom(g),true);
});
