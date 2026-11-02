import test from "node:test";
import assert from "node:assert/strict";
import { advanceButterGait, butterSpriteState, drawButterMotion, BUTTER_STRIDE_DISTANCE } from "../butter-motion.js";

const state = (phase=0, amount=1, action=null, facingX=0, facingY=1) => ({
  size:112, facingX, facingY, gait:{phase,amount,dx:facingX,dy:facingY}, action
});

test("완성된 전신 네 자세가 왼발 접지·통과·오른발 접지·통과 순서로 재생된다", () => {
  assert.deepEqual([0,1,2,3].map(i=>butterSpriteState(state(i*Math.PI/2)).frame),[1,2,3,4]);
  assert.equal(butterSpriteState(state(Math.PI*2)).frame,1);
});

test("이동 사격은 걸음 위상을 초기화하거나 정지 사격 프레임으로 바꾸지 않는다", () => {
  for(const type of ["normal","low"])for(let frame=0;frame<16;frame++){
    const moving=state(frame*Math.PI/8);
    const before=structuredClone(moving.gait);
    const firing={...moving,action:{type,time:.4,duration:1}};
    assert.equal(butterSpriteState(firing).frame,butterSpriteState(moving).frame);
    assert.deepEqual(moving.gait,before);
  }
});

test("멈추면 발을 모은 중립 자세를 쓰고 고학년도 같은 캐릭터 시트를 쓴다", () => {
  assert.equal(butterSpriteState(state(1.4,0)).frame,0);
  assert.equal(butterSpriteState(state(1.4,0,{type:"normal",time:.4,duration:1})).frame,5);
  assert.equal(butterSpriteState(state(1.4,1,{type:"high",time:.4,duration:1})).frame,6);
});

test("위·아래·좌·우가 올바른 방향을 표시하고 오른쪽만 측면 원본을 반전한다", () => {
  for(const [x,y,row,flip] of [[0,1,0,false],[-1,0,1,false],[1,0,1,true],[0,-1,2,false]]){
    const actual=butterSpriteState(state(0,0,null,x,y));
    assert.equal(actual.row,row);assert.equal(actual.flip,flip);
  }
});

test("뒤로 이동할 때는 보행 순서를 역방향으로 재생한다", () => {
  const forward=state(Math.PI/2);
  const backward={...forward,gait:{...forward.gait,dy:-1}};
  assert.equal(butterSpriteState(forward).frame,2);
  assert.equal(butterSpriteState(backward).frame,4);
});

test("보행은 이동 거리를 따르고 멈추면 중립으로 돌아온다", () => {
  const gait={phase:0,amount:0,dx:0,dy:1};
  advanceButterGait(gait,BUTTER_STRIDE_DISTANCE/4,0,1,.1);
  assert.ok(Math.abs(gait.phase-Math.PI/2)<.001);
  const phase=gait.phase,amount=gait.amount;
  advanceButterGait(gait,0,0,0,1/60);
  assert.equal(gait.phase,phase);assert.ok(gait.amount<amount&&gait.amount>0);
  for(let i=0;i<60;i++)advanceButterGait(gait,0,0,0,1/60);
  assert.equal(gait.amount,0);
});

test("캐릭터는 다리 조각이나 메시 없이 전신 프레임 한 장으로 렌더된다", () => {
  for(const action of [null,{type:"normal",time:.4,duration:1},{type:"high",time:.4,duration:1}]){
    const calls=[];
    const context={save(){},restore(){},scale(){},translate(){},drawImage(...args){calls.push(args);}};
    const atlas={};
    drawButterMotion(context,{atlas},state(.3,1,action));
    assert.equal(calls.length,1);assert.equal(calls[0][0],atlas);
    assert.equal(calls[0][3],160);assert.equal(calls[0][4],160);
  }
});
