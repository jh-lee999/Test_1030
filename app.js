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
} from "./survivor-engine.js?v=15";

const LOGICAL = { width: 800, height: 1450 };
const WALL = 58;
const DOOR = { left: 320, right: 480, top: 42, bottom: 90 };
const ROOM_NAMES = [
  "뒤틀린 교실",
  "끝나지 않는 복도",
  "거꾸로 된 급식실",
  "낙서투성이 음악실",
  "셰이디의 장난감방",
  "출구 없는 자습실",
  "아공간의 중심"
];

const canvas = document.querySelector("#game-canvas");
const stage = document.querySelector("#game-stage");
const ctx = canvas.getContext("2d");
const $ = (selector) => document.querySelector(selector);

const heroAtlas = new Image();
let heroArtReady = false;
heroAtlas.decoding = "async";
heroAtlas.addEventListener("load", () => { heroArtReady = true; });
heroAtlas.src = "./assets/trickcal-heroes.webp?v=15";

const ENEMY_TYPES = {
  jelly: { hp: 34, speed: 78, radius: 25, damage: 9, color: "#b984cd", accent: "#f2d6ff" },
  crayon: { hp: 25, speed: 108, radius: 20, damage: 7, color: "#ee8d7b", accent: "#ffe08b" },
  locker: { hp: 82, speed: 49, radius: 33, damage: 14, color: "#68a8b2", accent: "#b9eef1" },
  boss: { hp: 920, speed: 45, radius: 64, damage: 20, color: "#6b4a8b", accent: "#ffe16d" }
};

let run = createRunState("butter");
let player;
let enemies = [];
let projectiles = [];
let boulders = [];
let enemyShots = [];
let slashes = [];
let particles = [];
let numbers = [];
let started = false;
let paused = false;
let choosingItem = false;
let gameEnded = false;
let roomCleared = false;
let rewardChosen = false;
let attackTimer = 0;
let lowerCooldown = 0;
let upperCooldown = 0;
let sleepTimer = 0;
let giantTimer = 0;
let invulnerableTimer = 0;
let hurtTimer = 0;
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
  roomCleared = false;
  rewardChosen = false;
  choosingItem = false;
  gameEnded = false;
  paused = false;
  spawnRoom();
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
  $("#room-kicker").textContent = run.room === ROOM_COUNT ? "마지막 방" : run.room + "교시";
  $("#room-title").textContent = ROOM_NAMES[run.room - 1];
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
  $("#room-label").textContent = "방 " + run.room + " / " + ROOM_COUNT;
  $("#lower-level").textContent = "LV." + run.lowerGrade;
  $("#upper-level").textContent = "LV." + run.upperGrade;
  $("#portrait").classList.toggle("komi", run.characterId === "komi");
}

function updateAbilityHud() {
  const character = CHARACTERS[run.characterId];
  $("#lower-name").textContent = character.lowerName;
  $("#upper-name").textContent = character.upperName;
  const lowerButton = $("#lower-ability");
  const upperButton = $("#upper-ability");

  if (run.characterId === "butter") {
    const power = lowerPower(run);
    $("#lower-icon").textContent = "✦";
    $("#lower-cooldown").textContent = Math.round(power.chance * 100) + "% · " + power.bounces + "튕김";
    lowerButton.disabled = true;
  } else {
    $("#lower-icon").textContent = "Zz";
    $("#lower-cooldown").textContent = lowerCooldown > 0 ? lowerCooldown.toFixed(1) + "s" : "READY";
    lowerButton.disabled = lowerCooldown > 0 || sleepTimer > 0;
  }
  $("#upper-icon").textContent = run.characterId === "butter" ? "●" : "⬆";
  $("#upper-cooldown").textContent = upperCooldown > 0 ? upperCooldown.toFixed(1) + "s" : "READY";
  upperButton.disabled = upperCooldown > 0;
  lowerButton.classList.toggle("cooling", lowerCooldown > 0);
  upperButton.classList.toggle("cooling", upperCooldown > 0);
}

