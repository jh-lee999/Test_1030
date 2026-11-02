import test from "node:test";
import assert from "node:assert/strict";

import {
  CHARACTERS,
  ITEMS,
  ROOM_COUNT,
  applyItem,
  clamp,
  createRunState,
  damageState,
  distance,
  healState,
  lowerPower,
  rollItems,
  upperPower
} from "../survivor-engine.js";

test("버터와 코미는 서로 다른 평타 능력치로 시작한다", () => {
  const butter = createRunState("butter");
  const komi = createRunState("komi");
  assert.equal(ROOM_COUNT, 7);
  assert.equal(butter.characterId, "butter");
  assert.equal(komi.characterId, "komi");
  assert.equal(butter.projectileSpeed > 0, true);
  assert.equal(komi.projectileSpeed, 0);
  assert.equal(komi.maxHp > butter.maxHp, true);
  assert.equal(CHARACTERS.butter.attack, "새총");
  assert.equal(CHARACTERS.komi.attack, "베개 휘두르기");
});

test("아이템 선택지는 중복 없이 세 개를 제공한다", () => {
  const values = [0, 0.2, 0.55];
  let index = 0;
  const choices = rollItems(() => values[index++ % values.length]);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices).size, 3);
  choices.forEach((id) => assert.ok(ITEMS[id]));
});

test("공격 속도 아이템은 공격 간격을 감소시킨다", () => {
  const state = createRunState("butter");
  const upgraded = applyItem(state, "hot_candy");
  assert.equal(upgraded.attackCooldown, state.attackCooldown * 0.87);
  assert.equal(upgraded.inventory.hot_candy, 1);
  assert.equal(upgraded.itemsTaken, 1);
});

test("탄환 속도 아이템은 버터의 탄환을 빠르게 한다", () => {
  const state = createRunState("butter");
  const upgraded = applyItem(state, "fresh_band");
  assert.equal(upgraded.projectileSpeed, state.projectileSpeed * 1.2);
});

test("코미가 탄환 속도 아이템을 먹으면 평타 속도가 소폭 오른다", () => {
  const state = createRunState("komi");
  const upgraded = applyItem(state, "fresh_band");
  assert.equal(upgraded.projectileSpeed, 0);
  assert.equal(upgraded.attackCooldown < state.attackCooldown, true);
});

test("공격력과 이동 속도 아이템은 각각 능력치를 배율 강화한다", () => {
  const state = createRunState("butter");
  const damaged = applyItem(state, "sweet_carrot");
  const moved = applyItem(damaged, "speedy_shoes");
  assert.equal(damaged.damage, state.damage * 1.2);
  assert.equal(moved.moveSpeed, state.moveSpeed * 1.13);
});

test("체력 아이템은 최대 체력과 현재 체력을 함께 회복한다", () => {
  const state = createRunState("butter");
  state.hp = 30;
  const upgraded = applyItem(state, "milk_carton");
  assert.equal(upgraded.maxHp, state.maxHp + 24);
  assert.equal(upgraded.hp, 54);
});

test("같은 아이템을 여러 번 획득하면 중첩 수가 기록된다", () => {
  let state = createRunState("butter");
  state = applyItem(state, "hot_candy");
  state = applyItem(state, "hot_candy");
  assert.equal(state.inventory.hot_candy, 2);
  assert.equal(state.itemsTaken, 2);
});

test("저학년 아이템은 버터 유도탄 확률과 튕김 수를 늘린다", () => {
  const initial = createRunState("butter");
  const upgraded = applyItem(initial, "lower_book");
  const before = lowerPower(initial);
  const after = lowerPower(upgraded);
  assert.equal(upgraded.lowerGrade, 2);
  assert.equal(after.bounces, 2);
  assert.equal(after.chance > before.chance, true);
});

test("고학년 아이템은 버터 왕짱돌의 지속시간과 피해를 늘린다", () => {
  const initial = createRunState("butter");
  const upgraded = applyItem(initial, "upper_book");
  assert.equal(upgraded.upperGrade, 2);
  assert.equal(upperPower(upgraded).duration > upperPower(initial).duration, true);
  assert.equal(upperPower(upgraded).damage > upperPower(initial).damage, true);
});

test("저학년 아이템은 코미 낮잠의 회복과 반사 피해를 늘린다", () => {
  const initial = createRunState("komi");
  const upgraded = applyItem(initial, "lower_badge");
  assert.equal(lowerPower(upgraded).heal > lowerPower(initial).heal, true);
  assert.equal(lowerPower(upgraded).reflectDamage > lowerPower(initial).reflectDamage, true);
});

test("고학년 아이템은 코미 거대화 지속시간과 밟기 피해를 늘린다", () => {
  const initial = createRunState("komi");
  const upgraded = applyItem(initial, "upper_badge");
  assert.equal(upperPower(upgraded).duration > upperPower(initial).duration, true);
  assert.equal(upperPower(upgraded).damage > upperPower(initial).damage, true);
  assert.equal(upperPower(upgraded).scale > upperPower(initial).scale, true);
});

test("피해 감소와 회복 계산은 체력 범위를 지킨다", () => {
  let state = createRunState("komi");
  const hit = damageState(state, 20, 0.5);
  assert.equal(hit.damage, 10);
  assert.equal(hit.state.hp, state.hp - 10);
  state = hit.state;
  const healed = healState(state, 999);
  assert.equal(healed.state.hp, healed.state.maxHp);
});

test("유틸리티는 범위와 거리를 올바르게 계산한다", () => {
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});
