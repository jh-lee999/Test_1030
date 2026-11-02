import {
  CARDINAL_DIRECTIONS,
  CHARACTERS,
  ITEMS,
  applyItem,
  clamp,
  createRunState,
  damageState,
  distance,
  generateFloor,
  getAdjacentRoom,
  healState,
  lowerPower,
  revealSecretAt,
  rollItems,
  upperPower
} from "./survivor-engine.js?v=22";
import { drawButterFrame } from "./sprite-layout.js?v=22";

const LOGICAL = { width: 800, height: 1450 };
const WALL = 58;
const DOOR = { left: 320, right: 480, top: 42, bottom: 90 };
const ROOM_NAMES = ["뒤틀린 교실", "끝나지 않는 복도", "거꾸로 된 급식실", "낙서투성이 음악실", "셰이디의 장난감방"];

const canvas = document.querySelector("#game-canvas");
const stage = document.querySelector("#game-stage");
const ctx = canvas.getContext("2d");
const $ = (selector) => document.querySelector(selector);
const iconMarkup = (id) => "<svg class=\"ui-icon\" aria-hidden=\"true\"><use href=\"./assets/ui-icons.svg?v=22#" + id + "\"></use></svg>";

const heroAtlas = new Image();
let heroArtReady = false;
heroAtlas.decoding = "async";
heroAtlas.addEventListener("load", () => { heroArtReady = true; });
heroAtlas.src = "./assets/trickcal-heroes.webp?v=22";

const butterActionAtlases = {
  side: new Image(),
  down: new Image(),
  up: new Image()
};
let butterActionPartsLoaded = 0;
for (const [direction, filename] of [
  ["side", "butter-actions.webp"],
  ["down", "butter-actions-down.webp"],
  ["up", "butter-actions-up.webp"]
]) {
  butterActionAtlases[direction].decoding = "async";
  butterActionAtlases[direction].addEventListener("load", () => { butterActionPartsLoaded += 1; });
  butterActionAtlases[direction].src = "./assets/" + filename + "?v=22";
}

const butterWalkAtlas = new Image();
let butterWalkReady = false;
butterWalkAtlas.decoding = "async";
butterWalkAtlas.addEventListener("load", () => { butterWalkReady = true; });
butterWalkAtlas.src = "./assets/butter-walk.webp?v=22";

const ENEMY_TYPES = {
  jelly: { hp: 34, speed: 78, radius: 25, damage: 9, color: "#b984cd", accent: "#f2d6ff" },
  crayon: { hp: 25, speed: 108, radius: 20, damage: 7, color: "#ee8d7b", accent: "#ffe08b" },
  locker: { hp: 82, speed: 49, radius: 33, damage: 14, color: "#68a8b2", accent: "#b9eef1" },
  boss: { hp: 920, speed: 45, radius: 64, damage: 20, color: "#6b4a8b", accent: "#ffe16d" }
};

let run = createRunState("butter");
let floor;
let currentRoom;
let roomStates = new Map();
let player;
let enemies = [];
let projectiles = [];
let boulders = [];
let placedBombs = [];
let pickups = [];
let enemyShots = [];
let slashes = [];
let particles = [];
let numbers = [];
let started = false;
let paused = false;
let choosingItem = false;
let gameEnded = false;
let roomCleared = false;
let itemChoicePurpose = "treasure";
let attackTimer = 0;
let lowerCooldown = 0;
let upperCooldown = 0;
let sleepTimer = 0;
let giantTimer = 0;
let invulnerableTimer = 0;
let hurtTimer = 0;
let attackKick = 0;
let abilityPulse = 0;
let footstepTimer = 0;
let butterAction = null;
let elapsed = 0;
let lastTime = performance.now();
let viewWidth = 390;
let viewHeight = 700;
let dpr = 1;
let renderScale = 1;
let renderOffsetX = 0;
let renderOffsetY = 0;
let screenShake = 0;
let toastTimer;
let audioContext;
let selectedCharacter = "butter";
let enemyId = 0;

const keys = new Set();
const moveStick = { x: 0, y: 0, pointerId: null };
const aimStick = { x: 0, y: 0, pointerId: null };
const mouseAim = { x: 1, y: 0, firing: false, pointerId: null };