function renderInventory() {
  $("#item-strip").innerHTML = Object.entries(run.inventory).map(([id, count]) => {
    const item = ITEMS[id];
    return "<span class=\"item-chip\" title=\"" + item.name + " · " + item.description + "\">" +
      item.icon + (count > 1 ? "<b>" + count + "</b>" : "") + "</span>";
  }).join("");
}

function spawnRoom() {
  enemies = [];
  projectiles = [];
  enemyShots = [];
  slashes = [];
  roomCleared = false;
  rewardChosen = false;
  choosingItem = false;
  attackTimer = 0.15;
  player.x = LOGICAL.width / 2;
  player.y = LOGICAL.height - 200;

  if (run.room === ROOM_COUNT) {
    createEnemy("boss", LOGICAL.width / 2, 410);
    createEnemy("jelly", 230, 600);
    createEnemy("jelly", 570, 600);
  } else {
    const count = 3 + run.room;
    for (let i = 0; i < count; i += 1) {
      let type = "jelly";
      if (run.room >= 2 && i % 3 === 1) type = "crayon";
      if (run.room >= 4 && i % 4 === 2) type = "locker";
      const columns = 3;
      const column = i % columns;
      const row = Math.floor(i / columns);
      createEnemy(
        type,
        180 + column * 220 + (row % 2) * 40,
        310 + row * 220 + (i % 2) * 45
      );
    }
  }
  showRoomBanner();
}

