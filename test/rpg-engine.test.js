import test from "node:test";
import assert from "node:assert/strict";

import {
  SLIME_GOAL,
  clamp,
  collectLoot,
  createProgress,
  distance,
  gainExperience,
  registerEnemyDefeat,
  restoreProgress,
  talkToLuna,
  usePotion,
  xpNeeded
} from "../rpg-engine.js";

test("새 모험은 루나를 만나는 퀘스트로 시작한다", () => {
  const progress = createProgress();
  assert.equal(progress.quest, "meet_luna");
  assert.equal(progress.slimeGoal, SLIME_GOAL);
  assert.equal(progress.potions, 2);
  assert.equal(progress.level, 1);
});

test("루나와 첫 대화를 하면 슬라임 퀘스트가 시작된다", () => {
  const result = talkToLuna(createProgress());
  assert.equal(result.progress.quest, "slime_hunt");
  assert.match(result.dialogue, /슬라임 5마리/);
});

test("슬라임 처치는 활성 퀘스트에만 집계된다", () => {
  const beforeQuest = registerEnemyDefeat(createProgress(), "slime");
  assert.equal(beforeQuest.progress.slimeKills, 0);
  const active = talkToLuna(createProgress()).progress;
  const defeated = registerEnemyDefeat(active, "slime");
  assert.equal(defeated.progress.slimeKills, 1);
  assert.equal(defeated.counted, true);
});

test("목표 수만큼 처치한 뒤 루나와 대화하면 보스 퀘스트가 열린다", () => {
  let progress = talkToLuna(createProgress()).progress;
  progress.slimeKills = progress.slimeGoal;
  const result = talkToLuna(progress);
  assert.equal(result.progress.quest, "boss");
});

test("보스를 쓰러뜨리면 귀환 단계로 진행한다", () => {
  const progress = { ...createProgress(), quest: "boss" };
  const result = registerEnemyDefeat(progress, "boss");
  assert.equal(result.progress.bossDefeated, true);
  assert.equal(result.progress.quest, "boss_done");
});

test("경험치가 임계치를 넘으면 레벨과 능력치가 오른다", () => {
  const initial = createProgress();
  const result = gainExperience(initial, xpNeeded(1));
  assert.equal(result.progress.level, 2);
  assert.equal(result.progress.maxHp, 115);
  assert.equal(result.progress.attackDamage, 2);
  assert.equal(result.leveledUp, true);
});

test("물약은 체력을 회복하고 한 개를 소비한다", () => {
  const initial = createProgress();
  const result = usePotion(initial, 20);
  assert.equal(result.used, true);
  assert.equal(result.hp, 65);
  assert.equal(result.progress.potions, 1);
});

test("전리품 수집과 수학 유틸리티가 올바르게 동작한다", () => {
  const progress = collectLoot(createProgress(), "coin", 3);
  assert.equal(progress.coins, 3);
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(clamp(12, 0, 10), 10);
});

test("이전 버전 저장 데이터는 안전하게 초기화한다", () => {
  const progress = restoreProgress({ version: 1, level: 99 });
  assert.equal(progress.level, 1);
  assert.equal(progress.quest, "meet_luna");
});