function resetGame(characterId = selectedCharacter) {
  run = createRunState(characterId);
  floor = generateFloor();
  roomStates = new Map();
  currentRoom = null;
  player = {
    x: LOGICAL.width / 2,
    y: LOGICAL.height - 225,
    radius: characterId === "komi" ? 31 : 27,
    facingX: 0,
    facingY: -1,
    moving: false,
    phase: 0
  };
  projectiles = [];
  boulders = [];
  placedBombs = [];
  butterAction = null;
  pickups = [];
  enemyShots = [];
  slashes = [];
  particles = [];
  numbers = [];
  attackTimer = 0;
  lowerCooldown = 0;
  upperCooldown = 0;
  sleepTimer = 0;
  giantTimer = 0;
  invulnerableTimer = 0;
  hurtTimer = 0;
  attackKick = 0;
  abilityPulse = 0;
  footstepTimer = 0;
  roomCleared = false;
  choosingItem = false;
  gameEnded = false;
  paused = false;
  loadRoom(floor.rooms.find((room) => room.id === floor.startId));
  renderInventory();
  updateHud();
  updateAbilityHud();
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  viewWidth = Math.max(1, rect.width);
  viewHeight = Math.max(1, rect.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
  renderScale = Math.min(viewWidth / LOGICAL.width, viewHeight / LOGICAL.height);
  renderOffsetX = (viewWidth - LOGICAL.width * renderScale) / 2;
  renderOffsetY = (viewHeight - LOGICAL.height * renderScale) / 2;
}

function playTone(frequency, duration = 0.07, type = "sine", volume = 0.025) {
  if (!started) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio is optional.
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
}

function showRoomBanner() {
  const labels = {
    start: "시작방",
    normal: "전투방",
    treasure: "열쇠방",
    boss: "보스방",
    secret: "비밀방"
  };
  $("#room-kicker").textContent = labels[currentRoom.type] || "아공간";
  $("#room-title").textContent = currentRoom.type === "boss"
    ? "셰이디의 심술방"
    : currentRoom.type === "treasure"
      ? "잠긴 장난감방"
      : currentRoom.type === "secret"
        ? "벽 뒤의 비밀"
        : ROOM_NAMES[Math.abs(currentRoom.x * 3 + currentRoom.y * 5) % ROOM_NAMES.length];
  const banner = $("#room-banner");
  banner.classList.remove("show");
  void banner.offsetWidth;
  banner.classList.add("show");
}

function updateHud() {
  const hpPercent = clamp(run.hp / run.maxHp * 100, 0, 100);
  $("#health-fill").style.width = hpPercent + "%";
  $("#health-label").textContent = Math.ceil(run.hp) + " / " + Math.round(run.maxHp);
  $("#hero-name").textContent = CHARACTERS[run.characterId].name;
  $("#room-label").textContent = "탐색 " + run.roomsVisited + " / " + floor.rooms.length;
  $("#key-count").textContent = run.keys;
  $("#bomb-count").textContent = run.bombs;
  $("#bomb-label").textContent = "R · " + run.bombs;
  $("#bomb-button").disabled = run.bombs <= 0;
  $("#lower-level").textContent = "LV." + run.lowerGrade;
  $("#upper-level").textContent = "LV." + run.upperGrade;
  $("#portrait").classList.toggle("komi", run.characterId === "komi");
  renderMinimap();
}

function updateAbilityHud() {
  const character = CHARACTERS[run.characterId];
  $("#lower-name").textContent = character.lowerName;
  $("#upper-name").textContent = character.upperName;
  const lowerButton = $("#lower-ability");
  const upperButton = $("#upper-ability");

  if (run.characterId === "butter") {
    const power = lowerPower(run);
    $("#lower-icon").innerHTML = iconMarkup("slingshot");
    $("#lower-cooldown").textContent = Math.round(power.chance * 100) + "% · " + power.bounces + "튕김";
    lowerButton.disabled = true;
  } else {
    $("#lower-icon").innerHTML = iconMarkup("pillow");
    $("#lower-cooldown").textContent = lowerCooldown > 0 ? lowerCooldown.toFixed(1) + "s" : "READY";
    lowerButton.disabled = lowerCooldown > 0 || sleepTimer > 0;
  }
  $("#upper-icon").innerHTML = iconMarkup(run.characterId === "butter" ? "projectile" : "move");
  $("#upper-cooldown").textContent = upperCooldown > 0 ? upperCooldown.toFixed(1) + "s" : "READY";
  upperButton.disabled = upperCooldown > 0;
  lowerButton.classList.toggle("cooling", lowerCooldown > 0);
  upperButton.classList.toggle("cooling", upperCooldown > 0);
}

function renderInventory() {
  $("#item-strip").innerHTML = Object.entries(run.inventory).map(([id, count]) => {
    const item = ITEMS[id];
    return "<span class=\"item-chip\" title=\"" + item.name + " · " + item.description + "\">" +
      iconMarkup(item.icon) + (count > 1 ? "<b>" + count + "</b>" : "") + "</span>";
  }).join("");
}

function renderMinimap() {
  if (!floor) return;
  const map = $("#minimap");
  const visible = floor.rooms.filter((room) => room.discovered && (room.type !== "secret" || room.revealed));
  const layoutRooms = floor.rooms.filter((room) => room.type !== "secret");
  const minX = Math.min(...layoutRooms.map((room) => room.x));
  const maxX = Math.max(...layoutRooms.map((room) => room.x));
  const minY = Math.min(...layoutRooms.map((room) => room.y));
  const maxY = Math.max(...layoutRooms.map((room) => room.y));
  const step = Math.min(18, 78 / Math.max(1, maxX - minX), 64 / Math.max(1, maxY - minY));
  const centerX = 51 - (minX + maxX) * step / 2;
  const centerY = 44 - (minY + maxY) * step / 2;
  map.innerHTML = visible.map((room) => (
    "<span class=\"map-room " + (room.visited ? "visited " : "") + room.type +
      (room.unlocked ? " unlocked" : "") + (room.id === currentRoom?.id ? " current" : "") +
      "\" data-room-id=\"" + room.id + "\" data-x=\"" + room.x + "\" data-y=\"" + room.y +
      "\" style=\"left:" + (centerX + room.x * step) + "px;top:" + (centerY + room.y * step) + "px\"></span>"
  )).join("");
}

function discoverNeighbors(room) {
  for (const direction of CARDINAL_DIRECTIONS) {
    const adjacent = getAdjacentRoom(floor, room, direction.id);
    if (adjacent) adjacent.discovered = true;
  }
}

function saveCurrentRoom() {
  if (!currentRoom) return;
  const state = roomStates.get(currentRoom.id);
  if (!state) return;
  state.enemies = enemies;
  state.pickups = pickups;
  state.cleared = roomCleared;
  state.rewardTaken = state.rewardTaken || false;
}

function buildRoomState(room) {
  enemies = [];
  pickups = [];
  const depth = Math.max(1, run.roomsVisited);
  if (room.type === "boss") {
    createEnemy("boss", LOGICAL.width / 2, 410);
    createEnemy("jelly", 230, 600);
    createEnemy("jelly", 570, 600);
  } else if (room.type === "normal") {
    const count = 3 + Math.min(5, depth);
    for (let i = 0; i < count; i += 1) {
      let type = "jelly";
      if (depth >= 2 && i % 3 === 1) type = "crayon";
      if (depth >= 4 && i % 4 === 2) type = "locker";
      const column = i % 3;
      const row = Math.floor(i / 3);
      createEnemy(type, 180 + column * 220 + (row % 2) * 40, 310 + row * 220 + (i % 2) * 45);
    }
  }
  return {
    enemies,
    pickups,
    cleared: room.type === "start" || room.type === "treasure" || room.type === "secret",
    rewardTaken: false,
    entered: false
  };
}

function loadRoom(room, entryDirection = null) {
  saveCurrentRoom();
  currentRoom = room;
  run.currentRoomId = room.id;
  const firstVisit = !room.visited;
  if (firstVisit) {
    room.visited = true;
    run.roomsVisited += 1;
  }
  room.discovered = true;
  discoverNeighbors(room);
  let state = roomStates.get(room.id);
  if (!state) {
    state = buildRoomState(room);
    roomStates.set(room.id, state);
  }
  enemies = state.enemies;
  pickups = state.pickups;
  roomCleared = state.cleared;
  projectiles = [];
  boulders = [];
  placedBombs = [];
  projectiles = [];
  enemyShots = [];
  slashes = [];
  choosingItem = false;
  attackTimer = 0.15;
  if (entryDirection === "north") {
    player.x = LOGICAL.width / 2;
    player.y = LOGICAL.height - WALL - player.radius - 12;
  } else if (entryDirection === "south") {
    player.x = LOGICAL.width / 2;
    player.y = WALL + player.radius + 12;
  } else if (entryDirection === "east") {
    player.x = WALL + player.radius + 12;
    player.y = LOGICAL.height / 2;
  } else if (entryDirection === "west") {
    player.x = LOGICAL.width - WALL - player.radius - 12;
    player.y = LOGICAL.height / 2;
  } else {
    player.x = LOGICAL.width / 2;
    player.y = LOGICAL.height - 220;
  }
  state.entered = true;
  const transition = $("#room-transition");
  transition.classList.remove("play");
  void transition.offsetWidth;
  transition.classList.add("play");
  showRoomBanner();
  updateHud();
  if ((room.type === "treasure" || room.type === "secret") && !state.rewardTaken) {
    setTimeout(() => {
      if (currentRoom.id === room.id && !gameEnded) showItemChoices(room.type);
    }, 260);
  }
}

function createEnemy(type, x, y) {
  const template = ENEMY_TYPES[type];
  const roomScale = 1 + Math.max(0, run.roomsVisited - 1) * 0.1;
  enemies.push({
    id: ++enemyId,
    type,
    x,
    y,
    radius: template.radius,
    hp: template.hp * roomScale,
    maxHp: template.hp * roomScale,
    speed: template.speed * (1 + Math.max(0, run.roomsVisited - 1) * 0.02),
    damage: template.damage + Math.floor(Math.max(0, run.roomsVisited - 1) * 0.9),
    color: template.color,
    accent: template.accent,
    hitFlash: 0,
    attackCooldown: Math.random() * 0.4,
    reflectCooldown: 0,
    giantCooldown: 0,
    bossShotTimer: 0.7,
    phase: Math.random() * Math.PI * 2,
    dead: false
  });
}

function getMovement() {
  let x = moveStick.x;
  let y = moveStick.y;
  if (keys.has("a")) x -= 1;
  if (keys.has("d")) x += 1;
  if (keys.has("w")) y -= 1;
  if (keys.has("s")) y += 1;
  const length = Math.hypot(x, y);
  if (length > 1) return { x: x / length, y: y / length };
  return { x, y };
}

function getAim() {
  let x = aimStick.x;
  let y = aimStick.y;
  if (keys.has("arrowleft")) x -= 1;
  if (keys.has("arrowright")) x += 1;
  if (keys.has("arrowup")) y -= 1;
  if (keys.has("arrowdown")) y += 1;
  if (mouseAim.firing) {
    x = mouseAim.x;
    y = mouseAim.y;
  }
  const length = Math.hypot(x, y);
  if (length < 0.2) return { x: player.facingX, y: player.facingY, firing: false };
  return { x: x / length, y: y / length, firing: true };
}

function movePlayer(dt) {
  if (sleepTimer > 0) {
    player.moving = false;
    return;
  }
  const movement = getMovement();
  const length = Math.hypot(movement.x, movement.y);
  if (length < 0.08) {
    player.moving = false;
    footstepTimer = 0;
  } else {
    player.moving = true;
    player.phase += dt * 9;
    const aim = getAim();
    if (!aim.firing && !butterAction) {
      player.facingX = movement.x / length;
      player.facingY = movement.y / length;
    }
    const speed = run.moveSpeed * (giantTimer > 0 ? 0.88 : 1);
    player.x += movement.x * speed * dt;
    player.y += movement.y * speed * dt;
    footstepTimer -= dt;
    if (footstepTimer <= 0) {
      emitFootstep(player.x - movement.x * 16, player.y - movement.y * 16 + player.radius * 0.65, movement.x, movement.y);
      footstepTimer = 0.18;
    }
  }

  const size = player.radius * (giantTimer > 0 ? upperPower(run).scale : 1);
  const verticalDoor = player.x > DOOR.left && player.x < DOOR.right;
  const horizontalDoor = player.y > LOGICAL.height / 2 - 100 && player.y < LOGICAL.height / 2 + 100;
  const north = getAdjacentRoom(floor, currentRoom, "north");
  const south = getAdjacentRoom(floor, currentRoom, "south");
  const east = getAdjacentRoom(floor, currentRoom, "east");
  const west = getAdjacentRoom(floor, currentRoom, "west");

  const minX = west && horizontalDoor ? 28 : WALL + size;
  const maxX = east && horizontalDoor ? LOGICAL.width - 28 : LOGICAL.width - WALL - size;
  const minY = north && verticalDoor ? 28 : WALL + size;
  const maxY = south && verticalDoor ? LOGICAL.height - 28 : LOGICAL.height - WALL - size;
  player.x = clamp(player.x, minX, maxX);
  player.y = clamp(player.y, minY, maxY);

  if (north && verticalDoor && player.y <= 38) enterRoom(north, "north");
  else if (south && verticalDoor && player.y >= LOGICAL.height - 38) enterRoom(south, "south");
  else if (east && horizontalDoor && player.x >= LOGICAL.width - 38) enterRoom(east, "east");
  else if (west && horizontalDoor && player.x <= 38) enterRoom(west, "west");
}

function enterRoom(destination, directionId) {
  if (destination.type === "treasure" && !destination.unlocked) {
    if (run.keys <= 0) {
      showToast("열쇠가 없어서 보물방을 열 수 없다.");
      playTone(115, 0.12, "square", 0.02);
      if (directionId === "north") player.y = WALL + player.radius + 12;
      if (directionId === "south") player.y = LOGICAL.height - WALL - player.radius - 12;
      if (directionId === "east") player.x = LOGICAL.width - WALL - player.radius - 12;
      if (directionId === "west") player.x = WALL + player.radius + 12;
      return;
    }
    run.keys -= 1;
    destination.unlocked = true;
    showToast("열쇠를 사용해 보물방을 열었다!");
    playTone(720, 0.16, "sine", 0.03);
  }
  loadRoom(destination, directionId);
}

function currentAimAngle() {
  const aim = getAim();
  if (aim.firing) return Math.atan2(aim.y, aim.x);
  const target = nearestEnemy();
  if (target) return Math.atan2(target.y - player.y, target.x - player.x);
  return Math.atan2(player.facingY, player.facingX);
}

function nearestEnemy(from = player, ignored = new Set()) {
  let target = null;
  let nearest = Infinity;
  for (const enemy of enemies) {
    if (enemy.dead || ignored.has(enemy.id)) continue;
    const d = distance(from, enemy);
    if (d < nearest) {
      nearest = d;
      target = enemy;
    }
  }
  return target;
}

function updatePlayerAttack(dt) {
  attackTimer -= dt;
  const aim = getAim();
  if (!aim.firing || attackTimer > 0 || sleepTimer > 0) return;
  if (run.characterId === "butter" && butterAction) return;
  player.facingX = aim.x;
  player.facingY = aim.y;

  if (run.characterId === "butter") beginButterAttack(aim.x, aim.y);
  else swingPillow(aim.x, aim.y);
  attackTimer = run.attackCooldown;
}

function beginButterAttack(dx, dy) {
  const power = lowerPower(run);
  const lowProc = Math.random() < power.chance;
  butterAction = {
    type: lowProc ? "low" : "normal",
    time: 0,
    duration: lowProc ? 0.56 : Math.max(0.29, Math.min(0.44, run.attackCooldown * 0.9)),
    dx,
    dy,
    fired: false,
    lowProc
  };
}

function releaseButterShot(action) {
  const { dx, dy } = action;
  const angle = Math.atan2(dy, dx);
  attackKick = 1;
  projectiles.push({
    x: player.x + dx * 30,
    y: player.y + dy * 30,
    vx: dx * run.projectileSpeed,
    vy: dy * run.projectileSpeed,
    radius: 10,
    damage: run.damage,
    life: 1.7,
    homing: 0,
    bounces: 0,
    hitIds: new Set(),
    special: false,
    dead: false
  });

  if (action.lowProc) {
    const power = lowerPower(run);
    const offset = angle + (Math.random() - 0.5) * 0.16;
    projectiles.push({
      x: player.x + Math.cos(offset) * 28,
      y: player.y + Math.sin(offset) * 28,
      vx: Math.cos(offset) * run.projectileSpeed * 0.82,
      vy: Math.sin(offset) * run.projectileSpeed * 0.82,
      radius: 12,
      damage: run.damage * 0.78,
      life: 4,
      homing: power.homing,
      bounces: power.bounces,
      hitIds: new Set(),
      special: true,
      dead: false
    });
    showFloating(player.x, player.y - 45, "저학년!", "#e5a52e");
    playTone(760, 0.09, "sine", 0.025);
  } else {
    playTone(430, 0.055, "triangle", 0.018);
  }
  emitParticles(player.x + dx * 25, player.y + dy * 25, "#f6c34f", 4, 55);
}

function updateButterAction(dt) {
  if (!butterAction || run.characterId !== "butter") return;
  butterAction.time += dt;
  const progress = butterAction.time / butterAction.duration;
  const releasePoint = butterAction.type === "high" ? 0.68 : butterAction.type === "low" ? 0.5 : 0.55;
  if (!butterAction.fired && progress >= releasePoint) {
    butterAction.fired = true;
    if (butterAction.type === "high") releaseButterHigh(butterAction);
    else releaseButterShot(butterAction);
  }
  if (progress >= 1) butterAction = null;
}

function releaseButterHigh(action) {
  const power = action.power;
  const angle = Math.atan2(action.dy, action.dx);
  boulders.push({
    x: player.x + Math.cos(angle) * 60,
    y: player.y + Math.sin(angle) * 60,
    vx: Math.cos(angle) * 390,
    vy: Math.sin(angle) * 390,
    radius: power.radius,
    damage: power.damage,
    life: power.duration,
    spin: 0,
    hitCooldowns: new Map()
  });
  screenShake = 12;
  emitParticles(player.x + action.dx * 55, player.y + action.dy * 55, "#c89658", 28, 180);
  playTone(92, 0.3, "sawtooth", 0.04);
}

function swingPillow(dx, dy) {
  const angle = Math.atan2(dy, dx);
  attackKick = 1;
  const range = 105;
  slashes.push({ x: player.x, y: player.y, angle, radius: range, life: 0.22, maxLife: 0.22 });
  let hit = false;
  for (const enemy of enemies) {
    if (enemy.dead || distance(player, enemy) > range + enemy.radius) continue;
    const targetAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    const difference = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
    if (Math.abs(difference) > Math.PI * 0.45) continue;
    damageEnemy(enemy, run.damage, "#8c70c5");
    const d = Math.max(1, distance(player, enemy));
    enemy.x += (enemy.x - player.x) / d * 30;
    enemy.y += (enemy.y - player.y) / d * 30;
    hit = true;
  }
  screenShake = hit ? 4 : screenShake;
  emitParticles(player.x + dx * 65, player.y + dy * 65, "#d9cffa", 9, 90);
  playTone(hit ? 170 : 230, 0.08, "triangle", 0.025);
}

function updateProjectiles(dt) {
  for (const projectile of projectiles) {
    if (projectile.homing > 0) {
      const target = nearestEnemy(projectile, projectile.hitIds);
      if (target) {
        const speed = Math.hypot(projectile.vx, projectile.vy);
        const currentAngle = Math.atan2(projectile.vy, projectile.vx);
        const targetAngle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
        const difference = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
        const nextAngle = currentAngle + clamp(difference, -projectile.homing * dt, projectile.homing * dt);
        projectile.vx = Math.cos(nextAngle) * speed;
        projectile.vy = Math.sin(nextAngle) * speed;
      }
    }
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (
      projectile.life <= 0 ||
      projectile.x < WALL ||
      projectile.x > LOGICAL.width - WALL ||
      projectile.y < WALL ||
      projectile.y > LOGICAL.height - WALL
    ) projectile.dead = true;
    if (projectile.dead) continue;

    for (const enemy of enemies) {
      if (
        enemy.dead ||
        projectile.hitIds.has(enemy.id) ||
        distance(projectile, enemy) > projectile.radius + enemy.radius
      ) continue;
      projectile.hitIds.add(enemy.id);
      damageEnemy(enemy, projectile.damage, projectile.special ? "#e4a62e" : "#805d45");
      emitParticles(projectile.x, projectile.y, projectile.special ? "#ffd95d" : "#be8951", 7, 95);
      if (projectile.special && projectile.bounces > 0 && nearestEnemy(projectile, projectile.hitIds)) {
        projectile.bounces -= 1;
        projectile.life = Math.max(projectile.life, 1.2);
      } else {
        projectile.dead = true;
      }
      break;
    }
  }
  projectiles = projectiles.filter((projectile) => !projectile.dead);
}

function activateLower() {
  if (!started || paused || choosingItem || gameEnded || run.characterId === "butter" || lowerCooldown > 0) return;
  const power = lowerPower(run);
  const result = healState(run, power.heal);
  run = result.state;
  sleepTimer = power.duration;
  abilityPulse = 1;
  lowerCooldown = 11;
  emitParticles(player.x, player.y, "#b8a7ec", 22, 90);
  showToast("코미가 누웠다! +" + Math.round(result.healed) + " HP · 접근한 적에게 반사");
  playTone(340, 0.25, "sine", 0.03);
  updateHud();
}

function activateUpper() {
  if (!started || paused || choosingItem || gameEnded || upperCooldown > 0) return;
  const power = upperPower(run);
  abilityPulse = 1;
  if (run.characterId === "butter") {
    const angle = currentAimAngle();
    const duration = 0.86;
    butterAction = {
      type: "high",
      time: 0,
      duration,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      power,
      fired: false,
      lowProc: false
    };
    player.facingX = Math.cos(angle);
    player.facingY = Math.sin(angle);
    invulnerableTimer = Math.max(invulnerableTimer, power.duration + duration);
    upperCooldown = 20;
    showToast("새쭁! 쓔튜라이크! 장전 중에도 무적");
    playTone(180, 0.2, "square", 0.025);
  } else {
    giantTimer = power.duration;
    upperCooldown = 22;
    showToast("거대 코미 등장! 방을 넘어가도 " + power.duration.toFixed(1) + "초 유지");
    screenShake = 10;
    playTone(130, 0.35, "square", 0.035);
  }
  updateAbilityHud();
}

function placeBomb() {
  if (!started || paused || choosingItem || gameEnded || run.bombs <= 0) return;
  run.bombs -= 1;
  placedBombs.push({ x: player.x, y: player.y, fuse: 1.15, maxFuse: 1.15, radius: 18 });
  showToast("폭탄 설치! 수상한 벽 가까이에서 터뜨려 보자.");
  playTone(210, 0.08, "square", 0.02);
  updateHud();
}

function updatePlacedBombs(dt) {
  for (const bomb of placedBombs) {
    bomb.fuse -= dt;
    if (bomb.fuse > 0 || bomb.exploded) continue;
    bomb.exploded = true;
    screenShake = 17;
    emitParticles(bomb.x, bomb.y, "#ffcf58", 38, 230);
    emitParticles(bomb.x, bomb.y, "#6d4d54", 22, 160);
    playTone(72, 0.32, "sawtooth", 0.05);
    for (const enemy of enemies) {
      if (!enemy.dead && distance(bomb, enemy) < 190 + enemy.radius) {
        damageEnemy(enemy, 70 + run.upperGrade * 8, "#d65c45");
      }
    }
    if (distance(bomb, player) < 145 && invulnerableTimer <= 0) hurtPlayer(12);
    tryRevealSecret(bomb);
  }
  placedBombs = placedBombs.filter((bomb) => !bomb.exploded);
}

function tryRevealSecret(bomb) {
  const wallDistances = [
    { id: "north", distance: bomb.y - WALL },
    { id: "east", distance: LOGICAL.width - WALL - bomb.x },
    { id: "south", distance: LOGICAL.height - WALL - bomb.y },
    { id: "west", distance: bomb.x - WALL }
  ].sort((a, b) => a.distance - b.distance);
  for (const candidate of wallDistances) {
    if (candidate.distance > 190) break;
    const hidden = getAdjacentRoom(floor, currentRoom, candidate.id, true);
    if (!hidden || hidden.type !== "secret" || hidden.revealed) continue;
    const result = revealSecretAt(floor, currentRoom, candidate.id);
    if (!result.revealed) continue;
    const currentId = currentRoom.id;
    floor = result.floor;
    currentRoom = floor.rooms.find((room) => room.id === currentId);
    showToast("쾅! 벽 뒤에서 비밀방을 발견했다!");
    showRoomBanner();
    updateHud();
    return;
  }
}

function updatePickups() {
  for (const pickup of pickups) {
    if (pickup.collected || distance(player, pickup) > player.radius + 28) continue;
    pickup.collected = true;
    if (pickup.type === "key") {
      run.keys += 1;
      showToast("열쇠를 주웠다.");
    } else if (pickup.type === "bomb") {
      run.bombs += 1;
      showToast("폭탄을 주웠다.");
    } else {
      const result = healState(run, 22);
      run = result.state;
      showToast("간식을 먹고 체력을 " + Math.round(result.healed) + " 회복했다.");
    }
    playTone(780, 0.08, "sine", 0.025);
    updateHud();
  }
  pickups = pickups.filter((pickup) => !pickup.collected);
}

function updateBoulders(dt) {
  for (const boulder of boulders) {
    boulder.x += boulder.vx * dt;
    boulder.y += boulder.vy * dt;
    boulder.spin += Math.hypot(boulder.vx, boulder.vy) * dt / Math.max(1, boulder.radius);
    boulder.life -= dt;

    if (boulder.x - boulder.radius < WALL || boulder.x + boulder.radius > LOGICAL.width - WALL) {
      boulder.x = clamp(boulder.x, WALL + boulder.radius, LOGICAL.width - WALL - boulder.radius);
      boulder.vx *= -1;
      screenShake = Math.max(screenShake, 7);
      playTone(105, 0.07, "square", 0.018);
    }
    if (boulder.y - boulder.radius < WALL || boulder.y + boulder.radius > LOGICAL.height - WALL) {
      boulder.y = clamp(boulder.y, WALL + boulder.radius, LOGICAL.height - WALL - boulder.radius);
      boulder.vy *= -1;
      screenShake = Math.max(screenShake, 7);
      playTone(95, 0.07, "square", 0.018);
    }

    for (const [id, cooldown] of boulder.hitCooldowns) {
      const next = cooldown - dt;
      if (next <= 0) boulder.hitCooldowns.delete(id);
      else boulder.hitCooldowns.set(id, next);
    }
    for (const enemy of enemies) {
      if (
        enemy.dead ||
        boulder.hitCooldowns.has(enemy.id) ||
        distance(boulder, enemy) > boulder.radius + enemy.radius
      ) continue;
      boulder.hitCooldowns.set(enemy.id, 0.38);
      damageEnemy(enemy, boulder.damage, "#6e5341");
      const d = Math.max(1, distance(boulder, enemy));
      enemy.x += (enemy.x - boulder.x) / d * 45;
      enemy.y += (enemy.y - boulder.y) / d * 45;
      emitParticles(enemy.x, enemy.y, "#9b7654", 14, 150);
      screenShake = 9;
    }
  }
  boulders = boulders.filter((boulder) => boulder.life > 0);
}

function updateEnemies(dt) {
  const sleepPower = run.characterId === "komi" ? lowerPower(run) : null;
  const giantPower = run.characterId === "komi" ? upperPower(run) : null;

  for (const enemy of enemies) {
    if (enemy.dead) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.reflectCooldown = Math.max(0, enemy.reflectCooldown - dt);
    enemy.giantCooldown = Math.max(0, enemy.giantCooldown - dt);
    enemy.phase += dt * 4;

    const d = distance(enemy, player);
    const dx = (player.x - enemy.x) / Math.max(1, d);
    const dy = (player.y - enemy.y) / Math.max(1, d);
    const slowNearGiant = giantTimer > 0 && d < 170 ? 0.55 : 1;
    enemy.x += dx * enemy.speed * slowNearGiant * dt;
    enemy.y += dy * enemy.speed * slowNearGiant * dt;
    enemy.x = clamp(enemy.x, WALL + enemy.radius, LOGICAL.width - WALL - enemy.radius);
    enemy.y = clamp(enemy.y, WALL + enemy.radius, LOGICAL.height - WALL - enemy.radius);

    if (enemy.type === "boss") {
      enemy.bossShotTimer -= dt;
      if (enemy.bossShotTimer <= 0) {
        fireBossPattern(enemy);
        enemy.bossShotTimer = Math.max(0.65, 1.25 - run.roomsVisited * 0.04);
      }
    }

    if (sleepTimer > 0 && d < 150 + enemy.radius && enemy.reflectCooldown <= 0) {
      enemy.reflectCooldown = 0.52;
      damageEnemy(enemy, sleepPower.reflectDamage, "#7c69bb");
      enemy.x -= dx * 38;
      enemy.y -= dy * 38;
      emitParticles(enemy.x, enemy.y, "#d5c9f4", 8, 110);
      continue;
    }

    if (giantTimer > 0 && d < player.radius * giantPower.scale + enemy.radius && enemy.giantCooldown <= 0) {
      enemy.giantCooldown = 0.36;
      damageEnemy(enemy, giantPower.damage, "#8066bb");
      enemy.x -= dx * 55;
      enemy.y -= dy * 55;
      emitParticles(enemy.x, enemy.y, "#c9b3ef", 12, 135);
      screenShake = 5;
      continue;
    }

    const playerRadius = player.radius * (giantTimer > 0 ? giantPower.scale : 1);
    if (d < enemy.radius + playerRadius && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = enemy.type === "boss" ? 0.8 : 0.72;
      enemy.x -= dx * 24;
      enemy.y -= dy * 24;
      hurtPlayer(enemy.damage, sleepTimer > 0 ? 0.55 : 0);
    }
  }
}

function fireBossPattern(enemy) {
  const count = 10;
  const offset = elapsed * 0.55;
  for (let i = 0; i < count; i += 1) {
    const angle = offset + i / count * Math.PI * 2;
    enemyShots.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 165,
      vy: Math.sin(angle) * 165,
      radius: 11,
      damage: 10,
      life: 5
    });
  }
  emitParticles(enemy.x, enemy.y, "#ffe16d", 18, 100);
  playTone(145, 0.18, "sawtooth", 0.025);
}

