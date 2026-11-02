import test from "node:test";
import assert from "node:assert/strict";
import { advanceButterGait, butterBodyPose, butterFootPose, butterUpperPoint, butterUpperPose, BUTTER_STRIDE_DISTANCE } from "../butter-motion.js";

test("정면과 후면에서 반 주기 뒤에는 반대 발이 앞으로 나온다", () => {
  for (const dy of [-1, 1]) {
    const view = dy < 0 ? "up" : "down";
    const forward = { dx: 0, dy };
    const facing = { x: 0, y: dy };
    const at = (phase, leg) => butterFootPose(phase, leg, 1, view, forward, facing);
    assert.ok(at(0, 0).y > at(0, 1).y);
    assert.ok(at(Math.PI, 0).y < at(Math.PI, 1).y);
    assert.ok(Math.abs(at(0, 0).y - at(Math.PI, 1).y) < 0.001);
  }
});

test("측면의 두 발은 번갈아 바닥을 딛고 들어 올린다", () => {
  const pose = (phase, leg) => butterFootPose(phase, leg, 1, "side", { dx: -1, dy: 0 }, { x: -1, y: 0 });
  assert.equal(pose(Math.PI / 2, 0).lift, 0);
  assert.ok(pose(Math.PI / 2, 1).lift > 0.9);
  assert.ok(pose(Math.PI * 1.5, 0).lift > 0.9);
  assert.equal(pose(Math.PI * 1.5, 1).lift, 0);
});

test("걷기는 이동 거리를 따라 연속 진행하고 멈추면 부드럽게 중립으로 돌아온다", () => {
  const gait = { phase: 0, amount: 0, dx: 0, dy: 1 };
  advanceButterGait(gait, BUTTER_STRIDE_DISTANCE / 4, 0, 1, 0.1);
  assert.ok(Math.abs(gait.phase - Math.PI / 2) < 0.001);
  const phase = gait.phase, amount = gait.amount;
  advanceButterGait(gait, 0, 0, 0, 1 / 60);
  assert.equal(gait.phase, phase);
  assert.ok(gait.amount > 0 && gait.amount < amount);
  for (let i = 0; i < 60; i++) advanceButterGait(gait, 0, 0, 0, 1 / 60);
  assert.equal(gait.amount, 0);
  const left = butterFootPose(gait.phase, 0, 0, "down", gait, { x: 0, y: 1 });
  const right = butterFootPose(gait.phase, 1, 0, "down", gait, { x: 0, y: 1 });
  assert.equal(left.x, right.x);
  assert.equal(left.y, right.y);
});

test("여러 번의 사격과 상체 포즈 전환은 하체의 보행 위상을 바꾸지 않는다", () => {
  const gait = { phase: 1.7, amount: 1, dx: 1, dy: 0 };
  const before = structuredClone(gait);
  for (const type of ["normal", "low"]) for (let t = 0; t <= 1; t += 0.01) {
    const pose = butterUpperPose({ type, time: t, duration: 1 });
    assert.ok(pose.mix >= 0 && pose.mix <= 1);
  }
  assert.deepEqual(gait, before);
});

test("달리기 중 뒤쪽 무릎은 충분히 접히고 상체는 지지 발에 맞춰 기울어진다", () => {
  const gait = { phase: Math.PI / 2, amount: 1, dx: -1, dy: 0 };
  const facing = { x: -1, y: 0 };
  const planted = butterFootPose(gait.phase, 0, 1, "side", gait, facing);
  const passing = butterFootPose(gait.phase, 1, 1, "side", gait, facing);
  assert.ok(planted.y - passing.y >= 20);
  const body = butterBodyPose(gait, "side", facing);
  assert.ok(body.roll < -0.06);
  assert.ok(body.hipY >= 0 && body.hipY <= 4.2);
});

test("정지하면 머리·머리카락·꼬리 변형이 모두 원래 위치로 돌아온다", () => {
  const gait = { phase: 2.1, amount: 0, dx: 1, dy: 0 };
  for (const view of ["down", "side", "up"]) {
    const body = butterBodyPose(gait, view, { x: 1, y: 0 });
    for (const [x, y] of [[160, 64], [72, 180], [126, 203], [160, 224]]) {
      const actual = butterUpperPoint(x, y, body, view);
      assert.ok(Math.abs(actual.x - x) < 0.001);
      assert.ok(Math.abs(actual.y - y) < 0.001);
    }
  }
});

test("한 주기 동안 상체 메시가 접히거나 뒤집히지 않는다", () => {
  const area = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for (const [view, x, y] of [["down",0,1],["side",-1,0],["up",0,-1]]) {
    for (let step=0;step<24;step++) {
      const gait={phase:step*Math.PI/12,amount:1,dx:x,dy:y};
      const body=butterBodyPose(gait,view,{x,y});
      for (let sy=16;sy<240;sy+=32) for(let sx=16;sx<304;sx+=32) {
        const points=[[sx,sy],[sx+32,sy],[sx+32,sy+32],[sx,sy+32]].map(([px,py])=>butterUpperPoint(px,py,body,view));
        assert.ok(area(points[0],points[1],points[2])>512);
        assert.ok(area(points[0],points[2],points[3])>512);
      }
    }
  }
});
