import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,fire,aimAt,tick,chooseUpgrade,gainXP,xpNeeded,toggleKing,nextStage,recall,UPGRADES,BOARD,damageEnemy,hasFusion,preview} from '../bonk-engine.js';
import {play} from '../tools/playtest-bonk48.mjs';
import {HERO_PRESENTATION} from '../bonk-renderer.js';
import {BUTTER_ORIGINAL,butterReleasePoint} from '../butter-original-motion.js';
const step=(g,n)=>{for(let i=0;i<n;i++)tick(g,1/120);};
function reward(g,id){g.pending++;g.phase='reward';g.choices=[id];g.afterReward='enemy';assert.equal(chooseUpgrade(g,id),true);g.phase='aim';}
function shotScene(){const g=createGame(48);g.pegs=[];g.enemies=[{id:10,type:'fan',x:400,y:400,r:32,hp:100,maxHp:100,anim:0,dead:false,flash:0},{id:11,type:'fan',x:500,y:400,r:32,hp:100,maxHp:100,anim:0,dead:false,flash:0}];fire(g);const b=g.queue[2].ball;g.queue=[];g.balls=[b];Object.assign(b,{x:400,y:445,vx:0,vy:-1080});return{g,b};}
test('boards and rewards reproduce by seed; eight upgrades and four stages are bounded',()=>{
  const a=createGame('48'),b=createGame('48');assert.deepEqual(a.enemies,b.enemies);assert.deepEqual(a.pegs,b.pegs);assert.notDeepEqual(a.pegs,createGame('other').pegs);assert.equal(Object.keys(UPGRADES).length,8);for(const p of a.pegs)assert.ok(p.x>BOARD.left&&p.x<BOARD.right);
});
test('aim is free, a shot commits once, preview does not consume RNG or move enemies',()=>{
  const g=createGame(48),positions=()=>g.enemies.map(({x,y,hp})=>({x,y,hp})),before=positions();step(g,1200);assert.equal(g.turn,1);assert.deepEqual(positions(),before);const a=preview(g),b=preview(g);assert.deepEqual(a,b);assert.equal(fire(g),true);assert.equal(fire(g),false);assert.equal(aimAt(g,50,50),false);assert.equal(g.queue.length,3);assert.equal(g.queue.filter(q=>q.ball.low).length,1);
});
test('physics reflects walls and pegs without tunnelling; flights always terminate',()=>{
  const {g,b}=shotScene();b.low=false;b.x=BOARD.left+10;b.y=600;b.vx=-1080;b.vy=0;tick(g,1/30);assert.ok(b.vx>0);assert.ok(b.x>=BOARD.left+b.r);step(g,900);assert.notEqual(g.phase,'flight');assert.ok(g.turn>=2);
});
test('low chains can return A-B-A, spend a finite level-scaled budget and stop homing',()=>{
  const {g,b}=shotScene();b.bounces=2;step(g,1);assert.equal(b.targetId,11);assert.equal(b.bounces,1);for(let n=0;n<120&&b.bounces>0;n++)tick(g,1/120);assert.equal(b.targetId,10);assert.equal(b.bounces,0);for(let n=0;n<120&&b.targetId!==null;n++)tick(g,1/120);assert.equal(b.targetId,null);
  const h=createGame(48);reward(h,'lower');fire(h);assert.equal(h.queue[2].ball.bounces,2);
});
test('splits create bounded non-recursive children and fusion enables their marks',()=>{
  const {g,b}=shotScene();reward(g,'split');reward(g,'split');reward(g,'mark');reward(g,'mark');assert.ok(hasFusion(g,'fireworks'));g.phase='flight';g.queue=[];g.balls=[b];b.contacts=3;step(g,1);assert.equal(b.split,true);assert.equal(g.balls.filter(b=>b.child).length,3);assert.ok(g.balls.length<=64);step(g,720);assert.notEqual(g.phase,'flight');
});
test('lethal damage and kill explosions cannot pay XP twice; excess XP queues every level',()=>{
  const g=createGame(48);g.inventory.bomb=3;g.enemies[1].x=g.enemies[0].x+20;g.enemies[1].y=g.enemies[0].y;g.enemies[1].hp=1;const e=g.enemies[0];damageEnemy(g,e,1000);const kills=g.kills,xp=g.xp;damageEnemy(g,e,1000);assert.equal(g.kills,kills);assert.equal(g.xp,xp);assert.ok(kills>=2);
  const h=createGame(48);gainXP(h,400);assert.equal(h.level,7);assert.equal(h.pending,6);assert.equal(h.xp,40);h.phase='reward';h.choices=['split','mark','lower'];h.afterReward='enemy';let claims=0;while(h.phase==='reward'){assert.ok(chooseUpgrade(h,h.choices[0]));claims++;}assert.equal(claims,6);assert.equal(h.phase,'enemy');assert.equal(chooseUpgrade(h,'split'),false);
});
test('king is earned, spent on firing, pierces pegs and scales from upper grade',()=>{
  const g=createGame(48);assert.equal(toggleKing(g),false);g.charge=100;reward(g,'upper');assert.equal(toggleKing(g),true);assert.equal(g.charge,100);fire(g);assert.equal(g.charge,0);const king=g.queue.find(q=>q.ball.king).ball;assert.equal(king.damage,36);assert.equal(king.r,33);assert.equal(g.action.type,'high');
});
test('enemy actions only resolve once after the volley, menus freeze, returning ball moves launcher',()=>{
  const g=createGame(48);g.phase='enemy';g.enemyClock=0;g.enemyResolved=false;g.turn=2;g.returnX=620;for(const e of g.enemies)e.fromY=e.y;step(g,150);assert.equal(g.hp,55);assert.equal(g.turn,3);assert.equal(g.launchX,620);assert.equal(g.phase,'aim');step(g,500);assert.equal(g.hp,55);g.phase='paused';const t=g.time;step(g,500);assert.equal(g.time,t);
});
test('recall advances the same enemy turn and cannot skip its cost; snack persists, fresh run resets',()=>{
  const g=createGame(48);reward(g,'snack');g.hp=40;g.turn=2;fire(g);assert.equal(recall(g),false);step(g,75);assert.equal(recall(g),true);step(g,150);assert.equal(g.turn,3);assert.equal(g.hp,35);assert.equal(g.maxHp,75);assert.deepEqual(createGame(48).inventory,{});
});
test('full legal-input solver reaches the boss and wins without granting stats or kills',()=>{
  const r=play('48');assert.equal(r.phase,'won');assert.ok(r.shots>3);assert.ok(r.best>=10);assert.ok(r.fusion);assert.ok(r.trace.some(t=>t.stage===4));
});
test('intact idle, shot and giant-slingshot cells fit the shared display anchor; releases match source',()=>{
  const h=HERO_PRESENTATION,s=h.size/112;for(const key of ['idle','shoot','high']){const c=BUTTER_ORIGINAL.clips[key],left=h.x-c.origin[0]*s,top=h.y+h.size*.28-c.origin[1]*s;assert.ok(left>=0&&top>=0);assert.ok(left+c.width*s<=BOARD.w);assert.ok(top+c.height*s<=BOARD.h);}
  const g=createGame(48);fire(g);assert.equal(g.queue[0].wait,butterReleasePoint('normal')*.45);
});
test('boss summons respect a seven-living-enemy cap even with one empty slot',()=>{
  const g=createGame(48);g.phase='next';nextStage(g);g.phase='next';nextStage(g);g.phase='next';nextStage(g);const template={...g.enemies[1]};while(g.enemies.length<6)g.enemies.push({...template,id:g.nextId++});g.phase='enemy';g.turn=2;g.enemyClock=0;g.enemyResolved=false;for(const e of g.enemies)e.fromY=e.y;step(g,100);assert.equal(g.enemies.filter(e=>!e.dead).length,7);
});