function updateEnemyShots(dt) {
  for (const shot of enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (
      shot.life <= 0 ||
      shot.x < WALL ||
      shot.x > LOGICAL.width - WALL ||
      shot.y < WALL ||
      shot.y > LOGICAL.height - WALL
    ) shot.dead = true;
    if (shot.dead) continue;
    const radius = player.radius * (giantTimer > 0 ? upperPower(run).scale : 1);
    if (distance(shot, player) < shot.radius + radius) {
      shot.dead = true;
      if (sleepTimer > 0) {
        emitParticles(shot.x, shot.y, "#d8cdf3", 9, 100);
      } else {
        hurtPlayer(shot.damage);
      }
    }
  }
  enemyShots = enemyShots.filter((shot) => !shot.dead);
}

function hurtPlayer(rawDamage, reduction = 0) {
  if (hurtTimer > 0 || invulnerableTimer > 0 || gameEnded) return;
  const result = damageState(run, rawDamage, reduction);
  run = result.state;
  hurtTimer = 0.65;
  stage.classList.remove("hurt");
  void stage.offsetWidth;
  stage.classList.add("hurt");
  setTimeout(() => stage.classList.remove("hurt"), 260);
  screenShake = 8;
  showFloating(player.x, player.y - 45, "-" + result.damage, "#d44768");
  emitParticles(player.x, player.y, "#ed6e87", 12, 115);
  playTone(105, 0.12, "sawtooth", 0.03);
  updateHud();
  if (run.hp <= 0) endGame(false);
}

