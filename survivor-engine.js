export const SAVE_VERSION = 5;
export const ROOM_COUNT = 10;

export const CARDINAL_DIRECTIONS = [
  { id: "north", dx: 0, dy: -1, opposite: "south" },
  { id: "east", dx: 1, dy: 0, opposite: "west" },
  { id: "south", dx: 0, dy: 1, opposite: "north" },
  { id: "west", dx: -1, dy: 0, opposite: "east" }
];

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
    icon: "clock",
    stat: "attackSpeed",
    value: 0.13,
    description: "공격 속도 +13%"
  },
  alarm_clock: {
    name: "등교 알람시계",
    icon: "clock",
    stat: "attackSpeed",
    value: 0.1,
    description: "공격 속도 +10%"
  },
  fresh_band: {
    name: "새 고무줄",
    icon: "projectile",
    stat: "projectileSpeed",
    value: 0.2,
    description: "탄환 속도 +20%"
  },
  propeller_hat: {
    name: "프로펠러 모자",
    icon: "projectile",
    stat: "projectileSpeed",
    value: 0.15,
    description: "탄환 속도 +15%"
  },
  sweet_carrot: {
    name: "엄청 단 당근",
    icon: "attack",
    stat: "damage",
    value: 0.2,
    description: "공격력 +20%"
  },
  mystery_sauce: {
    name: "수상한 특제소스",
    icon: "attack",
    stat: "damage",
    value: 0.16,
    description: "공격력 +16%"
  },
  milk_carton: {
    name: "급식 우유",
    icon: "heart",
    stat: "maxHp",
    value: 24,
    description: "최대 체력 +24, 즉시 회복"
  },
  emergency_snack: {
    name: "비상용 간식",
    icon: "snack",
    stat: "maxHp",
    value: 18,
    description: "최대 체력 +18, 즉시 회복"
  },
  speedy_shoes: {
    name: "씽씽 실내화",
    icon: "move",
    stat: "moveSpeed",
    value: 0.13,
    description: "이동 속도 +13%"
  },
  hall_pass: {
    name: "복도 통행증",
    icon: "move",
    stat: "moveSpeed",
    value: 0.1,
    description: "이동 속도 +10%"
  },
  lower_book: {
    name: "저학년 참고서",
    icon: "book-low",
    stat: "lowerGrade",
    value: 1,
    description: "저학년 레벨 +1"
  },
  lower_badge: {
    name: "삐뚤빼뚤 명찰",
    icon: "book-low",
    stat: "lowerGrade",
    value: 1,
    description: "저학년 레벨 +1"
  },
  upper_book: {
    name: "고학년 참고서",
    icon: "book-high",
    stat: "upperGrade",
    value: 1,
    description: "고학년 레벨 +1"
  },
  upper_badge: {
    name: "반짝이는 완장",
    icon: "book-high",
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
    currentRoomId: "0,0",
    roomsVisited: 1,
    keys: 1,
    bombs: 1,
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

export function roomId(x, y) {
  return x + "," + y;
}

export function generateFloor(random = Math.random, targetRooms = ROOM_COUNT) {
  const rooms = [{
    id: roomId(0, 0),
    x: 0,
    y: 0,
    type: "start",
    discovered: true,
    visited: true,
    unlocked: true,
    revealed: true
  }];
  const occupied = new Set([roomId(0, 0)]);

  while (rooms.length < Math.max(5, targetRooms)) {
    const candidates = [];
    for (const room of rooms) {
      for (const direction of CARDINAL_DIRECTIONS) {
        const x = room.x + direction.dx;
        const y = room.y + direction.dy;
        const id = roomId(x, y);
        if (!occupied.has(id)) candidates.push({ x, y, id });
      }
    }
    const selected = candidates[Math.floor(random() * candidates.length) % candidates.length];
    occupied.add(selected.id);
    rooms.push({
      ...selected,
      type: "normal",
      discovered: false,
      visited: false,
      unlocked: true,
      revealed: true
    });
  }

  const distanceFromStart = (room) => Math.abs(room.x) + Math.abs(room.y);
  const boss = rooms.slice(1).sort((a, b) => distanceFromStart(b) - distanceFromStart(a))[0];
  boss.type = "boss";
  const treasureCandidates = rooms.filter((room) => room.type === "normal");
  const treasure = treasureCandidates[Math.floor(random() * treasureCandidates.length) % treasureCandidates.length];
  treasure.type = "treasure";
  treasure.unlocked = false;

  const secretCandidates = [];
  for (const room of rooms) {
    for (const direction of CARDINAL_DIRECTIONS) {
      const x = room.x + direction.dx;
      const y = room.y + direction.dy;
      const id = roomId(x, y);
      if (occupied.has(id) || secretCandidates.some((candidate) => candidate.id === id)) continue;
      const adjacency = CARDINAL_DIRECTIONS.reduce((count, neighbor) => (
        count + (occupied.has(roomId(x + neighbor.dx, y + neighbor.dy)) ? 1 : 0)
      ), 0);
      secretCandidates.push({ id, x, y, adjacency });
    }
  }
  secretCandidates.sort((a, b) => b.adjacency - a.adjacency);
  const bestAdjacency = secretCandidates[0]?.adjacency || 1;
  const bestSecrets = secretCandidates.filter((candidate) => candidate.adjacency === bestAdjacency);
  const secret = bestSecrets[Math.floor(random() * bestSecrets.length) % bestSecrets.length];
  rooms.push({
    ...secret,
    type: "secret",
    discovered: false,
    visited: false,
    unlocked: true,
    revealed: false
  });

  return { rooms, startId: roomId(0, 0), bossId: boss.id, secretId: secret.id };
}

export function getAdjacentRoom(floor, sourceRoom, directionId, includeHidden = false) {
  const direction = CARDINAL_DIRECTIONS.find((entry) => entry.id === directionId);
  if (!direction || !sourceRoom) return null;
  return floor.rooms.find((room) => (
    room.x === sourceRoom.x + direction.dx &&
    room.y === sourceRoom.y + direction.dy &&
    (includeHidden || room.type !== "secret" || room.revealed)
  )) || null;
}

export function revealSecretAt(floor, sourceRoom, directionId) {
  const next = clone(floor);
  const source = next.rooms.find((room) => room.id === sourceRoom.id);
  const secret = getAdjacentRoom(next, source, directionId, true);
  if (!secret || secret.type !== "secret") return { floor: next, revealed: false };
  secret.revealed = true;
  secret.discovered = true;
  return { floor: next, revealed: true, secretId: secret.id };
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
