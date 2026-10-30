export const SAVE_VERSION = 4;
export const RUN_DURATION = 180;

export const WEAPON_LABELS = {
  common: "공용 증강",
  starbolt: "별마탄 특수",
  crescent: "초승달 특수",
  orbit: "공전 칼날 특수"
};

export const AUGMENTS = {
  twin_sigils: {
    name: "쌍둥이 인장",
    icon: "✦✦",
    rarity: "희귀",
    weapon: "starbolt",
    description: "별마탄이 1개 늘어나지만 피해량이 12% 감소합니다."
  },
  star_piercer: {
    name: "별을 꿰는 창",
    icon: "➳",
    rarity: "희귀",
    weapon: "starbolt",
    description: "별마탄이 적 2명을 추가로 관통합니다."
  },
  guided_star: {
    name: "추적하는 별",
    icon: "⌁",
    rarity: "희귀",
    weapon: "starbolt",
    description: "별마탄이 주변 적을 향해 궤도를 보정합니다."
  },
  star_supernova: {
    name: "초신성 주기",
    icon: "✺",
    rarity: "전설",
    weapon: "starbolt",
    description: "세 번째 원거리 공격마다 별마탄 8개를 방사합니다."
  },
  blood_moon: {
    name: "피의 초승달",
    icon: "☾",
    rarity: "희귀",
    weapon: "crescent",
    description: "초승달 참격으로 처치하면 체력을 3 회복합니다."
  },
  giant_crescent: {
    name: "거대 초승달",
    icon: "◖",
    rarity: "희귀",
    weapon: "crescent",
    description: "참격 범위가 40%, 참격 피해가 35% 증가합니다."
  },
  executioner: {
    name: "처형인의 궤적",
    icon: "⚔",
    rarity: "전설",
    weapon: "crescent",
    description: "체력이 22% 아래인 적을 참격으로 즉시 처형합니다."
  },
  point_blank_guard: {
    name: "근접 전투 본능",
    icon: "◆",
    rarity: "전설",
    weapon: "crescent",
    description: "참격 범위 안에 적이 있으면 방어력 5를 얻고 이동 속도가 증가합니다."
  },
  orbiting_blades: {
    name: "공전하는 칼날",
    icon: "☼",
    rarity: "전설",
    weapon: "common",
    description: "주위를 회전하며 적을 베는 칼날 2개를 생성합니다."
  },
  razor_orbit: {
    name: "과회전",
    icon: "⟳",
    rarity: "희귀",
    weapon: "orbit",
    requires: "orbitals",
    description: "공전 속도가 45%, 칼날 피해가 60% 증가합니다."
  },
  second_orbit: {
    name: "쌍성 궤도",
    icon: "☼☼",
    rarity: "전설",
    weapon: "orbit",
    requires: "orbitals",
    description: "공전 칼날을 2개 더 생성합니다."
  },
  rapid_ritual: {
    name: "신속한 의식",
    icon: "≋",
    rarity: "일반",
    weapon: "common",
    description: "모든 자동 공격의 재사용 대기시간이 20% 감소합니다."
  },
  glass_star: {
    name: "유리별 대포",
    icon: "◇",
    rarity: "전설",
    weapon: "common",
    description: "모든 피해량이 60% 증가하지만 최대 체력이 25 감소합니다."
  },
  soul_feast: {
    name: "영혼 포식",
    icon: "♥",
    rarity: "희귀",
    weapon: "common",
    description: "적을 처치할 때마다 체력을 2 회복합니다."
  },
  magnetic_field: {
    name: "별의 인력",
    icon: "◎",
    rarity: "일반",
    weapon: "common",
    description: "경험치 획득 범위가 2.2배 증가합니다."
  },
  fleet_step: {
    name: "바람걸음",
    icon: "➶",
    rarity: "일반",
    weapon: "common",
    description: "이동 속도가 24% 증가합니다."
  },
  arcane_echo: {
    name: "비전 메아리",
    icon: "◈",
    rarity: "전설",
    weapon: "common",
    description: "30% 확률로 별마탄 공격을 한 번 더 시전합니다."
  },
  heavy_comet: {
    name: "묵직한 혜성",
    icon: "●",
    rarity: "희귀",
    weapon: "starbolt",
    description: "별마탄 크기와 피해량이 35% 증가합니다."
  },
  frozen_heart: {
    name: "빙결의 심장",
    icon: "❄",
    rarity: "희귀",
    weapon: "common",
    description: "공격이 25% 확률로 적을 느리게 만듭니다."
  },
  thorn_skin: {
    name: "가시 갑옷",
    icon: "♠",
    rarity: "일반",
    weapon: "common",
    description: "받는 피해가 3 감소하고 접촉한 적에게 피해를 줍니다."
  },
  last_stand: {
    name: "최후의 저항",
    icon: "♛",
    rarity: "전설",
    weapon: "common",
    description: "체력이 35% 아래일 때 모든 피해량이 2배가 됩니다."
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function xpNeeded(level) {
  return 7 + Math.floor(Math.pow(level, 1.42) * 4);
}

export function createRunState() {
  return {
    version: SAVE_VERSION,
    level: 1,
    xp: 0,
    kills: 0,
    time: 0,
    hp: 100,
    maxHp: 100,
    damage: 12,
    cooldown: 0.68,
    projectileCount: 1,
    projectileSpeed: 520,
    projectileSize: 7,
    projectilePierce: 0,
    projectileHoming: 0,
    novaEvery: 0,
    meleeDamage: 22,
    meleeCooldown: 0.72,
    meleeRange: 76,
    meleeHealOnKill: 0,
    meleeExecute: 0,
    closeArmor: 0,
    moveSpeed: 205,
    pickupRadius: 72,
    armor: 0,
    healOnKill: 0,
    echoChance: 0,
    slowChance: 0,
    orbitals: 0,
    orbitalDamageMultiplier: 1,
    orbitalSpeedMultiplier: 1,
    thorns: 0,
    lowHealthMultiplier: 1,
    augments: []
  };
}

export function gainExperience(current, amount) {
  const state = clone(current);
  state.xp += Math.max(0, amount);
  let levelsGained = 0;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level += 1;
    levelsGained += 1;
  }
  return { state, levelsGained };
}

export function applyAugment(current, augmentId) {
  if (!AUGMENTS[augmentId] || current.augments.includes(augmentId)) return clone(current);
  const augment = AUGMENTS[augmentId];
  if (augment.requires === "orbitals" && current.orbitals < 1) return clone(current);
  const state = clone(current);
  state.augments.push(augmentId);

  switch (augmentId) {
    case "twin_sigils":
      state.projectileCount += 1;
      state.damage *= 0.88;
      break;
    case "star_piercer":
      state.projectilePierce += 2;
      break;
    case "guided_star":
      state.projectileHoming = 4.8;
      break;
    case "star_supernova":
      state.novaEvery = 3;
      break;
    case "blood_moon":
      state.meleeHealOnKill += 3;
      break;
    case "giant_crescent":
      state.meleeRange *= 1.4;
      state.meleeDamage *= 1.35;
      break;
    case "executioner":
      state.meleeExecute = 0.22;
      break;
    case "point_blank_guard":
      state.closeArmor += 5;
      state.moveSpeed *= 1.12;
      break;
    case "orbiting_blades":
      state.orbitals += 2;
      break;
    case "razor_orbit":
      state.orbitalSpeedMultiplier *= 1.45;
      state.orbitalDamageMultiplier *= 1.6;
      break;
    case "second_orbit":
      state.orbitals += 2;
      break;
    case "rapid_ritual":
      state.cooldown *= 0.8;
      state.meleeCooldown *= 0.8;
      break;
    case "glass_star":
      state.damage *= 1.6;
      state.meleeDamage *= 1.6;
      state.maxHp = Math.max(35, state.maxHp - 25);
      state.hp = Math.min(state.hp, state.maxHp);
      break;
    case "soul_feast":
      state.healOnKill += 2;
      break;
    case "magnetic_field":
      state.pickupRadius *= 2.2;
      break;
    case "fleet_step":
      state.moveSpeed *= 1.24;
      break;
    case "arcane_echo":
      state.echoChance += 0.3;
      break;
    case "heavy_comet":
      state.damage *= 1.35;
      state.projectileSize *= 1.35;
      break;
    case "frozen_heart":
      state.slowChance += 0.25;
      break;
    case "thorn_skin":
      state.armor += 3;
      state.thorns += 8;
      break;
    case "last_stand":
      state.lowHealthMultiplier = 2;
      break;
  }
  return state;
}

function requirementsMet(state, augment) {
  if (augment.requires === "orbitals") return state.orbitals > 0;
  return true;
}

export function rollAugments(current, random = Math.random, count = 3) {
  const available = Object.keys(AUGMENTS).filter((id) => (
    !current.augments.includes(id) && requirementsMet(current, AUGMENTS[id])
  ));
  const choices = [];
  const specials = available.filter((id) => AUGMENTS[id].weapon !== "common");

  if (specials.length && choices.length < count) {
    const index = Math.floor(random() * specials.length);
    const id = specials[index];
    choices.push(id);
    available.splice(available.indexOf(id), 1);
  }
  while (choices.length < count && available.length) {
    const index = Math.floor(random() * available.length);
    choices.push(available.splice(index, 1)[0]);
  }
  return choices;
}

export function takeDamage(current, rawDamage, bonusArmor = 0) {
  const state = clone(current);
  const damage = Math.max(1, rawDamage - state.armor - Math.max(0, bonusArmor));
  state.hp = Math.max(0, state.hp - damage);
  return { state, damage };
}

export function registerKill(current, source = "ranged") {
  const state = clone(current);
  state.kills += 1;
  const healing = state.healOnKill + (source === "melee" ? state.meleeHealOnKill : 0);
  if (healing > 0) state.hp = Math.min(state.maxHp, state.hp + healing);
  return state;
}

export function currentDamage(state) {
  return state.hp / state.maxHp <= 0.35 ? state.damage * state.lowHealthMultiplier : state.damage;
}

export function currentMeleeDamage(state) {
  return state.hp / state.maxHp <= 0.35 ? state.meleeDamage * state.lowHealthMultiplier : state.meleeDamage;
}

export function formatTime(seconds) {
  const remaining = Math.max(0, RUN_DURATION - seconds);
  const minutes = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return minutes + ":" + String(secs).padStart(2, "0");
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
