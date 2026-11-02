import test from "node:test";
import assert from "node:assert/strict";
import { advanceButterGait, butterFootPose, butterUpperPose } from "../butter-motion.js";

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
  advanceButterGait(gait, 36.25, 0, 1, 0.1);
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
