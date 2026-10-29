export const SAVE_VERSION = 2;
export const SLIME_GOAL = 5;

const clone = (value) => JSON.parse(JSON.stringify(value));

export function xpNeeded(level) {
  return 30 + level * 20;
}

export function createProgress() {
  return {
    version: SAVE_VERSION,
    level: 1,
    xp: 0,
    coins: 0,
    crystals: 0,
    potions: 2,
    maxHp: 100,
    attackDamage: 1,
    quest: "meet_luna",
    slimeKills: 0,
    slimeGoal: SLIME_GOAL,
    bossDefeated: false,
    completed: false
  };
}

export function restoreProgress(saved) {
  const fresh = createProgress();
  if (!saved || saved.version !== SAVE_VERSION) return fresh;
  return {
    ...fresh,
    ...saved,
    level: Math.max(1, Number(saved.level) || 1),
    coins: Math.max(0, Number(saved.coins) || 0),
    potions: Math.max(0, Number(saved.potions) || 0)
  };
}

export function gainExperience(current, amount) {
  const progress = clone(current);
  const previousLevel = progress.level;
  progress.xp += Math.max(0, amount);

  while (progress.xp >= xpNeeded(progress.level)) {
    progress.xp -= xpNeeded(progress.level);
    progress.level += 1;
    progress.maxHp += 15;
    progress.attackDamage += 1;
    progress.potions += 1;
  }

  return { progress, leveledUp: progress.level > previousLevel };
}

export function talkToLuna(current) {
  const progress = clone(current);
  let dialogue;

  if (progress.quest === "meet_luna") {
    progress.quest = "slime_hunt";
    dialogue = "숲의 그림자 슬라임 5마리가 마을로 오고 있어! 마법으로 막아줘.";
  } else if (progress.quest === "slime_hunt" && progress.slimeKills < progress.slimeGoal) {
    dialogue = `슬라임을 ${progress.slimeKills}마리 물리쳤어. 앞으로 ${progress.slimeGoal - progress.slimeKills}마리만 더 부탁해!`;
  } else if (progress.quest === "slime_hunt") {
    progress.quest = "boss";
    dialogue = "땅이 울리고 있어… 북쪽 폐허에 킹 슬라임이 나타났어!";
  } else if (progress.quest === "boss") {
    dialogue = "킹 슬라임은 북쪽 보랏빛 문 근처에 있어. 조심해!";
  } else if (progress.quest === "boss_done") {
    progress.quest = "complete";
    progress.completed = true;
    progress.coins += 100;
    const gained = gainExperience(progress, 80);
    dialogue = "마을을 구했구나! 오늘부터 넌 달빛 마을의 수호자야.";
    return { progress: gained.progress, dialogue, questCompleted: true, leveledUp: gained.leveledUp };
  } else {
    dialogue = "달빛 마을의 수호자님, 오늘도 좋은 모험을!";
  }

  return { progress, dialogue, questCompleted: false, leveledUp: false };
}

export function registerEnemyDefeat(current, type) {
  let progress = clone(current);
  let counted = false;
  const xp = type === "boss" ? 50 : 12;

  if (type === "slime" && progress.quest === "slime_hunt" && progress.slimeKills < progress.slimeGoal) {
    progress.slimeKills += 1;
    counted = true;
  }
  if (type === "boss") {
    progress.bossDefeated = true;
    progress.quest = "boss_done";
  }

  const gained = gainExperience(progress, xp);
  progress = gained.progress;
  return { progress, counted, leveledUp: gained.leveledUp, xp };
}

export function collectLoot(current, lootType, amount = 1) {
  const progress = clone(current);
  if (lootType === "coin") progress.coins += amount;
  if (lootType === "crystal") progress.crystals += amount;
  return progress;
}

export function usePotion(current, hp) {
  const progress = clone(current);
  if (progress.potions < 1 || hp >= progress.maxHp) return { progress, hp, used: false };
  progress.potions -= 1;
  return { progress, hp: Math.min(progress.maxHp, hp + 45), used: true };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
