import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,fire,preview} from '../bonk-engine.js';
import {createAimControl,setAimTarget,setPointerAim,advanceAim,nudgeAim,requestAimShot} from '../bonk-aim.js';

test('pointer input is immediate and stays completely still for subsequent frames',()=>{
  const g=createGame(51),c=createAimControl(g);
  for(const point of [{x:750,y:720},{x:65,y:720},{x:400,y:130},{x:600,y:500}]){
    assert.equal(setPointerAim(c,g,point.x,point.y),true);assert.deepEqual(g.aim,point);
    const path=preview(g);for(let i=0;i<60;i++)advanceAim(c,g,1/60);
    assert.deepEqual(g.aim,point);assert.deepEqual(preview(g),path);
  }
});

test('a mouse click fires immediately along its exact ray, with no turn/charge delay',()=>{
  const g=createGame(51),c=createAimControl(g);setPointerAim(c,g,65,720);
  requestAimShot(c,g);assert.equal(advanceAim(c,g,0),true);assert.equal(fire(g),true);
  assert.ok(Math.abs(Math.atan2(g.queue[0].ball.vy,g.queue[0].ball.vx)-Math.atan2(720-856,65-400))<1e-12);
  assert.equal(g.shots,1);assert.equal(g.turn,1);
});

test('pointer replaces any unfinished keyboard target without retaining angular drift',()=>{
  const g=createGame(51),c=createAimControl(g);nudgeAim(c,g,.5);advanceAim(c,g,1/60);
  setPointerAim(c,g,120,180);assert.deepEqual(c.target,{x:120,y:180});
  for(const dt of [1/30,1/60,1/144])advanceAim(c,g,dt);assert.deepEqual(g.aim,{x:120,y:180});
  assert.equal(setPointerAim(c,g,NaN,120),false);assert.deepEqual(g.aim,{x:120,y:180});
});

test('keyboard-only buffering still locks its target, while pointer updates preserve resources and RNG',()=>{
  const g=createGame(51),control=createGame(51),c=createAimControl(g),before=JSON.stringify({...g,aim:null});
  setPointerAim(c,g,300,200);assert.equal(JSON.stringify({...g,aim:null}),before);
  assert.equal(g.rng(),control.rng());assert.equal(g.lootRng(),control.lootRng());
  setAimTarget(c,g,750,720);requestAimShot(c,g);assert.equal(setPointerAim(c,g,65,720),false);
  assert.deepEqual(c.target,{x:750,y:720});g.phase='paused';assert.equal(setPointerAim(c,g,65,720),false);
});