function createEnemy(type, x, y) {
  const template = ENEMY_TYPES[type];
  const roomScale = 1 + (run.room - 1) * 0.13;
  enemies.push({
    id: ++enemyId,
    type,
    x,
    y,
    radius: template.radius,
    hp: template.hp * roomScale,
    maxHp: template.hp * roomScale,
    speed: template.speed * (1 + (run.room - 1) * 0.025),
    damage: template.damage + Math.floor((run.room - 1) * 1.2),
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
  } else {
    player.moving = true;
    player.phase += dt * 9;
    const speed = run.moveSpeed * (giantTimer > 0 ? 0.88 : 1);
    player.x += movement.x * speed * dt;
    player.y += movement.y * speed * dt;
  }

  const size = player.radius * (giantTimer > 0 ? upperPower(run).scale : 1);
  player.x = clamp(player.x, WALL + size, LOGICAL.width - WALL - size);
  const doorOpen = roomCleared && rewardChosen;
  const inDoor = doorOpen && player.x > DOOR.left && player.x < DOOR.right;
  const topLimit = inDoor ? 36 : WALL + size;
  player.y = clamp(player.y, topLimit, LOGICAL.height - WALL - size);

  if (inDoor && player.y <= 46) enterNextRoom();
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
  player.facingX = aim.x;
  player.facingY = aim.y;

  if (run.characterId === "butter") fireSlingshot(aim.x, aim.y);
  else swingPillow(aim.x, aim.y);
  attackTimer = run.attackCooldown;
}

function fireSlingshot(dx, dy) {
  const angle = Math.atan2(dy, dx);
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

  const power = lowerPower(run);
  if (Math.random() < power.chance) {
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

function swingPillow(dx, dy) {
  const angle = Math.atan2(dy, dx);
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
  lowerCooldown = 11;
  emitParticles(player.x, player.y, "#b8a7ec", 22, 90);
  showToast("코미가 누웠다! +" + Math.round(result.healed) + " HP · 접근한 적에게 반사");
  playTone(340, 0.25, "sine", 0.03);
  updateHud();
}

function activateUpper() {
  if (!started || paused || choosingItem || gameEnded || upperCooldown > 0) return;
  const power = upperPower(run);
  if (run.characterId === "butter") {
    const angle = currentAimAngle();
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
    invulnerableTimer = Math.max(invulnerableTimer, power.duration);
    upperCooldown = 20;
    showToast("왕새총 발사! 짱돌이 굴러가는 동안 무적");
    screenShake = 12;
    playTone(92, 0.3, "sawtooth", 0.04);
  } else {
    giantTimer = power.duration;
    upperCooldown = 22;
    showToast("거대 코미 등장! 방을 넘어가도 " + power.duration.toFixed(1) + "초 유지");
    screenShake = 10;
    playTone(130, 0.35, "square", 0.035);
  }
  updateAbilityHud();
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
        enemy.bossShotTimer = Math.max(0.65, 1.25 - run.room * 0.04);
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
  enemyShots = [];
  if (run.room >= ROOM_COUNT) {
    setTimeout(() => endGame(true), 650);
    return;
  }
  playTone(680, 0.12, "sine", 0.03);
  setTimeout(() => {
    if (!gameEnded) showItemChoices();
  }, 420);
}

function showItemChoices() {
  choosingItem = true;
  const choices = rollItems();
  $("#item-cards").innerHTML = choices.map((id) => {
    const item = ITEMS[id];
    const gradeClass = item.stat === "lowerGrade" || item.stat === "upperGrade" ? " grade-item" : "";
    const category = item.stat === "lowerGrade" ? "저학년 강화" : item.stat === "upperGrade" ? "고학년 강화" : "기본 능력치";
    return "<button class=\"item-card" + gradeClass + "\" data-item=\"" + id + "\">" +
      "<span class=\"item-icon\">" + item.icon + "</span>" +
      "<span class=\"item-copy\"><small>" + category + "</small><h3>" + item.name +
      "</h3><p>" + item.description + "</p></span><span class=\"item-arrow\">›</span></button>";
  }).join("");
  $("#item-screen").hidden = false;
}

function chooseItem(id) {
  if (!ITEMS[id] || !choosingItem) return;
  run = applyItem(run, id);
  choosingItem = false;
  rewardChosen = true;
  $("#item-screen").hidden = true;
  renderInventory();
  updateHud();
  updateAbilityHud();
  showToast(ITEMS[id].name + " 획득! 위쪽 문이 열렸다.");
  emitParticles(player.x, player.y, "#ffe272", 24, 120);
  playTone(840, 0.2, "sine", 0.035);
}

function enterNextRoom() {
  if (!roomCleared || !rewardChosen || run.room >= ROOM_COUNT) return;
  run.room += 1;
  spawnRoom();
  updateHud();
  playTone(460, 0.12, "triangle", 0.025);
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

function showFloating(x, y, text, color) {
  numbers.push({ x: x + (Math.random() - 0.5) * 12, y, text, color, life: 0.7, maxLife: 0.7 });
}

function update(dt) {
  elapsed += dt;
  updateParticles(dt);
  screenShake = Math.max(0, screenShake - dt * 32);
  if (!started || paused || choosingItem || gameEnded) return;

  lowerCooldown = Math.max(0, lowerCooldown - dt);
  upperCooldown = Math.max(0, upperCooldown - dt);
  sleepTimer = Math.max(0, sleepTimer - dt);
  giantTimer = Math.max(0, giantTimer - dt);
  invulnerableTimer = Math.max(0, invulnerableTimer - dt);
  hurtTimer = Math.max(0, hurtTimer - dt);

  movePlayer(dt);
  updatePlayerAttack(dt);
  updateProjectiles(dt);
  updateBoulders(dt);
  updateEnemies(dt);
  updateEnemyShots(dt);
  enemies = enemies.filter((enemy) => !enemy.dead);
  checkRoomClear();
  updateAbilityHud();
}

function drawRoom() {
  const hueShift = (run.room - 1) * 7;
  ctx.fillStyle = run.room === ROOM_COUNT ? "#6e5682" : "hsl(" + (329 + hueShift) + " 31% 73%)";
  ctx.fillRect(0, 0, LOGICAL.width, LOGICAL.height);

  ctx.save();
  ctx.beginPath();
  roundRectPath(WALL, WALL, LOGICAL.width - WALL * 2, LOGICAL.height - WALL * 2, 30);
  ctx.clip();

  const tile = 80;
  for (let y = WALL; y < LOGICAL.height - WALL; y += tile) {
    for (let x = WALL; x < LOGICAL.width - WALL; x += tile) {
      const odd = ((x / tile | 0) + (y / tile | 0) + run.room) % 2;
      ctx.fillStyle = run.room === ROOM_COUNT
        ? (odd ? "#765f8c" : "#806998")
        : (odd ? "#f1d7bd" : "#e8c5b5");
      ctx.fillRect(x, y, tile + 1, tile + 1);
    }
  }

  ctx.strokeStyle = run.room === ROOM_COUNT ? "rgba(255,231,111,.16)" : "rgba(120,81,79,.12)";
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(150 + i * 175, 240 + ((i * 157 + run.room * 71) % 520), 55 + (i % 2) * 18, 0, Math.PI * 1.65);
    ctx.stroke();
  }

  drawRoomProps();
  ctx.restore();

  ctx.lineWidth = 22;
  ctx.strokeStyle = run.room === ROOM_COUNT ? "#4d3a62" : "#8d627d";
  roundRectPath(WALL - 4, WALL - 4, LOGICAL.width - WALL * 2 + 8, LOGICAL.height - WALL * 2 + 8, 34);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = run.room === ROOM_COUNT ? "#e5c65c" : "#f4d6a6";
  roundRectPath(WALL + 4, WALL + 4, LOGICAL.width - WALL * 2 - 8, LOGICAL.height - WALL * 2 - 8, 26);
  ctx.stroke();

  drawDoor();
}

function drawRoomProps() {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i += 1) {
    const x = 115 + ((i * 167 + run.room * 43) % 570);
    const y = 205 + ((i * 311 + run.room * 41) % 1020);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((i + run.room) % 5 - 2) * 0.08);
    ctx.fillStyle = run.room === ROOM_COUNT ? "#5c4770" : "#b98572";
    roundRectPath(-31, -20, 62, 40, 8);
    ctx.fill();
    ctx.fillStyle = run.room === ROOM_COUNT ? "#9e81b5" : "#e8bb77";
    roundRectPath(-27, -16, 54, 26, 6);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDoor() {
  const open = roomCleared && rewardChosen;
  ctx.save();
  ctx.translate(LOGICAL.width / 2, WALL + 3);
  ctx.fillStyle = open ? "#fff0a5" : "#5f455f";
  ctx.strokeStyle = "#51394e";
  ctx.lineWidth = 7;
  roundRectPath(-83, -28, 166, 76, 20);
  ctx.fill();
  ctx.stroke();
  if (open) {
    ctx.fillStyle = "#7b5f91";
    roundRectPath(-65, -23, 130, 69, 14);
    ctx.fill();
    ctx.fillStyle = "#fff1a1";
    ctx.font = "900 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("EXIT ↑", 0, 20);
  } else {
    ctx.fillStyle = "#d5a95c";
    ctx.beginPath();
    ctx.arc(0, 7, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-6, 14, 12, 17);
  }
  ctx.restore();
}

function drawHero() {
  const giant = giantTimer > 0 ? upperPower(run).scale : 1;
  const size = (run.characterId === "butter" ? 112 : 118) * giant;
  const bob = player.moving && sleepTimer <= 0 ? Math.sin(player.phase) * 1.5 : 0;
  ctx.save();
  ctx.translate(player.x, player.y + bob);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#493641";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.28, size * 0.34, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

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
  } else if (player.facingX < -0.08) {
    ctx.scale(-1, 1);
  }

  if (hurtTimer > 0 && Math.floor(hurtTimer * 18) % 2 === 0) ctx.globalAlpha = 0.42;
  if (heroArtReady && heroAtlas.naturalWidth) {
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

function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const bounce = Math.sin(enemy.phase) * 3;
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bounce);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#3f303c";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.7, enemy.radius * 0.85, enemy.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

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
  for (const projectile of projectiles) {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
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
  $("#result-rooms").textContent = run.room;
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
$("#start-button").addEventListener("click", startGame);
$("#restart-button").addEventListener("click", restartGame);
$("#pause-button").addEventListener("click", () => togglePause());
$("#resume-button").addEventListener("click", () => togglePause(false));

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "q", "e", "escape"].includes(key)) {
    event.preventDefault();
  }
  if (key === "escape") togglePause();
  else if (key === "q") activateLower();
  else if (key === "e") activateUpper();
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