function damageEnemy(enemy, amount, color) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.hitFlash = 0.1;
  showFloating(enemy.x, enemy.y - enemy.radius, Math.round(amount), color);
  if (enemy.hp <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  run.kills += 1;
  emitParticles(enemy.x, enemy.y, enemy.accent, enemy.type === "boss" ? 42 : 16, enemy.type === "boss" ? 190 : 120);
  if (enemy.type === "boss") screenShake = 18;
}

function checkRoomClear() {
  if (roomCleared || gameEnded || enemies.some((enemy) => !enemy.dead)) return;
  roomCleared = true;
  const state = roomStates.get(currentRoom.id);
  if (state) state.cleared = true;
  enemyShots = [];
  if (currentRoom.type === "boss") {
    setTimeout(() => endGame(true), 650);
    return;
  }
  playTone(680, 0.12, "sine", 0.03);
  const roll = Math.random();
  const type = roll < 0.38 ? "key" : roll < 0.76 ? "bomb" : "heart";
  pickups.push({ type, x: LOGICAL.width / 2, y: LOGICAL.height / 2, phase: 0, collected: false });
  if (state) state.pickups = pickups;
  showToast(type === "key" ? "찰칵! 열쇠가 떨어졌다." : type === "bomb" ? "폭탄이 떨어졌다." : "간식이 떨어졌다.");
}

