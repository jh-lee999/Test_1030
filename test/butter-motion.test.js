import test from "node:test";
import assert from "node:assert/strict";
import {advanceButterGait,butterSpriteState,drawButterMotion,butterMuzzleOffset,BUTTER_STRIDE_DISTANCE,BUTTER_MODEL_LAYOUT} from "../butter-motion.js";
import {BUTTER_MUZZLES} from "../assets/butter-model-anchors.js";

const state=(phase=0,amount=1,action=null,facingX=0,facingY=1)=>({
  size:112,facingX,facingY,gait:{phase,amount,dx:facingX,dy:facingY},action
});
const shot=(time=.4,type="normal")=>({type,time,duration:1});

test("실제 리그에서 렌더한 12단계 보행을 이동 위상에 맞춰 재생한다",()=>{
  assert.deepEqual(Array.from({length:12},(_,i)=>butterSpriteState(state((i+.01)/12*Math.PI*2)).walkFrame),Array.from({length:12},(_,i)=>i));
  assert.equal(butterSpriteState(state(Math.PI*2)).walkFrame,0);
});

test("이동 사격은 걸음과 공격 위상을 독립적으로 고른다",()=>{
  for(const type of ["normal","low"])for(let i=0;i<12;i++){
    const moving=state((i+.01)/12*Math.PI*2),before=structuredClone(moving.gait);
    const frames=[.1,.4,.8].map(time=>butterSpriteState({...moving,action:shot(time,type)}));
    for(const frame of frames){assert.equal(frame.clip,"walkShoot");assert.equal(frame.walkFrame,i);}
    assert.equal(new Set(frames.map(f=>f.attackFrame)).size,3,"손동작이 걸음 프레임에 묻히면 안 된다");
    assert.deepEqual(moving.gait,before);
  }
});

test("네 방향은 각각 실촬영한 별도 프레임이며 좌우 반전을 쓰지 않는다",()=>{
  for(const [x,y,view,offset] of [[0,1,"down",0],[-1,0,"left",128],[1,0,"right",256],[0,-1,"up",384]]){
    const actual=butterSpriteState(state(0,0,null,x,y));
    assert.equal(actual.view,view);assert.equal(actual.index,offset);assert.equal(actual.flip,false);
  }
});

test("정지·보행·정지사격·이동사격·고학년은 올바른 클립을 고른다",()=>{
  for(const [moving,action,clip] of [[0,null,"idle"],[1,null,"walk"],[0,shot(),"shoot"],[1,shot(),"walkShoot"],[1,shot(.7,"high"),"high"]]){
    assert.equal(butterSpriteState(state(0,moving,action)).clip,clip);
  }
});

test("저학년 발사 시점을 평타 리그의 발사 시점에 맞춰 재시간화한다",()=>{
  const normal=butterSpriteState(state(0,0,shot(.55)));
  const low=butterSpriteState(state(0,0,shot(.5,"low")));
  assert.equal(normal.attackFrame,low.attackFrame);
  assert.equal(butterSpriteState(state(0,0,shot(10))).attackFrame,7);
});

test("뒤로 이동하면 걸음만 역재생하고 손의 장전 순서는 유지한다",()=>{
  const forward=state(Math.PI/2,1,shot(.4));
  const backward={...forward,gait:{...forward.gait,dy:-1}};
  assert.equal(butterSpriteState(forward).walkFrame,3);
  assert.equal(butterSpriteState(backward).walkFrame,9);
  assert.equal(butterSpriteState(forward).attackFrame,butterSpriteState(backward).attackFrame);
});

test("보행은 이동 거리를 따르고 멈추면 중립으로 돌아온다",()=>{
  const gait={phase:0,amount:0,dx:0,dy:1};
  advanceButterGait(gait,BUTTER_STRIDE_DISTANCE/4,0,1,.1);
  assert.ok(Math.abs(gait.phase-Math.PI/2)<.001);
  const phase=gait.phase;
  for(let i=0;i<60;i++)advanceButterGait(gait,0,0,0,1/60);
  assert.equal(gait.phase,phase);assert.equal(gait.amount,0);
});

test("모든 선택 좌표는 실제 128px 셀 범위 안에 있고 한 장으로 그린다",()=>{
  const calls=[],context={drawImage(...args){calls.push(args);}},atlas={};
  for(const [x,y] of [[0,1],[-1,0],[1,0],[0,-1]])for(let g=0;g<12;g++)for(let a=0;a<8;a++){
    const s=state((g+.01)/12*Math.PI*2,1,shot((a+.01)/8),x,y);
    const pose=butterSpriteState(s);
    assert.ok(pose.sx>=0&&pose.sx+128<=2048&&pose.sy>=0&&pose.sy+128<=4096);
    const count=calls.length;drawButterMotion(context,{atlas},s);
    assert.equal(calls.length,count+1);assert.equal(calls.at(-1)[0],atlas);
    assert.equal(calls.at(-1)[3],BUTTER_MODEL_LAYOUT.cell);assert.equal(calls.at(-1)[4],128);
  }
});

test("탄환은 선택한 리그 프레임의 실제 새총 끝에서 출발한다",()=>{
  assert.equal(BUTTER_MUZZLES.length,512);
  assert.equal(BUTTER_MUZZLES.filter(Boolean).length,500);
  for(const [x,y] of [[0,1],[-1,0],[1,0],[0,-1]])for(const type of ["normal","low","high"]){
    const s=state(Math.PI/2,1,shot(type==="high"?.68:type==="low"?.5:.55,type),x,y);
    const {index}=butterSpriteState(s),[mx,my]=BUTTER_MUZZLES[index];
    const actual=butterMuzzleOffset(s),size=s.size*1.42;
    assert.equal(actual.x,(mx-64)/128*size);
    assert.equal(actual.y,s.size*.28+(my-108)/128*size);
    const doubled=butterMuzzleOffset({...s,size:s.size*2});
    assert.equal(doubled.x,actual.x*2);assert.equal(doubled.y,actual.y*2);
  }
});
