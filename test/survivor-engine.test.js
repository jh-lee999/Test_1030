import test from "node:test";
import assert from "node:assert/strict";

import {
  AUGMENTS,
  RUN_DURATION,
  applyAugment,
  clamp,
  createRunState,
  currentDamage,
  distance,
  formatTime,
  gainExperience,
  registerKill,
  rollAugments,
  takeDamage,
  xpNeeded
} from "../survivor-engine.js";

test("새 게임은 3분 생존용 기본 능력치로 시작한다", () => {
  const state = createRunState();
  assert.equal(RUN_DURATION, 180);
  assert.equal(state.level, 1);
  assert.equal(state.hp, 100);
  assert.equal(state.projectileCount, 1);
  assert.deepEqual(state.augments, []);
});

test("경험치가 기준치를 넘으면 레벨이 오른다", () => {
  const state = createRunState();
  const result = gainExperience(state, xpNeeded(1) + 2);
  assert.equal(result.state.level, 2);
  assert.equal(result.state.xp, 2);
  assert.equal(result.levelsGained, 1);
});

test("증강 선택지는 중복 없이 세 개를 제공한다", () => {
  const state = createRunState();
  const randomValues = [0, 0.15, 0.35, 0.55];
  let index = 0;
  const choices = rollAugments(state, () => randomValues[index++ % randomValues.length]);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices).size, 3);
  choices.forEach((id) => assert.ok(AUGMENTS[id]));
});

test("이미 보유한 증강은 다시 선택지에 나오지 않는다", () => {
  const state = applyAugment(createRunState(), "fleet_step");
  const choices = rollAugments(state, () => 0);
  assert.equal(choices.includes("fleet_step"), false);
});

test("쌍둥이 인장은 투사체를 늘리고 피해량을 조정한다", () => {
  const initial = createRunState();
  const state = applyAugment(initial, "twin_sigils");
  assert.equal(state.projectileCount, 2);
  assert.equal(state.damage, initial.damage * 0.88);
});

test("유리별 대포는 공격력을 높이는 대신 최대 체력을 줄인다", () => {
  const state = applyAugment(createRunState(), "glass_star");
  assert.equal(state.damage, 12 * 1.65);
  assert.equal(state.maxHp, 75);
  assert.equal(state.hp, 75);
});

test("영혼 포식은 처치 시 체력을 회복한다", () => {
  let state = applyAugment(createRunState(), "soul_feast");
  state.hp = 50;
  state = registerKill(state);
  assert.equal(state.kills, 1);
  assert.equal(state.hp, 52);
});

test("방어력은 받는 피해를 줄이되 최소 피해 1은 유지한다", () => {
  const armored = applyAugment(createRunState(), "thorn_skin");
  assert.equal(takeDamage(armored, 10).damage, 7);
  assert.equal(takeDamage(armored, 2).damage, 1);
});

test("최후의 저항은 낮은 체력에서만 피해량을 두 배로 만든다", () => {
  let state = applyAugment(createRunState(), "last_stand");
  assert.equal(currentDamage(state), 12);
  state.hp = 30;
  assert.equal(currentDamage(state), 24);
});

test("타이머와 거리 유틸리티가 올바르게 동작한다", () => {
  assert.equal(formatTime(0), "3:00");
  assert.equal(formatTime(119.2), "1:00");
  assert.equal(formatTime(180), "0:00");
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(clamp(12, 0, 10), 10);
});
