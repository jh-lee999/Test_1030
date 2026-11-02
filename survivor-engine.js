export const SAVE_VERSION = 5;
export const ROOM_COUNT = 7;

export const CHARACTERS = {
  butter: {
    name: "버터",
    title: "새총을 든 말랑이",
    attack: "새총",
    maxHp: 90,
    damage: 15,
    attackCooldown: 0.46,
    projectileSpeed: 510,
    moveSpeed: 235,
    lowerName: "말썽 유도탄",
    upperName: "왕새총 짱돌"
  },
  komi: {
    name: "코미",
    title: "베개를 든 잠꾸러기",
    attack: "베개 휘두르기",
    maxHp: 125,
    damage: 24,
    attackCooldown: 0.7,
    projectileSpeed: 0,
    moveSpeed: 205,
    lowerName: "반사 낮잠",
    upperName: "거대 코미"
  }
};

export const ITEMS = {
  hot_candy: {
    name: "매운맛 사탕",
    icon: "🍬",
    stat: "attackSpeed",
    value: 0.13,
    description: "공격 속도 +13%"
  },
  alarm_clock: {
    name: "등교 알람시계",
    icon: "⏰",
    stat: "attackSpeed",
    value: 0.1,
    description: "공격 속도 +10%"
  },
  fresh_band: {
    name: "새 고무줄",
    icon: "➰",
    stat: "projectileSpeed",
    value: 0.2,
    description: "탄환 속도 +20%"
  },
  propeller_hat: {
    name: "프로펠러 모자",
    icon: "🎩",
    stat: "projectileSpeed",
    value: 0.15,
    description: "탄환 속도 +15%"
  },
  sweet_carrot: {
    name: "엄청 단 당근",
    icon: "🥕",
    stat: "damage",
    value: 0.2,
    description: "공격력 +20%"
  },
  mystery_sauce: {
    name: "수상한 특제소스",
    icon: "🫙",
    stat: "damage",
    value: 0.16,
    description: "공격력 +16%"
  },
  milk_carton: {
    name: "급식 우유",
    icon: "🥛",
    stat: "maxHp",
    value: 24,
    description: "최대 체력 +24, 즉시 회복"
  },
  emergency_snack: {
    name: "비상용 간식",
    icon: "🍞",
    stat: "maxHp",
    value: 18,
    description: "최대 체력 +18, 즉시 회복"
  },
  speedy_shoes: {
    name: "씽씽 실내화",
    icon: "👟",
    stat: "moveSpeed",
    value: 0.13,
    description: "이동 속도 +13%"
  },
  hall_pass: {
    name: "복도 통행증",
    icon: "🎫",
    stat: "moveSpeed",
    value: 0.1,
    description: "이동 속도 +10%"
  },
  lower_book: {
    name: "저학년 참고서",
    icon: "📒",
    stat: "lowerGrade",
    value: 1,
    description: "저학년 레벨 +1"
  },
  lower_badge: {
    name: "삐뚤빼뚤 명찰",
    icon: "📛",
    stat: "lowerGrade",
    value: 1,
    description: "저학년 레벨 +1"
  },
  upper_book: {
    name: "고학년 참고서",
    icon: "📕",
    stat: "upperGrade",
    value: 1,
    description: "고학년 레벨 +1"
  },
  upper_badge: {
    name: "반짝이는 완장",
    icon: "🏅",
    stat: "upperGrade",
    value: 1,
    description: "고학년 레벨 +1"
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createRunState(characterId = "butter") {
  const id = CHARACTERS[characterId] ? characterId : "butter";
  const character = CHARACTERS[id];
  return {
    version: SAVE_VERSION,
    characterId: id,
    room: 1,
    kills: 0,
    hp: character.maxHp,
    maxHp: character.maxHp,
    damage: character.damage,
    attackCooldown: character.attackCooldown,
    projectileSpeed: character.projectileSpeed,
    moveSpeed: character.moveSpeed,
    lowerGrade: 1,
    upperGrade: 1,
    inventory: {},
    itemsTaken: 0
  };
}

export function applyItem(current, itemId) {
  if (!ITEMS[itemId]) return clone(current);
  const state = clone(current);
  const item = ITEMS[itemId];
  state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
  state.itemsTaken += 1;

  switch (item.stat) {
    case "attackSpeed":
      state.attackCooldown = Math.max(0.13, state.attackCooldown * (1 - item.value));
      break;
    case "projectileSpeed":
      if (state.projectileSpeed > 0) state.projectileSpeed *= 1 + item.value;
      else state.attackCooldown = Math.max(0.13, state.attackCooldown * (1 - item.value * 0.45));
      break;
    case "damage":
      state.damage *= 1 + item.value;
      break;
    case "maxHp":
      state.maxHp += item.value;
      state.hp = Math.min(state.maxHp, state.hp + item.value);
      break;
    case "moveSpeed":
      state.moveSpeed *= 1 + item.value;
      break;
    case "lowerGrade":
      state.lowerGrade += item.value;
      break;
    case "upperGrade":
      state.upperGrade += item.value;
      break;
  }
  return state;
}

export function rollItems(random = Math.random, count = 3) {
  const ids = Object.keys(ITEMS);
  const choices = [];
  while (choices.length < count && ids.length) {
    const index = Math.floor(random() * ids.length);
    choices.push(ids.splice(index, 1)[0]);
  }
  return choices;
}

export function lowerPower(state) {
  if (state.characterId === "butter") {
    return {
      chance: Math.min(0.62, 0.13 + state.lowerGrade * 0.055),
      bounces: state.lowerGrade,
      homing: 7 + state.lowerGrade * 0.8
    };
  }
  return {
    heal: 14 + state.lowerGrade * 9,
    duration: 1.9 + state.lowerGrade * 0.3,
    reflectDamage: state.damage * (0.8 + state.lowerGrade * 0.32)
  };
}

export function upperPower(state) {
  if (state.characterId === "butter") {
    return {
      duration: 4.5 + state.upperGrade * 0.8,
      damage: state.damage * (2.5 + state.upperGrade * 0.55),
      radius: 40 + state.upperGrade * 4
    };
  }
  return {
    duration: 4 + state.upperGrade * 1.1,
    damage: state.damage * (1.15 + state.upperGrade * 0.3),
    scale: Math.min(2.35, 1.55 + state.upperGrade * 0.12)
  };
}

export function damageState(current, rawDamage, reduction = 0) {
  const state = clone(current);
  const damage = Math.max(1, Math.round(rawDamage * (1 - clamp(reduction, 0, 0.9))));
  state.hp = Math.max(0, state.hp - damage);
  return { state, damage };
}

export function healState(current, amount) {
  const state = clone(current);
  const before = state.hp;
  state.hp = Math.min(state.maxHp, state.hp + Math.max(0, amount));
  return { state, healed: state.hp - before };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
