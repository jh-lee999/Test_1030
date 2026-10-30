export const SAVE_VERSION = 3;
export const RUN_DURATION = 180;

export const AUGMENTS = {
  twin_sigils: {
    name: "쌍둥이 인장",
    icon: "✦✦",
    rarity: "희귀",
    description: "투사체가 1개 늘어나지만 피해량이 12% 감소합니다."
  },
  rapid_ritual: {
    name: "신속한 의식",
    icon: "⌁",
    rarity: "일반",
    description: "자동 공격 재사용 대기시간이 22% 감소합니다."
  },
  glass_star: {
    name: "유리별 대포",
    icon: "◇",
    rarity: "전설",
    description: "피해량이 65% 증가하지만 최대 체력이 25 감소합니다."
  },
  soul_feast: {
    name: "영혼 포식",
    icon: "♥",
    rarity: "희귀",
    description: "적을 처치할 때마다 체력을 2 회복합니다."
  },
  magnetic_field: {
    name: "별의 인력",
    icon: "◎",
    rarity: "일반",
    description: "경험치 획득 범위가 2.2배 증가합니다."
  },
  fleet_step: {
    name: "바람걸음",
    icon: "➶",
    rarity: "일반",
    description: "이동 속도가 28% 증가합니다."
  },
  arcane_echo: {
    name: "비전 메아리",
    icon: "◈",
    rarity: "전설",
    description: "30% 확률로 자동 공격을 한 번 더 시전합니다."
  },
  heavy_comet: {
    name: "묵직한 혜성",
    icon: "●",
    rarity: "희귀",
    description: "투사체 크기와 피해량이 35% 증가합니다."
  },
  frozen_heart: {
    name: "빙결의 심장",
    icon: "❄",
    rarity: "희귀",
    description: "공격이 25% 확률로 적을 느리게 만듭니다."
  },
  orbiting_blades: {
    name: "공전하는 칼날",
    icon: "☼",
    rarity: "전설",
    description: "주위를 회전하며 적을 베는 칼날 2개를 생성합니다."
  },
  thorn_skin: {
    name: "가시 갑옷",
    icon: "♠",
    rarity: "일반",
    description: "받는 피해가 3 감소하고 접촉한 적에게 피해를 줍니다."
  },
  last_stand: {
    name: "최후의 저항",
    icon: "♛",
    rarity: "전설",
    description: "체력이 35% 아래일 때 피해량이 2배가 됩니다."
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
    moveSpeed: 205,
    pickupRadius: 62,
    armor: 0,
    healOnKill: 0,
    echoChance: 0,
    slowChance: 0,
    orbitals: 0,
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
  const state = clone(current);
  state.augments.push(augmentId);

  switch (augmentId) {
    case "twin_sigils":
      state.projectileCount += 1;
      state.damage *= 0.88;
      break;
    case "rapid_ritual":
      state.cooldown *= 0.78;
      break;
    case "glass_star":
      state.damage *= 1.65;
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
      state.moveSpeed *= 1.28;
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
    case "orbiting_blades":
      state.orbitals += 2;
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

export function rollAugments(current, random = Math.random, count = 3) {
  const available = Object.keys(AUGMENTS).filter((id) => !current.augments.includes(id));
  const choices = [];
  while (choices.length < count && available.length) {
    const index = Math.floor(random() * available.length);
    choices.push(available.splice(index, 1)[0]);
  }
  return choices;
}

export function takeDamage(current, rawDamage) {
  const state = clone(current);
  const damage = Math.max(1, rawDamage - state.armor);
  state.hp = Math.max(0, state.hp - damage);
  return { state, damage };
}

export function registerKill(current) {
  const state = clone(current);
  state.kills += 1;
  if (state.healOnKill > 0) state.hp = Math.min(state.maxHp, state.hp + state.healOnKill);
  return state;
}

export function currentDamage(state) {
  return state.hp / state.maxHp <= 0.35 ? state.damage * state.lowHealthMultiplier : state.damage;
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
