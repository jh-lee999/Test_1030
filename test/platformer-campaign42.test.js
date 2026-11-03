import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTS,generateWorld,generateRoom,STAGES} from '../platformer-world.js';
import {ITEMS} from '../platformer-build.js';
import {createGame,tick,chooseReward,chooseGoldReward,cashReward,enterNextRoom,chooseRoute,routeOptions,interactRoom,grantItem,rerollReward} from '../platformer-engine.js';
function fixture(depth){const g=createGame(42),node=g.world.nodes.find(n=>n.depth===depth);g.room=generateRoom(node);g.currentNodeId=node.id;return g;}
test('three regions have coherent biomes, different guardians and shops in every act',()=>{
  for(let seed=0;seed<50;seed++){
    const w=generateWorld(seed);assert.equal(STAGES,21);assert.equal(w.nodes.filter(n=>n.type==='boss').length,3);
    for(let act=0;act<3;act++){
      const nodes=w.nodes.filter(n=>n.act===act);assert.ok(nodes.every(n=>ACTS[act].biomes.includes(n.biome)));assert.equal(nodes.filter(n=>n.type==='shop').length,3);
      const room=generateRoom(nodes.find(n=>n.type==='boss'));assert.equal(room.enemies[0].type,['fan','archer','ghost'][act]);assert.ok(room.enemies[0].boss);
    }
  }
});
test('full 21-room run crosses two guardian gates, preserves inventory and wins only at final exit',()=>{
  const g=createGame(42);grantItem(g,'lower_book');let claims=1,bosses=0;
  for(let i=0;i<21;i++){
    assert.equal(g.room.index,i);g.room.enemies.forEach(e=>e.hp=0);
    if(g.room.shrine){Object.assign(g.player,{x:g.room.shrine.x,y:g.room.shrine.y,grounded:true});interactRoom(g);}else tick(g,{},0);
    if(g.phase==='reward'){
      if(g.room.type==='boss'){bosses++;assert.ok(g.choices.every(id=>ITEMS[id].rarity==='epic'));g.coins+=100;rerollReward(g);assert.ok(g.choices.every(id=>ITEMS[id].rarity==='epic'));assert.equal(chooseGoldReward(g),false);}
      chooseReward(g,g.choices[0]);claims++;
    }
    Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});assert.ok(enterNextRoom(g));
    assert.equal(g.phase,i===20?'won':'route');assert.equal(g.stats.itemsTaken,claims);
    if(i<20)assert.ok(chooseRoute(g,routeOptions(g)[0].id));
  }assert.equal(bosses,3);assert.ok(g.stats.inventory.lower_book);
});
test('guardians release distinct attacks and half-health phases add pressure',()=>{
  for(let act=0;act<3;act++)for(const enrage of [false,true]){
    const g=fixture(act*7+6),e=g.room.enemies[0];e.mode='attack';e.timer=enrage?.64:.94;if(enrage)e.hp=e.maxHp*.4;
    tick(g,{},.02);const shots=g.projectiles.filter(b=>b.owner==='enemy');assert.equal(shots.length,act===0?2:act===1?(enrage?8:5):(enrage?17:13));
    if(act===0){assert.equal(shots[0].vy,0);assert.equal(Math.abs(shots[0].vx),enrage?410:310);}
  }
});
test('danger zones warn before damage, stop in menus, allow jumping and turn off on clear',()=>{
  const g=fixture(7),h=g.room.hazards[0];assert.ok(h);g.room.enemies.forEach(e=>e.cooldown=999);Object.assign(g.player,{x:h.x,y:h.y,grounded:true,invulnerable:0});
  h.offset=0;h.clock=h.period-.7;tick(g,{},0);assert.equal(g.stats.hp,90);
  h.clock=h.period-.3;g.phase='map';tick(g,{},.02);assert.equal(h.clock,h.period-.3);assert.equal(g.stats.hp,90);
  g.phase='playing';g.player.y=h.y-80;tick(g,{},0);assert.equal(g.stats.hp,90);
  g.player.y=h.y;tick(g,{},0);assert.equal(g.stats.hp,80);
  g.room.cleared=true;g.player.invulnerable=0;tick(g,{},0);assert.equal(g.stats.hp,80);
});
test('crossing half health during a windup keeps its promised release time',()=>{
  const g=fixture(6),e=g.room.enemies[0];Object.assign(e,{mode:'attack',timer:.8,windup:.95,hp:e.maxHp*.4});
  tick(g,{},.02);assert.equal(g.projectiles.length,0);
  for(let i=0;i<7;i++)tick(g,{},.02);assert.equal(g.projectiles.length,2);
});
test('gold alternative gives route-dependent funds once, without acquiring an item',()=>{
  const g=fixture(2);g.room.rewardKind='gold';g.room.enemies.forEach(e=>e.hp=0);tick(g,{},0);const old=g.coins;assert.equal(cashReward(g),28);assert.ok(chooseGoldReward(g));assert.equal(g.coins,old+28);assert.equal(g.stats.itemsTaken,0);assert.equal(g.room.rewardTaken,true);assert.equal(chooseGoldReward(g),false);
});
