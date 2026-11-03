import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,hitEnemy,hurtPlayer,chooseReward,grantItem,enterNextRoom,chooseRoute,routeOptions} from '../platformer-engine.js';
import {PATHS,skillCost} from '../platformer-paths.js';
import {rebuildStats,lowerPower,statRows,upperPower} from '../platformer-build.js';
function scene(style){const g=createGame(46,style),floor={id:'arena',x:0,y:634,w:3000,ground:true};g.room.width=3000;g.room.platforms=[floor];g.room.hazards=[];g.room.marks=[];g.room.pickups=[];g.room.enemies=[{...g.room.enemies[0],id:1,type:'archer',x:2300,y:634,w:44,h:94,home:floor,hp:10000,maxHp:10000,cooldown:999,mode:'idle'}];g.random=()=>.99;return g;}
const step=(g,n,input={})=>{for(let i=0;i<n;i++)tick(g,input);};
test('three locked paths change actual basic fire, not just the names',()=>{
  const r=scene('ricochet');step(r,190,{attack:true});assert.ok(r.basicShots>=3);assert.ok(r.lowerProcs>=1);
  const b=scene('barrage');step(b,190,{attack:true});assert.ok(b.basicShots>r.basicShots);step(b,160,{attack:true});assert.ok(b.player.heat>20);
  const h=scene('boulder');step(h,160,{attack:true});assert.equal(h.shotsFired,0);tick(h,{});step(h,30);assert.equal(h.shotsFired,1);const shot=h.projectiles[0];assert.ok(shot);assert.ok(shot.damage>40);assert.ok(shot.guardBreak);assert.ok(shot.pierce>=1);
});
test('overheat punishes holding down fire, while release cools and skill resets it',()=>{
  const g=scene('barrage');for(let i=0;i<600&&!g.player.overheated;i++)tick(g,{attack:true});assert.equal(g.player.overheated,true);const shots=g.shotsFired;step(g,20,{attack:true});assert.equal(g.shotsFired,shots);step(g,260);assert.equal(g.player.overheated,false);assert.ok(g.player.heat<30);
});
test('focus must be earned in combat and the three high skills produce distinct attacks',()=>{
  for(const style of Object.keys(PATHS)){
    const g=scene(style);step(g,240);assert.equal(g.player.focus,25);tick(g,{skill:true});assert.equal(g.skillCasts,undefined);
    const e=g.room.enemies[0];for(let i=0;i<10;i++){hitEnemy(g,e,1);step(g,31);}assert.ok(g.player.focus>=60);g.previous={};tick(g,{skill:true});assert.equal(g.skillCasts,1);step(g,85);
    if(style==='boulder'){assert.equal(g.boulders.length,1);assert.ok(g.boulders[0].r>40);}else{assert.equal(g.projectiles.length,style==='ricochet'?3:8);assert.ok(g.projectiles.every(b=>Boolean(b.homing)===(style==='ricochet')));}
  }
});
test('elite awakening is a one-way choice with real costs and persists between rooms',()=>{
  const g=scene('ricochet');g.room.type='elite';g.room.enemies.forEach(e=>e.hp=0);tick(g,{});assert.equal(g.rewardMode,'awakening');assert.deepEqual(g.choices,['echo','predator','overload']);assert.ok(chooseReward(g,'echo'));assert.equal(g.stats.awakening,'echo');assert.equal(g.stats.maxHp,77);assert.equal(g.stats.hp,77);assert.equal(chooseReward(g,'overload'),false);
  g.room.cleared=g.room.rewardTaken=true;Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});enterNextRoom(g);chooseRoute(g,routeOptions(g)[0].id);assert.equal(g.stats.awakening,'echo');grantItem(g,'milk_carton');assert.equal(g.stats.awakening,'echo');assert.equal(createGame(46,'ricochet').stats.awakening,null);
});
test('predator rewards close hits only and overload trades incoming damage for cheaper casts',()=>{
  const g=scene('boulder');g.stats=rebuildStats({...g.stats,awakening:'predator'});g.stats.hp=30;const e=g.room.enemies[0];hitEnemy(g,e,10);assert.equal(g.stats.hp,30);e.x=g.player.x+100;step(g,80);hitEnemy(g,e,10);assert.equal(g.stats.hp,33);hitEnemy(g,e,10);assert.equal(g.stats.hp,33);
  const h=scene('ricochet');h.stats=rebuildStats({...h.stats,awakening:'overload'});assert.ok(skillCost(h.stats)<60);hurtPlayer(h,10);assert.equal(h.stats.hp,77);
});
test('charge retains lower-grade proc rules and rewards a full hit with more focus',()=>{
  const g=scene('boulder');g.player.lowerDryShots=lowerPower(g.stats).pity;step(g,110,{attack:true});tick(g,{});step(g,30);assert.equal(g.lowerProcs,1);const shot=g.projectiles[0];assert.ok(shot.homing);assert.equal(shot.focusGain,12);
  const e=g.room.enemies[0],before=g.player.focus;hitEnemy(g,e,shot.damage,0,{focusGain:shot.focusGain});assert.equal(g.player.focus,before+12);step(g,31);hitEnemy(g,e,1,0,{skill:true});assert.equal(g.player.focus,before+12);
});
test('deliberate venting cools faster than held fire; clean rooms award focus once',()=>{
  const a=scene('barrage'),b=scene('barrage');for(const g of [a,b])Object.assign(g.player,{heat:100,overheated:true,lastFire:-10});step(a,120,{attack:true});step(b,120);assert.equal(a.player.overheated,true);assert.equal(b.player.overheated,false);assert.ok(b.player.heat<20);
  const g=scene('ricochet');g.room.enemies.forEach(e=>e.hp=0);tick(g,{});assert.equal(g.player.focus,37);tick(g,{});assert.equal(g.player.focus,37);
});
test('skill and echo hits cannot automate predator healing or focus farming',()=>{
  const g=scene('boulder');g.stats=rebuildStats({...g.stats,awakening:'predator'});g.stats.hp=30;g.room.enemies[0].x=g.player.x+90;hitEnemy(g,g.room.enemies[0],1,0,{skill:true});assert.equal(g.stats.hp,30);assert.equal(g.player.focus,25);
});
test('displayed skill stats match each path and later item rebuilds preserve its tradeoffs',()=>{
  for(const style of Object.keys(PATHS)){const g=scene(style),read=()=>Object.fromEntries(statRows(g.stats).map(([id,label,value])=>[id,value]));assert.equal(read().focusCost,String(skillCost(g.stats)));assert.equal(read().highCount,(style==='ricochet'?3:style==='barrage'?8:upperPower(g.stats).count)+'개');grantItem(g,'upper_book');grantItem(g,'upper_book');assert.equal(g.stats.style,style);assert.ok(g.stats.upperGrade>=3);assert.ok(Number(read().highDamage)>0);}
});
test('barrage rewards the risky hot window with stronger real shots and focus, not an idle buff',()=>{
  const cold=scene('barrage'),hot=scene('barrage');hot.player.heat=70;hot.player.lastFire=0;for(const g of [cold,hot]){tick(g,{attack:true});while(!g.basicShots)tick(g,{attack:true});}
  const a=cold.projectiles[0],b=hot.projectiles[0];assert.equal(a.hot,false);assert.equal(b.hot,true);assert.ok(Math.abs(b.damage/a.damage-1.35)<1e-8);assert.equal(b.focusGain,6);assert.equal(a.focusGain,4);
});
test('invalid and prototype path identifiers never become playable styles',()=>{
  for(const style of ['unknown','constructor','__proto__']){const g=createGame(46,style);assert.equal(g.stats.style,null);assert.ok(Number.isFinite(g.stats.damage));}
});
