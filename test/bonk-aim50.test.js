import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,BOARD,fire,aimAt,preview,tick} from '../bonk-engine.js';
import {AIM_CONTROL,aimAngle,createAimControl,cancelAim,setAimTarget,nudgeAim,requestAimShot,advanceAim,easeAngle} from '../bonk-aim.js';
const angle=(g,p=g.aim)=>Math.atan2(p.y-BOARD.launch.y,p.x-g.launchX);
const settle=(c,g,fps=60)=>{for(let i=0;i<fps*2;i++)advanceAim(c,g,1/fps);};

test('a large keyboard target eases without overshooting (not used for pointer tracking)',()=>{
  const g=createGame(50),c=createAimControl(g),before={...g.aim};setAimTarget(c,g,752,723);
  assert.deepEqual(g.aim,before);const goal=angle(g,c.target);let previous=angle(g);
  for(let i=0;i<120;i++){
    advanceAim(c,g,1/60);const now=angle(g);assert.ok(now>=previous-1e-12&&now<=goal+1e-12);
    assert.ok(now-previous<=AIM_CONTROL.maxSpeed/60+AIM_CONTROL.snap);previous=now;
  }
  assert.deepEqual(g.aim,{x:752,y:723});
});

test('angular easing is frame-rate independent, rate bounded and stable near the target',()=>{
  const results=[];
  for(const fps of [30,60,144]){let a=-2.7;for(let i=0;i<fps;i++)a=easeAngle(a,-.4,1/fps);results.push(a);}
  assert.ok(Math.max(...results)-Math.min(...results)<1e-12);
  assert.equal(easeAngle(-1,-.5,0),-1);assert.equal(easeAngle(-1,-.5,NaN),-1);
  assert.equal(easeAngle(-1,-1,.1),-1);assert.ok(easeAngle(-1,-.9,.01)<-.9);
});

test('all intermediate aim points stay legal from both returned launcher edges',()=>{
  for(const launchX of [80,400,720])for(const target of [{x:48,y:723},{x:752,y:723},{x:48,y:112},{x:752,y:112}]){
    const g=createGame(50);g.launchX=launchX;const c=createAimControl(g);setAimTarget(c,g,target.x,target.y);
    for(let i=0;i<180;i++){advanceAim(c,g,1/60);assert.ok(Number.isFinite(g.aim.x)&&Number.isFinite(g.aim.y));assert.ok(g.aim.x>=BOARD.left&&g.aim.x<=BOARD.right);assert.ok(g.aim.y>=BOARD.top&&g.aim.y<=BOARD.danger-55);}
    assert.deepEqual(g.aim,target);
  }
});

test('a buffered keyboard fire request locks one direction and fires on its preview ray',()=>{
  const g=createGame(50),c=createAimControl(g),target={x:80,y:720};setAimTarget(c,g,target.x,target.y);
  assert.equal(requestAimShot(c,g),true);assert.equal(requestAimShot(c,g),false);
  assert.equal(setAimTarget(c,g,750,120),false);assert.equal(nudgeAim(c,g,.1),false);
  assert.equal(advanceAim(c,g,0),false);let ready=false,frames=0;
  while(!ready&&frames++<120)ready=advanceAim(c,g,1/60);
  assert.equal(ready,true);assert.deepEqual(g.aim,target);const path=preview(g),expected=angle(g,target);
  assert.ok(Math.abs(Math.atan2(path[1].y-path[0].y,path[1].x-path[0].x)-expected)<1e-9);
  assert.equal(fire(g),true);assert.ok(Math.abs(Math.atan2(g.queue[0].ball.vy,g.queue[0].ball.vx)-expected)<1e-12);
  assert.ok(frames<60,'a worst-case request must not leave a long or indefinite input queue');
});

test('pause/cancel discards a buffered shot; new phases and launch positions reset the target',()=>{
  const g=createGame(50),c=createAimControl(g);setAimTarget(c,g,750,720);requestAimShot(c,g);advanceAim(c,g,1/60);
  cancelAim(c,g);g.phase='paused';assert.equal(advanceAim(c,g,10),false);g.phase='aim';settle(c,g);assert.equal(c.pending,false);assert.equal(g.shots,0);
  setAimTarget(c,g,48,720);g.phase='enemy';advanceAim(c,g,1/60);g.launchX=720;g.phase='aim';const before={...g.aim};settle(c,g);assert.deepEqual(g.aim,before);
});

test('keyboard steps are true small angular increments, including the fine modifier',()=>{
  const g=createGame(50),c=createAimControl(g),start=angle(g);
  nudgeAim(c,g,AIM_CONTROL.keyStep);settle(c,g);assert.ok(Math.abs(angle(g)-start-AIM_CONTROL.keyStep)<1e-12);
  const next=angle(g);nudgeAim(c,g,-AIM_CONTROL.fineStep);settle(c,g);assert.ok(Math.abs(angle(g)-next+AIM_CONTROL.fineStep)<1e-12);
  assert.ok(AIM_CONTROL.fineStep<AIM_CONTROL.keyStep);
});

test('input easing preserves enemies, stats, resources, RNG and engine-only diagnostic aim calls',()=>{
  const g=createGame(50),control=createGame(50),c=createAimControl(g),before=JSON.stringify({...g,aim:null});
  setAimTarget(c,g,700,200);settle(c,g);assert.equal(JSON.stringify({...g,aim:null}),before);
  assert.equal(g.rng(),control.rng());assert.equal(g.lootRng(),control.lootRng());
  aimAt(g,120,200);advanceAim(c,g,1/60);assert.deepEqual(g.aim,{x:120,y:200});assert.deepEqual(c.target,g.aim);
  fire(g);const shotAim={...g.aim};advanceAim(c,g,1/60);assert.deepEqual(g.aim,shotAim);
  tick(g,1/60);assert.equal(g.shots,1);assert.equal(aimAngle(g),angle(g));
});