function showItemChoices(purpose = "treasure") {
  choosingItem = true;
  itemChoicePurpose = purpose;
  $(".choice-heading p").textContent = purpose === "secret" ? "SECRET FOUND!" : "TREASURE ROOM";
  $(".choice-heading h2").textContent = purpose === "secret" ? "숨겨둔 물건" : "하나만 챙기자";
  $(".choice-heading span").textContent = purpose === "secret"
    ? "비밀방에서 발견한 아이템을 선택하세요"
    : "열쇠로 연 보물방의 아이템을 선택하세요";
  const choices = rollItems();
  $("#item-cards").innerHTML = choices.map((id) => {
    const item = ITEMS[id];
    const gradeClass = item.stat === "lowerGrade" || item.stat === "upperGrade" ? " grade-item" : "";
    const category = item.stat === "lowerGrade" ? "저학년 강화" : item.stat === "upperGrade" ? "고학년 강화" : "기본 능력치";
    return "<button class=\"item-card" + gradeClass + "\" data-item=\"" + id + "\">" +
      "<span class=\"item-icon\">" + iconMarkup(item.icon) + "</span>" +
      "<span class=\"item-copy\"><small>" + category + "</small><h3>" + item.name +
      "</h3><p>" + item.description + "</p></span><span class=\"item-arrow\">›</span></button>";
  }).join("");
  $("#item-screen").hidden = false;
}

function chooseItem(id) {
  if (!ITEMS[id] || !choosingItem) return;
  run = applyItem(run, id);
  choosingItem = false;
  const state = roomStates.get(currentRoom.id);
  if (state) state.rewardTaken = true;
  $("#item-screen").hidden = true;
  renderInventory();
  updateHud();
  updateAbilityHud();
  showToast(ITEMS[id].name + " 획득! 다른 방도 자유롭게 탐색할 수 있다.");
  emitParticles(player.x, player.y, "#ffe272", 24, 120);
  playTone(840, 0.2, "sine", 0.035);
}

function updateParticles(dt) {
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
    particle.life -= dt;
  }
  particles = particles.filter((particle) => particle.life > 0);
  for (const number of numbers) {
    number.y -= 36 * dt;
    number.life -= dt;
  }
  numbers = numbers.filter((number) => number.life > 0);
  for (const slash of slashes) slash.life -= dt;
  slashes = slashes.filter((slash) => slash.life > 0);
}

function emitParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.25 + Math.random() * 0.45,
      maxLife: 0.7,
      size: 3 + Math.random() * 5,
      color
    });
  }
}

function emitFootstep(x, y, dx, dy) {
  for (let i = 0; i < 3; i += 1) {
    particles.push({
      x: x + (Math.random() - 0.5) * 13,
      y: y + (Math.random() - 0.5) * 7,
      vx: -dx * 16 + (Math.random() - 0.5) * 22,
      vy: -dy * 10 - 8 - Math.random() * 10,
      life: 0.2 + Math.random() * 0.12,
      maxLife: 0.32,
      size: 2 + Math.random() * 3,
      color: "rgba(119,83,91,.28)"
    });
  }
}

function showFloating(x, y, text, color) {
  numbers.push({ x: x + (Math.random() - 0.5) * 12, y, text, color, life: 0.7, maxLife: 0.7 });
}

function update(dt) {
  elapsed += dt;
  updateParticles(dt);
  screenShake = Math.max(0, screenShake - dt * 32);
  attackKick = Math.max(0, attackKick - dt * 9);
  abilityPulse = Math.max(0, abilityPulse - dt * 2.6);
  if (!started || paused || choosingItem || gameEnded) return;

  lowerCooldown = Math.max(0, lowerCooldown - dt);
  upperCooldown = Math.max(0, upperCooldown - dt);
  sleepTimer = Math.max(0, sleepTimer - dt);
  giantTimer = Math.max(0, giantTimer - dt);
  invulnerableTimer = Math.max(0, invulnerableTimer - dt);
  hurtTimer = Math.max(0, hurtTimer - dt);

  movePlayer(dt);
  updateButterAction(dt);
  updatePlayerAttack(dt);
  updateProjectiles(dt);
  updateBoulders(dt);
  updatePlacedBombs(dt);
  updateEnemies(dt);
  updateEnemyShots(dt);
  updatePickups();
  enemies = enemies.filter((enemy) => !enemy.dead);
  checkRoomClear();
  updateAbilityHud();
}

function drawRoom() {
  const isBoss = currentRoom.type === "boss";
  const hueShift = Math.abs(currentRoom.x * 7 + currentRoom.y * 11);
  ctx.fillStyle = isBoss ? "#6e5682" : "hsl(" + (329 + hueShift) + " 31% 73%)";
  ctx.fillRect(0, 0, LOGICAL.width, LOGICAL.height);

  ctx.save();
  ctx.beginPath();
  roundRectPath(WALL, WALL, LOGICAL.width - WALL * 2, LOGICAL.height - WALL * 2, 30);
  ctx.clip();

  const tile = 80;
  for (let y = WALL; y < LOGICAL.height - WALL; y += tile) {
    for (let x = WALL; x < LOGICAL.width - WALL; x += tile) {
      const odd = ((x / tile | 0) + (y / tile | 0) + currentRoom.x + currentRoom.y) % 2;
      ctx.fillStyle = isBoss
        ? (odd ? "#765f8c" : "#806998")
        : (odd ? "#f1d7bd" : "#e8c5b5");
      ctx.fillRect(x, y, tile + 1, tile + 1);
    }
  }

  ctx.strokeStyle = isBoss ? "rgba(255,231,111,.16)" : "rgba(120,81,79,.12)";
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(150 + i * 175, 240 + ((i * 157 + currentRoom.x * 71 + currentRoom.y * 43) % 720), 55 + (i % 2) * 18, 0, Math.PI * 1.65);
    ctx.stroke();
  }

  drawRoomProps();
  ctx.restore();

  ctx.lineWidth = 22;
  ctx.strokeStyle = isBoss ? "#4d3a62" : "#8d627d";
  roundRectPath(WALL - 4, WALL - 4, LOGICAL.width - WALL * 2 + 8, LOGICAL.height - WALL * 2 + 8, 34);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = isBoss ? "#e5c65c" : "#f4d6a6";
  roundRectPath(WALL + 4, WALL + 4, LOGICAL.width - WALL * 2 - 8, LOGICAL.height - WALL * 2 - 8, 26);
  ctx.stroke();

  drawDoor();
}

function drawRoomProps() {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i += 1) {
    const seed = Math.abs(currentRoom.x * 37 + currentRoom.y * 61);
    const x = 115 + ((i * 167 + seed * 43) % 570);
    const y = 205 + ((i * 311 + seed * 41) % 1020);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((i + Math.abs(currentRoom.x + currentRoom.y)) % 5 - 2) * 0.08);
    ctx.fillStyle = currentRoom.type === "boss" ? "#5c4770" : "#b98572";
    roundRectPath(-31, -20, 62, 40, 8);
    ctx.fill();
    ctx.fillStyle = currentRoom.type === "boss" ? "#9e81b5" : "#e8bb77";
    roundRectPath(-27, -16, 54, 26, 6);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDoor() {
  for (const direction of CARDINAL_DIRECTIONS) {
    const destination = getAdjacentRoom(floor, currentRoom, direction.id);
    if (!destination) continue;
    let x = LOGICAL.width / 2;
    let y = WALL + 3;
    let rotation = 0;
    if (direction.id === "south") {
      y = LOGICAL.height - WALL - 3;
      rotation = Math.PI;
    } else if (direction.id === "east") {
      x = LOGICAL.width - WALL - 3;
      y = LOGICAL.height / 2;
      rotation = Math.PI / 2;
    } else if (direction.id === "west") {
      x = WALL + 3;
      y = LOGICAL.height / 2;
      rotation = -Math.PI / 2;
    }
    drawSingleDoor(x, y, rotation, destination);
  }
}

function drawSingleDoor(x, y, rotation, destination) {
  const locked = destination.type === "treasure" && !destination.unlocked;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = locked ? "#d7a85b" : "#fff0a5";
  ctx.strokeStyle = "#51394e";
  ctx.lineWidth = 7;
  roundRectPath(-83, -28, 166, 76, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = locked ? "#7d5a50" : destination.type === "boss" ? "#634773" : "#7b5f91";
  roundRectPath(-65, -23, 130, 69, 14);
  ctx.fill();
  ctx.fillStyle = "#fff1a1";
  const glow = 0.5 + Math.sin(elapsed * 3.2) * 0.18;
  ctx.globalAlpha = glow;
  roundRectPath(-54, -16, 108, 55, 11);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawDoorIcon(destination, locked);
  ctx.restore();
}

function drawDoorIcon(destination, locked) {
  ctx.save();
  ctx.translate(0, 8);
  ctx.strokeStyle = "#fff1a1";
  ctx.fillStyle = "#fff1a1";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (locked) {
    roundRectPath(-15, -2, 30, 25, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -3, 11, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#7d5a50";
    ctx.beginPath();
    ctx.arc(0, 9, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (destination.type === "boss") {
    ctx.beginPath();
    ctx.arc(0, 4, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#634773";
    ctx.beginPath();
    ctx.arc(-6, 1, 3, 0, Math.PI * 2);
    ctx.arc(6, 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, 12, 16, 4);
  } else if (destination.type === "secret") {
    ctx.font = "900 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("?", 0, 14);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 19);
    ctx.moveTo(-11, -1);
    ctx.lineTo(0, -12);
    ctx.lineTo(11, -1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHero() {
  const giant = giantTimer > 0 ? upperPower(run).scale : 1;
  const size = (run.characterId === "butter" ? 112 : 118) * giant;
  const butterWalking = run.characterId === "butter" && player.moving && !butterAction && butterWalkReady;
  const stride = player.moving && sleepTimer <= 0 && !butterWalking ? Math.sin(player.phase) : 0;
  const breathe = sleepTimer <= 0 && !butterWalking ? Math.sin(elapsed * 2.5) * 0.006 : 0;
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#493641";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.28, size * 0.34, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (abilityPulse > 0) {
    ctx.globalAlpha = abilityPulse * 0.55;
    ctx.strokeStyle = run.characterId === "butter" ? "#ffe074" : "#d4bff5";
    ctx.lineWidth = 10 * abilityPulse;
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.46 + (1 - abilityPulse) * 0.42), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (invulnerableTimer > 0) {
    ctx.strokeStyle = "rgba(255,226,93,.9)";
    ctx.lineWidth = 7;
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -elapsed * 35;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.48 + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (sleepTimer > 0) {
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-8, 0);
  } else {
    ctx.translate(-player.facingX * attackKick * 10, -player.facingY * attackKick * 10);
    ctx.rotate(stride * 0.022 + player.facingX * attackKick * 0.045);
    ctx.scale(1 + Math.abs(stride) * 0.012 + breathe, 1 - Math.abs(stride) * 0.008 - breathe);
    const facingDirection = getButterFacingDirection();
    const shouldFlip = run.characterId === "butter"
      ? facingDirection === "side" && (butterWalking ? player.facingX > 0 : player.facingX < 0)
      : player.facingX < -0.08;
    if (shouldFlip) ctx.scale(-1, 1);
  }

  if (hurtTimer > 0 && Math.floor(hurtTimer * 18) % 2 === 0) ctx.globalAlpha = 0.42;
  if (butterWalking) {
    drawButterWalkSprite(size);
  } else if (run.characterId === "butter" && butterActionPartsLoaded >= 3) {
    drawButterDirectionalSprite(size);
  } else if (heroArtReady && heroAtlas.naturalWidth) {
    const half = heroAtlas.naturalWidth / 2;
    const sourceX = run.characterId === "butter" ? 0 : half;
    ctx.drawImage(heroAtlas, sourceX, 0, half, heroAtlas.naturalHeight, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = run.characterId === "butter" ? "#f1bd4f" : "#b8a6e5";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (sleepTimer > 0) {
    ctx.fillStyle = "#725b9f";
    ctx.font = "900 24px Arial";
    ctx.fillText("Z", player.x + 45, player.y - 50 - Math.sin(elapsed * 3) * 8);
    ctx.font = "900 15px Arial";
    ctx.fillText("z", player.x + 65, player.y - 75 - Math.sin(elapsed * 3 + 1) * 6);
  }
}

function getButterFacingDirection() {
  if (Math.abs(player.facingX) > Math.abs(player.facingY) * 0.82) return "side";
  return player.facingY < 0 ? "up" : "down";
}

function drawButterWalkSprite(baseSize) {
  const direction = getButterFacingDirection();
  const rows = { down: 0, side: 1, up: 2 };
  const row = rows[direction] ?? 0;
  const frame = Math.floor(player.phase * 0.9) % 6;
  drawButterFrame(ctx, butterWalkAtlas, row, frame, baseSize * 1.55, baseSize * 0.28);
}

function drawButterDirectionalSprite(baseSize) {
  const direction = getButterFacingDirection();
  const atlas = butterActionAtlases[direction];
  const rows = { normal: 0, low: 1, high: 2 };
  const type = butterAction?.type || "normal";
  const row = rows[type] ?? 0;
  const progress = butterAction ? clamp(butterAction.time / butterAction.duration, 0, 0.999) : 0;
  const frame = butterAction ? Math.min(5, Math.floor(progress * 6)) : 0;
  drawButterFrame(ctx, atlas, row, frame, baseSize * (type === "high" ? 2.05 : 1.55), baseSize * 0.28);
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const motion = Math.sin(enemy.phase);
    const bounce = motion * 1.3;
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bounce);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#3f303c";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.7, enemy.radius * 0.85, enemy.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.scale(1 + motion * 0.025, 1 - motion * 0.025);

    ctx.fillStyle = enemy.hitFlash > 0 ? "#fff" : enemy.color;
    ctx.strokeStyle = "#513b54";
    ctx.lineWidth = enemy.type === "boss" ? 8 : 5;
    ctx.beginPath();
    if (enemy.type === "crayon") {
      ctx.moveTo(0, -enemy.radius * 1.2);
      ctx.lineTo(enemy.radius * 0.8, enemy.radius * 0.9);
      ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.9);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = enemy.accent;
    if (enemy.type === "locker") {
      roundRectPath(-enemy.radius * 0.58, -enemy.radius * 0.7, enemy.radius * 1.16, enemy.radius * 1.4, 6);
      ctx.fill();
      ctx.fillStyle = enemy.color;
      ctx.fillRect(-enemy.radius * 0.35, -3, enemy.radius * 0.7, 5);
    } else if (enemy.type === "boss") {
      for (let i = 0; i < 6; i += 1) {
        const angle = i / 6 * Math.PI * 2 + elapsed * 0.3;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * enemy.radius * 0.72, Math.sin(angle) * enemy.radius * 0.72, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "#4f3748";
    ctx.beginPath();
    ctx.arc(-enemy.radius * 0.3, -enemy.radius * 0.12, Math.max(3, enemy.radius * 0.09), 0, Math.PI * 2);
    ctx.arc(enemy.radius * 0.3, -enemy.radius * 0.12, Math.max(3, enemy.radius * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (enemy.hp < enemy.maxHp || enemy.type === "boss") {
      const width = enemy.type === "boss" ? 150 : enemy.radius * 2;
      ctx.fillStyle = "rgba(61,43,54,.55)";
      roundRectPath(enemy.x - width / 2, enemy.y - enemy.radius - 24, width, 9, 5);
      ctx.fill();
      ctx.fillStyle = enemy.type === "boss" ? "#ffe06b" : "#ec6d85";
      roundRectPath(enemy.x - width / 2, enemy.y - enemy.radius - 24, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 9, 5);
      ctx.fill();
    }
  }
}

function drawAttacks() {
  for (const pickup of pickups) {
    const float = Math.sin(elapsed * 4 + pickup.x * 0.01) * 6;
    ctx.save();
    ctx.translate(pickup.x, pickup.y + float);
    ctx.fillStyle = "rgba(72,48,61,.22)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    drawPickupGlyph(pickup.type);
    ctx.restore();
  }

  for (const bomb of placedBombs) {
    const pulse = 1 + Math.sin(elapsed * 22) * 0.12 * (1 - bomb.fuse / bomb.maxFuse);
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#51434b";
    ctx.strokeStyle = "#2f2830";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 4, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f2bb4a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(8, -14);
    ctx.quadraticCurveTo(23, -30, 29, -15);
    ctx.stroke();
    ctx.fillStyle = bomb.fuse < 0.38 ? "#ff795b" : "#ffe574";
    ctx.beginPath();
    ctx.arc(30, -16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const projectile of projectiles) {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    const speed = Math.max(1, Math.hypot(projectile.vx, projectile.vy));
    const trail = projectile.special ? 32 : 20;
    ctx.strokeStyle = projectile.special ? "rgba(255,226,102,.72)" : "rgba(116,82,55,.35)";
    ctx.lineWidth = projectile.special ? 8 : 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-projectile.vx / speed * trail, -projectile.vy / speed * trail);
    ctx.stroke();
    if (projectile.special) {
      ctx.shadowColor = "#ffe35f";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#fff1a1";
      drawStar(0, 0, projectile.radius, projectile.radius * 0.46, 5);
      ctx.fill();
    } else {
      ctx.fillStyle = "#8c6847";
      ctx.strokeStyle = "#563e34";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const boulder of boulders) {
    ctx.save();
    ctx.translate(boulder.x, boulder.y);
    ctx.rotate(boulder.spin);
    ctx.shadowColor = "rgba(64,43,39,.45)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#7c6251";
    ctx.strokeStyle = "#4d3b36";
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = i / 10 * Math.PI * 2;
      const radius = boulder.radius * (i % 2 ? 0.92 : 1);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#a88b70";
    ctx.beginPath();
    ctx.arc(-boulder.radius * 0.2, -boulder.radius * 0.25, boulder.radius * 0.18, 0, Math.PI * 2);
    ctx.arc(boulder.radius * 0.28, boulder.radius * 0.16, boulder.radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const shot of enemyShots) {
    ctx.fillStyle = "#f4d45f";
    ctx.strokeStyle = "#76578e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  for (const slash of slashes) {
    const alpha = clamp(slash.life / slash.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#eee9ff";
    ctx.lineWidth = 25 * alpha;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(slash.x, slash.y, slash.radius * (1.05 - alpha * 0.25), slash.angle - 1.25, slash.angle + 1.25);
    ctx.stroke();
    ctx.strokeStyle = "#8c72c8";
    ctx.lineWidth = 6 * alpha;
    ctx.stroke();
    ctx.restore();
  }
}

function drawPickupGlyph(type) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "key") {
    ctx.strokeStyle = "#e7b94b";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-7, -5, 9, 0, Math.PI * 2);
    ctx.moveTo(0, 2);
    ctx.lineTo(17, 19);
    ctx.moveTo(10, 12);
    ctx.lineTo(16, 6);
    ctx.stroke();
  } else if (type === "bomb") {
    ctx.fillStyle = "#4d4049";
    ctx.strokeStyle = "#2f2830";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 4, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#d89e42";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(7, -10);
    ctx.quadraticCurveTo(19, -24, 24, -11);
    ctx.stroke();
    ctx.fillStyle = "#ffe06d";
    ctx.beginPath();
    ctx.arc(25, -12, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#f4d38b";
    ctx.strokeStyle = "#76505a";
    ctx.lineWidth = 4;
    roundRectPath(-18, -18, 36, 37, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e87d8e";
    ctx.beginPath();
    ctx.arc(0, 1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff0c8";
    ctx.fillRect(-3, -10, 6, 22);
    ctx.fillRect(-11, -2, 22, 6);
  }
  ctx.restore();
}

function drawEffects() {
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 22px Arial";
  for (const number of numbers) {
    ctx.globalAlpha = clamp(number.life / number.maxLife, 0, 1);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.strokeText(String(number.text), number.x, number.y);
    ctx.fillStyle = number.color;
    ctx.fillText(String(number.text), number.x, number.y);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#4d3958";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  ctx.translate(renderOffsetX + shakeX, renderOffsetY + shakeY);
  ctx.scale(renderScale, renderScale);

  drawRoom();
  drawEnemies();
  drawAttacks();
  drawHero();
  drawEffects();

  if (invulnerableTimer > 0 && started) {
    ctx.fillStyle = "rgba(255,224,92,.9)";
    ctx.font = "900 17px Arial";
    ctx.textAlign = "center";
    ctx.fillText("무적 " + invulnerableTimer.toFixed(1) + "s", player.x, player.y - 78);
  }
  if (giantTimer > 0 && started) {
    ctx.fillStyle = "#fff1a1";
    ctx.font = "900 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("거대화 " + giantTimer.toFixed(1) + "s", player.x, player.y - player.radius * upperPower(run).scale - 55);
  }
}

function roundRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawStar(x, y, outerRadius, innerRadius, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function loop(now) {
  const dt = Math.min(0.033, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  resetGame(selectedCharacter);
  started = true;
  $("#start-screen").classList.add("hidden");
  showRoomBanner();
  playTone(520, 0.12, "sine", 0.03);
  setTimeout(() => playTone(780, 0.18, "sine", 0.025), 90);
}

function restartGame() {
  $("#result-screen").hidden = true;
  resetGame(selectedCharacter);
  started = true;
  showRoomBanner();
}

function endGame(won) {
  if (gameEnded) return;
  gameEnded = true;
  $("#result-emblem").textContent = won ? "★" : "×";
  $("#result-kicker").textContent = won ? "ESCAPED!" : "LOST IN SPACE";
  $("#result-title").textContent = won ? "아공간에서 탈출했다!" : "셰이디의 장난에 당했다";
  $("#result-copy").textContent = won
    ? CHARACTERS[run.characterId].name + "가 모은 아이템과 학년 능력으로 마지막 방까지 돌파했습니다."
    : "다른 아이템 조합과 학년 능력을 키워 다시 도전해 보세요.";
  $("#result-rooms").textContent = run.roomsVisited;
  $("#result-kills").textContent = run.kills;
  $("#result-items").textContent = run.itemsTaken;
  $("#result-screen").hidden = false;
  playTone(won ? 840 : 105, 0.5, won ? "sine" : "sawtooth", 0.04);
}

function togglePause(force) {
  if (!started || gameEnded || choosingItem) return;
  paused = typeof force === "boolean" ? force : !paused;
  $("#pause-screen").hidden = !paused;
}

function updateStick(event, stick, elementId, knobId) {
  const element = $(elementId);
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const max = rect.width * 0.31;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const length = Math.hypot(dx, dy);
  if (length > max) {
    dx = dx / length * max;
    dy = dy / length * max;
  }
  stick.x = dx / max;
  stick.y = dy / max;
  $(knobId).style.transform = "translate(" + dx + "px, " + dy + "px)";
}

function bindStick(elementId, knobId, stick) {
  const element = $(elementId);
  element.addEventListener("pointerdown", (event) => {
    stick.pointerId = event.pointerId;
    element.setPointerCapture(event.pointerId);
    updateStick(event, stick, elementId, knobId);
  });
  element.addEventListener("pointermove", (event) => {
    if (event.pointerId === stick.pointerId) updateStick(event, stick, elementId, knobId);
  });
  const release = (event) => {
    if (event.pointerId !== stick.pointerId) return;
    stick.x = 0;
    stick.y = 0;
    stick.pointerId = null;
    $(knobId).style.transform = "translate(0, 0)";
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
}

function pointerToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - renderOffsetX) / renderScale,
    y: (event.clientY - rect.top - renderOffsetY) / renderScale
  };
}

function updateMouseAim(event) {
  const point = pointerToWorld(event);
  const dx = point.x - player.x;
  const dy = point.y - player.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  mouseAim.x = dx / length;
  mouseAim.y = dy / length;
}

bindStick("#move-stick", "#move-knob", moveStick);
bindStick("#aim-stick", "#aim-knob", aimStick);

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;
  mouseAim.pointerId = event.pointerId;
  mouseAim.firing = true;
  canvas.setPointerCapture(event.pointerId);
  updateMouseAim(event);
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId === mouseAim.pointerId) updateMouseAim(event);
});
const releaseMouse = (event) => {
  if (event.pointerId === mouseAim.pointerId) {
    mouseAim.firing = false;
    mouseAim.pointerId = null;
  }
};
canvas.addEventListener("pointerup", releaseMouse);
canvas.addEventListener("pointercancel", releaseMouse);

$("#character-select").addEventListener("click", (event) => {
  const card = event.target.closest("[data-character]");
  if (!card) return;
  selectedCharacter = card.dataset.character;
  document.querySelectorAll(".character-card").forEach((element) => {
    element.classList.toggle("selected", element === card);
  });
});
$("#item-cards").addEventListener("click", (event) => {
  const card = event.target.closest("[data-item]");
  if (card) chooseItem(card.dataset.item);
});
$("#lower-ability").addEventListener("click", activateLower);
$("#upper-ability").addEventListener("click", activateUpper);
$("#bomb-button").addEventListener("click", placeBomb);
$("#start-button").addEventListener("click", startGame);
$("#restart-button").addEventListener("click", restartGame);
$("#pause-button").addEventListener("click", () => togglePause());
$("#resume-button").addEventListener("click", () => togglePause(false));

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "q", "e", "r", "escape"].includes(key)) {
    event.preventDefault();
  }
  if (key === "escape") togglePause();
  else if (key === "q") activateLower();
  else if (key === "e") activateUpper();
  else if (key === "r") placeBomb();
  else keys.add(key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  mouseAim.firing = false;
});
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetGame();
requestAnimationFrame(loop);
