import {
  AUGMENTS,
  RUN_DURATION,
  WEAPON_LABELS,
  applyAugment,
  clamp,
  consumePendingLevelUp,
  createRunState,
  currentDamage,
  currentMeleeDamage,
  distance,
  formatTime,
  gainExperience,
  registerKill,
  rollAugments,
  takeDamage,
  xpNeeded
} from "./survivor-engine.js?v=13";

const WORLD = { width: 2400, height: 1800 };
const canvas = document.querySelector("#game-canvas");
const stage = document.querySelector("#game-stage");
const ctx = canvas.getContext("2d");
const $ = (selector) => document.querySelector(selector);

const artAtlas = new Image();
const artSprites = {
  player: [0, 0],
  bat: [1, 0],
  shade: [2, 0],
  brute: [3, 0],
  elite: [0, 1],
  projectile: [1, 1],
  gem: [2, 1],
  blade: [3, 1]
};
let artReady = false;
artAtlas.decoding = "async";
artAtlas.addEventListener("load", () => { artReady = true; });
artAtlas.src = "./assets/starlight-atlas.webp?v=13";

function drawArt(name, x, y, width, height, options = {}) {
  if (!artReady || !artAtlas.naturalWidth) return false;
  const sprite = artSprites[name];
  if (!sprite) return false;
  const cellWidth = artAtlas.naturalWidth / 4;
  const cellHeight = artAtlas.naturalHeight / 2;
  const inset = 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(options.rotation || 0);
  ctx.scale(options.flip ? -1 : 1, 1);
  ctx.globalAlpha *= options.alpha ?? 1;
  ctx.filter = options.filter || "none";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    artAtlas,
    sprite[0] * cellWidth + inset,
    sprite[1] * cellHeight + inset,
    cellWidth - inset * 2,
    cellHeight - inset * 2,
    -width / 2,
    -height / 2,
    width,
    height
  );
  ctx.restore();
  return true;
}

const animatedAtlas = new Image();
const animatedRows = { player: 0, bat: 1, shade: 2, brute: 3, elite: 4 };
let animatedArtReady = false;
animatedAtlas.decoding = "async";
animatedAtlas.addEventListener("load", () => { animatedArtReady = true; });
animatedAtlas.src = "./assets/animated-characters.webp?v=13";

function drawAnimatedArt(name, x, y, width, height, phase, options = {}) {
  if (!animatedArtReady || !animatedAtlas.naturalWidth || animatedRows[name] === undefined) {
    return drawArt(name, x, y, width, height, options);
  }
  const frameCount = 8;
  const wrappedPhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const frame = Math.floor(wrappedPhase / (Math.PI * 2) * frameCount) % frameCount;
  const cellWidth = animatedAtlas.naturalWidth / frameCount;
  const cellHeight = animatedAtlas.naturalHeight / 5;
  const inset = 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(options.rotation || 0);
  ctx.scale(options.flip ? -1 : 1, 1);
  ctx.globalAlpha *= options.alpha ?? 1;
  ctx.filter = options.filter || "none";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    animatedAtlas,
    frame * cellWidth + inset,
    animatedRows[name] * cellHeight + inset,
    cellWidth - inset * 2,
    cellHeight - inset * 2,
    -width / 2,
    -height / 2,
    width,
    height
  );
  ctx.restore();
  return true;
}

const playerRig = {
  body: new Image(),
  leftLeg: new Image(),
  rightLeg: new Image()
};
let playerRigPartsLoaded = 0;
for (const [part, filename] of [
  ["body", "player-rig-body.webp"],
  ["leftLeg", "player-rig-left-leg.webp"],
  ["rightLeg", "player-rig-right-leg.webp"]
]) {
  playerRig[part].decoding = "async";
  playerRig[part].addEventListener("load", () => { playerRigPartsLoaded += 1; });
  playerRig[part].src = "./assets/" + filename + "?v=13";
}

function drawRigPart(image, scale, pivotX, pivotY, rotation, lift, partScale) {
  ctx.save();
  ctx.translate((pivotX - 222) * scale, (pivotY - 222) * scale + lift);
  ctx.rotate(rotation);
  ctx.scale(partScale, partScale);
  ctx.drawImage(image, -pivotX * scale, -pivotY * scale, 444 * scale, 444 * scale);
  ctx.restore();
}

function drawRiggedPlayer(x, y, size, time, options = {}) {
  if (playerRigPartsLoaded < 3) {
    return drawAnimatedArt("player", x, y, size, size, time * 7, options);
  }
  const scale = size / 444;
  const phase = time * Math.PI * 2;
  const swing = Math.sin(phase) * (options.motion ?? 1);
  const stride = swing * 0.34;
  const leftForward = swing >= 0;
  const leftForwardAmount = Math.max(0, swing);
  const rightForwardAmount = Math.max(0, -swing);
  const leftLift = leftForwardAmount * 3 - rightForwardAmount * 5;
  const rightLift = rightForwardAmount * 2 - leftForwardAmount * 5;
  const leftScale = 1.12 + leftForwardAmount * 0.34 - rightForwardAmount * 0.08;
  const rightScale = 0.9 + rightForwardAmount * 0.18 - leftForwardAmount * 0.08;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(options.rotation || 0);
  ctx.scale(options.flip ? -1 : 1, 1);
  ctx.globalAlpha *= options.alpha ?? 1;
  ctx.filter = options.filter || "none";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (leftForward) {
    drawRigPart(playerRig.rightLeg, scale, 239, 342, stride, rightLift, rightScale);
    drawRigPart(playerRig.leftLeg, scale, 183, 350, stride, leftLift, leftScale);
  } else {
    drawRigPart(playerRig.leftLeg, scale, 183, 350, stride, leftLift, leftScale);
    drawRigPart(playerRig.rightLeg, scale, 239, 342, stride, rightLift, rightScale);
  }
  ctx.drawImage(playerRig.body, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

const ENEMY_TYPES = {
  shade: { hp: 18, speed: 47, radius: 18, damage: 10, xp: 25, color: "#6f557d" },
  bat: { hp: 10, speed: 82, radius: 12, damage: 7, xp: 15, color: "#4c415f" },
  brute: { hp: 68, speed: 34, radius: 27, damage: 16, xp: 60, color: "#765560" },
  elite: { hp: 290, speed: 39, radius: 42, damage: 23, xp: 400, color: "#927045" }
};

let run;
let player;
let enemies;
let projectiles;
let slashes;
let gems;
let particles;
let damageNumbers;
let started = false;
let paused = false;
let choosingAugment = false;
let gameEnded = false;
let spawnTimer = 0;
let attackTimer = 0;
let meleeTimer = 0;
let shotCounter = 0;
let enemyId = 0;
let elapsedVisual = 0;
let lastTime = performance.now();
let viewWidth = 390;
let viewHeight = 700;
let dpr = 1;
let screenShake = 0;
let castPulse = 0;
let meleePulse = 0;
let footstepTimer = 0;
let toastTimer;
let audioContext;
let soundEnabled = true;
const waveFlags = new Set();

const camera = { x: 0, y: 0 };
const joystick = { x: 0, y: 0, pointerId: null };
const keys = new Set();

const ruins = [];
const deadTrees = [];
const sigils = [];
for (let i = 0; i < 54; i += 1) {
  ruins.push({
    x: 100 + ((i * 337) % 2180),
    y: 100 + ((i * 191) % 1580),
    size: 20 + (i % 5) * 8,
    rotation: (i % 7) * 0.31
  });
}
for (let i = 0; i < 38; i += 1) {
  deadTrees.push({
    x: 80 + ((i * 421) % 2240),
    y: 80 + ((i * 263) % 1640),
    size: 28 + (i % 4) * 7
  });
}
for (let i = 0; i < 17; i += 1) {
  sigils.push({
    x: 150 + ((i * 577) % 2100),
    y: 130 + ((i * 359) % 1520),
    radius: 30 + (i % 4) * 9,
    rotation: (i % 9) * 0.38
  });
}

function resetGame() {
  run = createRunState();
  player = {
    x: WORLD.width / 2,
    y: WORLD.height / 2,
    radius: 15,
    facingX: 0,
    facingY: -1,
    moving: false,
    walkPhase: 0,
    walkBlend: 0
  };
  enemies = [];
  projectiles = [];
  slashes = [];
  gems = [];
  particles = [];
  damageNumbers = [];
  spawnTimer = 0;
  attackTimer = 0.2;
  meleeTimer = 0.25;
  shotCounter = 0;
  castPulse = 0;
  meleePulse = 0;
  footstepTimer = 0;
  gameEnded = false;
  choosingAugment = false;
  paused = false;
  waveFlags.clear();
  for (let i = 0; i < 7; i += 1) spawnEnemy(i % 3 === 0 ? "bat" : "shade", 300 + i * 12);
  updateHud();
  renderAugmentStrip();
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  viewWidth = Math.max(1, rect.width);
  viewHeight = Math.max(1, rect.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
}

function playTone(frequency, duration = 0.07, type = "sine", volume = 0.025) {
  if (!soundEnabled || !started) return;
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
    // Sound is optional.
  }
}

function updateHud() {
  const hpPercent = clamp(run.hp / run.maxHp * 100, 0, 100);
  const needed = xpNeeded(run.level);
  const xpPercent = clamp(run.xp / needed * 100, 0, 100);
  $("#health-fill").style.width = hpPercent + "%";
  $("#health-label").textContent = Math.ceil(run.hp) + " / " + run.maxHp;
  $("#level-label").textContent = "LV. " + run.level;
  $("#timer-label").textContent = formatTime(run.time);
  $("#kill-label").textContent = run.kills;
  $("#xp-fill").style.width = xpPercent + "%";
  $("#xp-label").textContent = run.xp + " / " + needed;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2100);
}

function showWave(kicker, title) {
  $("#wave-kicker").textContent = kicker;
  $("#wave-title").textContent = title;
  const banner = $("#wave-banner");
  banner.classList.remove("show");
  void banner.offsetWidth;
  banner.classList.add("show");
}

function spawnEnemy(forcedType, radiusOverride) {
  if (enemies.length > 190) return;
  const time = run.time;
  let type = forcedType;
  if (!type) {
    const roll = Math.random();
    if (time > 105 && roll < 0.22) type = "brute";
    else if (time > 35 && roll < 0.48) type = "bat";
    else type = "shade";
  }
  const template = ENEMY_TYPES[type];
  const angle = Math.random() * Math.PI * 2;
  const radius = radiusOverride || Math.max(viewWidth, viewHeight) * 0.67 + 100 + Math.random() * 100;
  const x = clamp(player.x + Math.cos(angle) * radius, 45, WORLD.width - 45);
  const y = clamp(player.y + Math.sin(angle) * radius, 45, WORLD.height - 45);
  const scaling = 1 + time / 210;
  enemies.push({
    id: ++enemyId,
    type,
    x,
    y,
    radius: template.radius,
    hp: template.hp * scaling,
    maxHp: template.hp * scaling,
    speed: template.speed * (1 + time / 520),
    damage: template.damage,
    xp: template.xp,
    color: template.color,
    attackCooldown: Math.random() * 0.4,
    hitFlash: 0,
    slow: 0,
    orbitalCooldown: 0,
    dead: false,
    phase: Math.random() * 6
  });
}

function spawnElite() {
  spawnEnemy("elite", Math.max(viewWidth, viewHeight) * 0.72 + 80);
  playTone(92, 0.55, "sawtooth", 0.035);
}

function getMovement() {
  let x = joystick.x;
  let y = joystick.y;
  if (keys.has("arrowleft") || keys.has("a")) x -= 1;
  if (keys.has("arrowright") || keys.has("d")) x += 1;
  if (keys.has("arrowup") || keys.has("w")) y -= 1;
  if (keys.has("arrowdown") || keys.has("s")) y += 1;
  return { x, y };
}

function movePlayer(dt) {
  const movement = getMovement();
  const length = Math.hypot(movement.x, movement.y);
  if (length < 0.08) {
    player.moving = false;
    player.walkBlend = Math.max(0, player.walkBlend - dt * 6);
    footstepTimer = 0;
    return;
  }
  const dx = movement.x / Math.max(1, length);
  const dy = movement.y / Math.max(1, length);
  player.facingX = dx;
  player.facingY = dy;
  player.moving = true;
  player.walkPhase += dt * (run.moveSpeed / 175);
  player.walkBlend = Math.min(1, player.walkBlend + dt * 8);
  player.x = clamp(player.x + dx * run.moveSpeed * dt, 40, WORLD.width - 40);
  player.y = clamp(player.y + dy * run.moveSpeed * dt, 40, WORLD.height - 40);
  footstepTimer -= dt;
  if (footstepTimer <= 0) {
    emitFootstep(player.x - dx * 9, player.y - dy * 9 + 17, dx, dy);
    footstepTimer = 0.5;
  }
}

function nearestEnemy(maxDistance = 720) {
  let target = null;
  let nearest = maxDistance;
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const d = distance(player, enemy);
    if (d < nearest) {
      nearest = d;
      target = enemy;
    }
  }
  return target;
}

function fireVolley(target, echo = false) {
  const dx = target ? target.x - player.x : player.facingX;
  const dy = target ? target.y - player.y : player.facingY;
  const baseAngle = Math.atan2(dy, dx);
  const count = run.projectileCount;
  const spread = count > 1 ? 0.17 : 0;
  const damage = currentDamage(run) * (echo ? 0.72 : 1);
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spread;
    const angle = baseAngle + offset;
    projectiles.push({
      x: player.x + Math.cos(angle) * 22,
      y: player.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * run.projectileSpeed,
      vy: Math.sin(angle) * run.projectileSpeed,
      radius: run.projectileSize,
      damage,
      life: 1.25,
      pierce: run.projectilePierce,
      hitIds: new Set(),
      dead: false,
      echo
    });
  }
  emitParticles(player.x, player.y, echo ? "#af85d5" : "#e6c477", 4 + count, 55);
  castPulse = Math.max(castPulse, echo ? 0.5 : 1);
  playTone(echo ? 620 : 510, 0.06, "triangle", echo ? 0.015 : 0.022);
}

function fireNova() {
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2;
    projectiles.push({
      x: player.x + Math.cos(angle) * 20,
      y: player.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * run.projectileSpeed * 0.86,
      vy: Math.sin(angle) * run.projectileSpeed * 0.86,
      radius: run.projectileSize * 0.85,
      damage: currentDamage(run) * 0.58,
      life: 1,
      pierce: 0,
      hitIds: new Set(),
      dead: false,
      echo: true
    });
  }
  emitParticles(player.x, player.y, "#e6c477", 18, 120);
  playTone(760, 0.12, "sine", 0.03);
}

function autoAttack(dt) {
  attackTimer -= dt;
  if (attackTimer > 0) return;
  const target = nearestEnemy();
  if (!target) return;
  fireVolley(target);
  shotCounter += 1;
  if (run.novaEvery > 0 && shotCounter % run.novaEvery === 0) fireNova();
  if (Math.random() < run.echoChance) fireVolley(target, true);
  attackTimer = run.cooldown;
}

function autoMelee(dt) {
  meleeTimer -= dt;
  if (meleeTimer > 0) return;
  const target = nearestEnemy(run.meleeRange + 40);
  if (!target) return;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const arc = Math.PI * 1.3;
  const baseDamage = currentMeleeDamage(run);
  slashes.push({ x: player.x, y: player.y, angle, radius: run.meleeRange, life: 0.24, maxLife: 0.24 });
  meleePulse = 1;

  for (const enemy of enemies) {
    if (enemy.dead || distance(player, enemy) > run.meleeRange + enemy.radius) continue;
    const enemyAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    const difference = Math.atan2(Math.sin(enemyAngle - angle), Math.cos(enemyAngle - angle));
    if (Math.abs(difference) > arc / 2) continue;
    const execute = run.meleeExecute > 0 && enemy.hp / enemy.maxHp <= run.meleeExecute;
    const damage = execute ? enemy.hp + 1 : baseDamage;
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    const d = Math.max(1, distance(player, enemy));
    enemy.x += (enemy.x - player.x) / d * 22;
    enemy.y += (enemy.y - player.y) / d * 22;
    addDamageNumber(enemy.x, enemy.y - enemy.radius, execute ? "처형" : Math.round(damage), "#d5ade9");
    if (enemy.hp <= 0) killEnemy(enemy, "melee");
  }
  emitParticles(player.x + Math.cos(angle) * run.meleeRange * 0.6, player.y + Math.sin(angle) * run.meleeRange * 0.6, "#c89ce2", 10, 90);
  playTone(310, 0.09, "sawtooth", 0.022);
  meleeTimer = run.meleeCooldown;
}

function updateSpawning(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const count = run.time > 130 ? 3 : run.time > 70 ? 2 : 1;
    for (let i = 0; i < count; i += 1) spawnEnemy();
    spawnTimer = Math.max(0.2, 0.82 - run.time * 0.0032);
  }

  const milestones = [
    [45, "wave-2", "SECOND WAVE", "날개 달린 그림자들이 깨어납니다"],
    [90, "wave-3", "NIGHT DEEPENS", "강한 적들이 전장을 뒤덮습니다"],
    [135, "wave-4", "FINAL ONSLAUGHT", "마지막 공세가 시작됩니다"],
    [160, "elite", "ANCIENT HORROR", "고대의 수호자가 나타났습니다"]
  ];
  for (const [time, id, kicker, title] of milestones) {
    if (run.time >= time && !waveFlags.has(id)) {
      waveFlags.add(id);
      showWave(kicker, title);
      spawnElite();
      if (id === "elite") spawnElite();
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.orbitalCooldown = Math.max(0, enemy.orbitalCooldown - dt);
    enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.phase += dt * 5;

    const d = distance(enemy, player);
    const dx = (player.x - enemy.x) / Math.max(1, d);
    const dy = (player.y - enemy.y) / Math.max(1, d);
    const slowMultiplier = enemy.slow > 0 ? 0.48 : 1;
    enemy.x += dx * enemy.speed * slowMultiplier * dt;
    enemy.y += dy * enemy.speed * slowMultiplier * dt;

    if (d < enemy.radius + player.radius && enemy.attackCooldown <= 0) {
      const bonusArmor = run.closeArmor > 0 && d <= run.meleeRange + enemy.radius ? run.closeArmor : 0;
      const result = takeDamage(run, enemy.damage, bonusArmor);
      run = result.state;
      enemy.attackCooldown = enemy.type === "elite" ? 1.05 : 0.72;
      enemy.x -= dx * 22;
      enemy.y -= dy * 22;
      screenShake = enemy.type === "elite" ? 12 : 6;
      emitParticles(player.x, player.y, "#d95f72", 9, 100);
      addDamageNumber(player.x, player.y - 25, "-" + result.damage, "#f18a96");
      playTone(115, 0.13, "sawtooth", 0.03);
      if (run.thorns > 0) {
        enemy.hp -= run.thorns;
        if (enemy.hp <= 0) killEnemy(enemy, "thorns");
      }
      updateHud();
      if (run.hp <= 0) endGame(false);
    }
  }
}

function updateProjectiles(dt) {
  for (const projectile of projectiles) {
    if (run.projectileHoming > 0) {
      let target = null;
      let nearest = 220;
      for (const enemy of enemies) {
        if (enemy.dead || projectile.hitIds.has(enemy.id)) continue;
        const d = distance(projectile, enemy);
        if (d < nearest) {
          nearest = d;
          target = enemy;
        }
      }
      if (target) {
        const speed = Math.hypot(projectile.vx, projectile.vy);
        const currentAngle = Math.atan2(projectile.vy, projectile.vx);
        const targetAngle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
        const difference = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
        const nextAngle = currentAngle + clamp(difference, -run.projectileHoming * dt, run.projectileHoming * dt);
        projectile.vx = Math.cos(nextAngle) * speed;
        projectile.vy = Math.sin(nextAngle) * speed;
      }
    }
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (projectile.life <= 0) projectile.dead = true;
    if (projectile.dead) continue;
    for (const enemy of enemies) {
      if (enemy.dead || projectile.hitIds.has(enemy.id) || distance(projectile, enemy) > projectile.radius + enemy.radius) continue;
      projectile.hitIds.add(enemy.id);
      enemy.hp -= projectile.damage;
      enemy.hitFlash = 0.1;
      if (Math.random() < run.slowChance) enemy.slow = 1.6;
      addDamageNumber(enemy.x, enemy.y - enemy.radius, Math.round(projectile.damage), "#f2dea0");
      emitParticles(projectile.x, projectile.y, projectile.echo ? "#af85d5" : "#e9cc84", 6, 90);
      if (enemy.hp <= 0) killEnemy(enemy, "ranged");
      if (projectile.pierce > 0) projectile.pierce -= 1;
      else projectile.dead = true;
      if (projectile.dead) break;
    }
  }
  projectiles = projectiles.filter((projectile) => !projectile.dead);
}

function orbitalPosition(index) {
  const angle = elapsedVisual * 2.7 * run.orbitalSpeedMultiplier + index / Math.max(1, run.orbitals) * Math.PI * 2;
  return { x: player.x + Math.cos(angle) * 64, y: player.y + Math.sin(angle) * 64, angle };
}

function updateOrbitals() {
  if (!run.orbitals) return;
  for (let i = 0; i < run.orbitals; i += 1) {
    const blade = orbitalPosition(i);
    for (const enemy of enemies) {
      if (enemy.dead || enemy.orbitalCooldown > 0 || distance(blade, enemy) > enemy.radius + 13) continue;
      const damage = currentDamage(run) * 0.62 * run.orbitalDamageMultiplier;
      enemy.hp -= damage;
      enemy.orbitalCooldown = 0.38;
      enemy.hitFlash = 0.1;
      addDamageNumber(enemy.x, enemy.y - enemy.radius, Math.round(damage), "#c9a9e4");
      emitParticles(blade.x, blade.y, "#b991db", 5, 75);
      if (enemy.hp <= 0) killEnemy(enemy, "orbital");
    }
  }
}

function killEnemy(enemy, source = "ranged") {
  if (enemy.dead) return;
  enemy.dead = true;
  run = registerKill(run, source);
  gems.push({
    x: enemy.x,
    y: enemy.y,
    value: enemy.xp,
    radius: enemy.type === "elite" ? 10 : enemy.xp > 2 ? 7 : 5,
    phase: Math.random() * 6,
    vx: 0,
    vy: 0
  });
  emitParticles(enemy.x, enemy.y, enemy.type === "elite" ? "#e6c477" : "#8d6ca7", enemy.type === "elite" ? 28 : 13, 130);
  if (enemy.type === "elite") {
    showToast("정예 처치! 거대한 경험치 결정이 떨어졌습니다.");
    screenShake = 14;
  }
  updateHud();
}

function updateGems(dt) {
  for (const gem of gems) {
    gem.phase += dt * 4;
    const d = distance(gem, player);
    const attractionRange = run.pickupRadius * 3.2;
    if (d < attractionRange) {
      const speed = 220 + (attractionRange - Math.min(attractionRange, d)) * 2.2;
      gem.vx += (player.x - gem.x) / Math.max(1, d) * speed * dt;
      gem.vy += (player.y - gem.y) / Math.max(1, d) * speed * dt;
    }
    gem.x += gem.vx * dt;
    gem.y += gem.vy * dt;
    gem.vx *= 0.94;
    gem.vy *= 0.94;
    if (d < player.radius + 10) {
      gem.collected = true;
      const gained = gainExperience(run, gem.value);
      run = gained.state;
      playTone(760 + gem.value * 20, 0.05, "sine", 0.016);
    }
  }
  gems = gems.filter((gem) => !gem.collected);
  if (run.pendingLevelUps > 0 && !choosingAugment) showAugmentChoices();
  updateHud();
}

function showAugmentChoices() {
  const choices = rollAugments(run);
  if (!choices.length) {
    run.damage *= 1.15;
    run.meleeDamage *= 1.15;
    run = consumePendingLevelUp(run);
    showToast("모든 증강 완성: 피해량이 15% 증가합니다.");
    if (run.pendingLevelUps > 0) setTimeout(showAugmentChoices, 120);
    return;
  }
  choosingAugment = true;
  $("#augment-queue").textContent = run.pendingLevelUps > 1
    ? "연속 레벨업 · 남은 선택 " + run.pendingLevelUps + "회"
    : "이번 생존에 적용할 힘을 하나 고르세요";
  const container = $("#augment-cards");
  container.innerHTML = choices.map((id) => {
    const augment = AUGMENTS[id];
    const legendary = augment.rarity === "전설" ? " legendary" : "";
    return "<button class=\"augment-card weapon-" + augment.weapon + legendary + "\" data-augment=\"" + id + "\">" +
      "<span class=\"augment-icon\">" + augment.icon + "</span>" +
      "<span class=\"augment-copy\"><small><em>" + WEAPON_LABELS[augment.weapon] + "</em>" + augment.rarity + "</small><h3>" + augment.name +
      "</h3><p>" + augment.description + "</p></span><span class=\"augment-arrow\">›</span></button>";
  }).join("");
  $("#augment-screen").hidden = false;
  playTone(880, 0.28, "sine", 0.035);
}

function chooseAugment(id) {
  if (!AUGMENTS[id]) return;
  run = applyAugment(run, id);
  run.hp = Math.min(run.hp, run.maxHp);
  run = consumePendingLevelUp(run);
  choosingAugment = false;
  $("#augment-screen").hidden = true;
  renderAugmentStrip();
  updateHud();
  showToast(AUGMENTS[id].name + " 획득!");
  emitParticles(player.x, player.y, "#e6c477", 20, 110);
  if (run.pendingLevelUps > 0) setTimeout(showAugmentChoices, 120);
}

function renderAugmentStrip() {
  $("#augment-strip").innerHTML = run.augments.map((id) => (
    "<span class=\"augment-chip weapon-" + AUGMENTS[id].weapon + "\" title=\"" +
      WEAPON_LABELS[AUGMENTS[id].weapon] + " · " + AUGMENTS[id].name + "\">" + AUGMENTS[id].icon + "</span>"
  )).join("");
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
  for (const number of damageNumbers) {
    number.y -= 30 * dt;
    number.life -= dt;
  }
  damageNumbers = damageNumbers.filter((number) => number.life > 0);
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
      life: 0.28 + Math.random() * 0.5,
      maxLife: 0.78,
      size: 2 + Math.random() * 3.5,
      color
    });
  }
}

function emitFootstep(x, y, directionX, directionY) {
  for (let i = 0; i < 3; i += 1) {
    particles.push({
      x: x + (Math.random() - 0.5) * 7,
      y: y + (Math.random() - 0.5) * 3,
      vx: -directionX * 7 + (Math.random() - 0.5) * 16,
      vy: -directionY * 5 - 4 - Math.random() * 7,
      life: 0.18 + Math.random() * 0.12,
      maxLife: 0.3,
      size: 0.8 + Math.random() * 1.5,
      color: "rgba(134,116,150,.34)"
    });
  }
}

function addDamageNumber(x, y, text, color) {
  damageNumbers.push({ x: x + (Math.random() - 0.5) * 14, y, text, color, life: 0.65, maxLife: 0.65 });
}

function update(dt) {
  elapsedVisual += dt;
  screenShake = Math.max(0, screenShake - dt * 28);
  castPulse = Math.max(0, castPulse - dt * 7.5);
  meleePulse = Math.max(0, meleePulse - dt * 5.5);
  updateParticles(dt);
  if (!started || paused || choosingAugment || gameEnded) return;

  run.time += dt;
  if (run.time >= RUN_DURATION) {
    run.time = RUN_DURATION;
    updateHud();
    endGame(true);
    return;
  }
  movePlayer(dt);
  updateSpawning(dt);
  autoAttack(dt);
  autoMelee(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateOrbitals();
  updateGems(dt);
  enemies = enemies.filter((enemy) => !enemy.dead);
  updateHud();
}

function endGame(won) {
  gameEnded = true;
  $("#result-emblem").textContent = won ? "♛" : "☠";
  $("#result-kicker").textContent = won ? "SURVIVOR" : "FALLEN";
  $("#result-title").textContent = won ? "새벽까지 살아남았습니다" : "어둠에 삼켜졌습니다";
  $("#result-copy").textContent = won
    ? "선택한 증강이 하나의 빌드가 되어 마지막 공세를 버텨냈습니다."
    : "다른 증강 조합으로 다시 도전해 더 오래 살아남아 보세요.";
  $("#result-level").textContent = run.level;
  $("#result-kills").textContent = run.kills;
  $("#result-augments").textContent = run.augments.length;
  $("#result-screen").hidden = false;
  playTone(won ? 880 : 110, 0.55, won ? "sine" : "sawtooth", 0.04);
}

function drawGround() {
  ctx.fillStyle = "#171522";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const haze = ctx.createRadialGradient(WORLD.width * 0.5, WORLD.height * 0.45, 80, WORLD.width * 0.5, WORLD.height * 0.45, 1100);
  haze.addColorStop(0, "rgba(77,55,101,.2)");
  haze.addColorStop(0.55, "rgba(35,29,53,.08)");
  haze.addColorStop(1, "rgba(5,5,12,.28)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const tile = 96;
  for (let y = 0; y < WORLD.height; y += tile) {
    for (let x = 0; x < WORLD.width; x += tile) {
      const hash = ((x / tile) * 7 + (y / tile) * 13) % 7;
      ctx.fillStyle = hash < 2 ? "rgba(125,105,153,.025)" : "rgba(0,0,0,.025)";
      ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      ctx.strokeStyle = "rgba(181,160,205,.025)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tile, tile);
      if (hash === 3) {
        ctx.strokeStyle = "rgba(121,91,153,.07)";
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 46);
        ctx.lineTo(x + 38, y + 39);
        ctx.lineTo(x + 49, y + 61);
        ctx.lineTo(x + 78, y + 55);
        ctx.stroke();
      }
    }
  }

  for (const sigil of sigils) {
    ctx.save();
    ctx.translate(sigil.x, sigil.y);
    ctx.rotate(sigil.rotation);
    ctx.strokeStyle = "rgba(169,124,209,.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, sigil.radius, 0, Math.PI * 2);
    ctx.moveTo(-sigil.radius, 0);
    ctx.lineTo(sigil.radius, 0);
    ctx.moveTo(0, -sigil.radius);
    ctx.lineTo(0, sigil.radius);
    ctx.stroke();
    ctx.strokeStyle = "rgba(231,199,117,.05)";
    ctx.strokeRect(-sigil.radius * 0.48, -sigil.radius * 0.48, sigil.radius * 0.96, sigil.radius * 0.96);
    ctx.restore();
  }

  for (const ruin of ruins) {
    ctx.save();
    ctx.translate(ruin.x, ruin.y);
    ctx.rotate(ruin.rotation);
    ctx.fillStyle = "rgba(8,7,14,.22)";
    ctx.beginPath();
    ctx.ellipse(3, ruin.size * 0.24, ruin.size * 0.68, ruin.size * 0.23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(75,66,88,.46)";
    ctx.beginPath();
    ctx.moveTo(-ruin.size * 0.56, ruin.size * 0.22);
    ctx.lineTo(-ruin.size * 0.38, -ruin.size * 0.23);
    ctx.lineTo(ruin.size * 0.38, -ruin.size * 0.3);
    ctx.lineTo(ruin.size * 0.55, ruin.size * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(174,151,195,.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  for (const tree of deadTrees) {
    ctx.strokeStyle = "rgba(42,32,53,.72)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tree.x, tree.y + tree.size);
    ctx.lineTo(tree.x, tree.y - tree.size);
    ctx.moveTo(tree.x, tree.y - tree.size * 0.3);
    ctx.lineTo(tree.x - tree.size * 0.55, tree.y - tree.size * 0.65);
    ctx.moveTo(tree.x, tree.y - tree.size * 0.5);
    ctx.lineTo(tree.x + tree.size * 0.5, tree.y - tree.size * 0.9);
    ctx.stroke();
    ctx.strokeStyle = "rgba(108,78,124,.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(230,196,119,.16)";
  ctx.lineWidth = 5;
  ctx.strokeRect(22, 22, WORLD.width - 44, WORLD.height - 44);
  ctx.strokeStyle = "rgba(156,116,195,.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(34, 34, WORLD.width - 68, WORLD.height - 68);
}

function drawPlayer() {
  const facingSign = player.facingX < -0.04 ? -1 : 1;
  drawShadow(player.x, player.y + 19, 23, 8, 0.34);
  if (castPulse > 0) {
    const focusX = player.x + player.facingX * 27;
    const focusY = player.y - 8 + player.facingY * 18;
    ctx.save();
    ctx.globalAlpha = castPulse;
    ctx.strokeStyle = "#f2d982";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#b985e0";
    ctx.shadowBlur = 13;
    ctx.beginPath();
    ctx.arc(focusX, focusY, 7 + (1 - castPulse) * 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const artOptions = {
    flip: facingSign < 0,
    rotation: facingSign * meleePulse * 0.08
  };
  const artX = player.x - player.facingX * castPulse * 3;
  artOptions.motion = player.walkBlend;
  if (drawRiggedPlayer(artX, player.y - 27, 96 * (1 + meleePulse * 0.035), player.walkPhase, artOptions)) return;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.fillStyle = "#544064";
  ctx.beginPath();
  ctx.moveTo(-16, 11);
  ctx.quadraticCurveTo(0, -5, 16, 11);
  ctx.lineTo(20, 31);
  ctx.lineTo(-20, 31);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d7b46c";
  ctx.fillRect(-12, 11, 24, 4);
  ctx.fillStyle = "#e5b993";
  ctx.beginPath();
  ctx.arc(0, -7, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#201827";
  ctx.beginPath();
  ctx.arc(0, -11, 12, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-18, -12);
  ctx.lineTo(3, -39);
  ctx.lineTo(19, -11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a883c6";
  ctx.fillRect(-18, -14, 37, 4);
  ctx.strokeStyle = "#70563a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(22, 28);
  ctx.stroke();
  ctx.fillStyle = "#e9ce7c";
  ctx.beginPath();
  ctx.arc(14, -3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  const bounce = Math.sin(enemy.phase) * (enemy.type === "bat" ? 5 : 2);
  drawShadow(enemy.x, enemy.y + enemy.radius * 0.78, enemy.radius, enemy.radius * 0.3, enemy.type === "elite" ? 0.44 : 0.3);
  const sizes = { bat: 57, shade: 67, brute: 96, elite: 134 };
  const animationSpeeds = { bat: 2.25, shade: 0.82, brute: 1, elite: 0.68 };
  const animationPhase = enemy.phase * animationSpeeds[enemy.type];
  if (enemy.type === "elite") {
    const pulse = (Math.sin(animationPhase) + 1) * 0.5;
    const aura = ctx.createRadialGradient(enemy.x, enemy.y, 4, enemy.x, enemy.y, 58 + pulse * 10);
    aura.addColorStop(0, "rgba(178,119,224,.2)");
    aura.addColorStop(0.55, "rgba(222,187,104,.07)");
    aura.addColorStop(1, "rgba(90,54,130,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 68, 0, Math.PI * 2);
    ctx.fill();
  }
  if (enemy.type === "shade") {
    drawAnimatedArt(enemy.type, enemy.x, enemy.y + bounce + 5, sizes[enemy.type] * 0.98, sizes[enemy.type] * 0.98, animationPhase - 0.55, {
      flip: enemy.x > player.x,
      alpha: 0.13,
      filter: "blur(1px)"
    });
  }
  const spriteDrawn = drawAnimatedArt(enemy.type, enemy.x, enemy.y + bounce - enemy.radius * 0.08, sizes[enemy.type], sizes[enemy.type], animationPhase, {
    flip: enemy.x > player.x,
    filter: enemy.hitFlash > 0 ? "brightness(2.2) saturate(.35)" : "none"
  });
  if (!spriteDrawn) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bounce);
    ctx.fillStyle = enemy.hitFlash > 0 ? "#f7f0e5" : enemy.color;
    if (enemy.type === "bat") {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.type === "elite" ? "#e5c375" : "#c4acc9";
      ctx.beginPath();
      ctx.arc(-enemy.radius * 0.34, -3, enemy.type === "elite" ? 5 : 3, 0, Math.PI * 2);
      ctx.arc(enemy.radius * 0.34, -3, enemy.type === "elite" ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (enemy.type === "elite" || enemy.hp < enemy.maxHp) {
    const width = enemy.type === "elite" ? 78 : enemy.radius * 2;
    ctx.fillStyle = "rgba(10,7,12,.72)";
    roundedRect(enemy.x - width / 2, enemy.y - enemy.radius - 16, width, 5, 3);
    ctx.fill();
    ctx.fillStyle = enemy.type === "elite" ? "#d5aa56" : "#956b9f";
    roundedRect(enemy.x - width / 2 + 1, enemy.y - enemy.radius - 15, (width - 2) * clamp(enemy.hp / enemy.maxHp, 0, 1), 3, 2);
    ctx.fill();
  }
}

function drawGems() {
  for (const gem of gems) {
    const y = gem.y + Math.sin(gem.phase) * 3;
    const size = gem.value >= 400 ? 35 : gem.value >= 60 ? 25 : 19;
    if (gem.value >= 400) {
      const aura = ctx.createRadialGradient(gem.x, y, 2, gem.x, y, 26);
      aura.addColorStop(0, "rgba(232,205,127,.28)");
      aura.addColorStop(1, "rgba(139,100,190,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(gem.x, y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!drawArt("gem", gem.x, y, size, size, { rotation: Math.sin(gem.phase * 0.4) * 0.08 })) {
      ctx.fillStyle = gem.value >= 10 ? "#e7c677" : gem.value >= 5 ? "#bd82d3" : "#73bfcb";
      ctx.beginPath();
      ctx.moveTo(gem.x, y - gem.radius);
      ctx.lineTo(gem.x + gem.radius * 0.7, y);
      ctx.lineTo(gem.x, y + gem.radius);
      ctx.lineTo(gem.x - gem.radius * 0.7, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    const size = Math.max(27, projectile.radius * 5.4);
    if (!drawArt("projectile", projectile.x, projectile.y, size, size, {
      rotation: elapsedVisual * 3.5 + Math.atan2(projectile.vy, projectile.vx) * 0.12,
      alpha: projectile.echo ? 0.78 : 1,
      filter: projectile.echo ? "hue-rotate(28deg)" : "none"
    })) {
      const glow = ctx.createRadialGradient(projectile.x, projectile.y, 1, projectile.x, projectile.y, projectile.radius * 2.4);
      glow.addColorStop(0, "#fff8ce");
      glow.addColorStop(0.4, projectile.echo ? "#b48ad3" : "#e7c573");
      glow.addColorStop(1, "rgba(180,130,210,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSlashes() {
  for (const slash of slashes) {
    const progress = 1 - slash.life / slash.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI);
    ctx.strokeStyle = "#d9b5eb";
    ctx.lineWidth = 12 - progress * 5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#a775ca";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(slash.x, slash.y, slash.radius * (0.72 + progress * 0.28), slash.angle - Math.PI * 0.65, slash.angle + Math.PI * 0.65);
    ctx.stroke();
    ctx.strokeStyle = "#f4e6fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(slash.x, slash.y, slash.radius * (0.72 + progress * 0.28), slash.angle - Math.PI * 0.65, slash.angle + Math.PI * 0.65);
    ctx.stroke();
    ctx.restore();
  }
}

function drawOrbitals() {
  for (let i = 0; i < run.orbitals; i += 1) {
    const blade = orbitalPosition(i);
    if (drawArt("blade", blade.x, blade.y, 46, 46, { rotation: blade.angle + Math.PI / 2 })) continue;
    ctx.save();
    ctx.translate(blade.x, blade.y);
    ctx.rotate(blade.angle + Math.PI / 2);
    ctx.fillStyle = "#d8b7e8";
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(6, 8);
    ctx.lineTo(0, 13);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e6c477";
    ctx.fillRect(-2, 9, 4, 8);
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
  ctx.font = "900 12px system-ui";
  for (const number of damageNumbers) {
    ctx.globalAlpha = clamp(number.life / number.maxLife, 0, 1);
    ctx.fillStyle = number.color;
    ctx.fillText(number.text, number.x, number.y);
  }
  ctx.globalAlpha = 1;
}

function drawShadow(x, y, rx, ry, opacity = 0.25) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const shadow = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
  shadow.addColorStop(0, "rgba(0,0,0," + opacity + ")");
  shadow.addColorStop(0.65, "rgba(0,0,0," + opacity * 0.62 + ")");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  const targetX = clamp(player.x - viewWidth / 2, 0, WORLD.width - viewWidth);
  const targetY = clamp(player.y - viewHeight / 2, 0, WORLD.height - viewHeight);
  camera.x += (targetX - camera.x) * 0.13;
  camera.y += (targetY - camera.y) * 0.13;
  const shakeX = screenShake ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake ? (Math.random() - 0.5) * screenShake : 0;
  ctx.save();
  ctx.translate(-camera.x + shakeX, -camera.y + shakeY);
  drawGround();
  drawGems();
  enemies.forEach(drawEnemy);
  drawProjectiles();
  drawSlashes();
  drawOrbitals();
  drawPlayer();
  drawEffects();
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.033, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function startGame() {
  started = true;
  $("#start-screen").classList.add("hidden");
  showWave("THE FIRST WAVE", "어둠이 몰려옵니다");
  playTone(523, 0.12, "sine", 0.03);
  setTimeout(() => playTone(784, 0.2, "sine", 0.025), 100);
}

function restartGame() {
  $("#result-screen").hidden = true;
  resetGame();
  startGame();
}

function togglePause(force) {
  if (!started || gameEnded || choosingAugment) return;
  paused = typeof force === "boolean" ? force : !paused;
  $("#pause-screen").hidden = !paused;
}

function updateJoystick(event) {
  const rect = $("#joystick").getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const max = rect.width * 0.34;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const length = Math.hypot(dx, dy);
  if (length > max) {
    dx = dx / length * max;
    dy = dy / length * max;
  }
  joystick.x = dx / max;
  joystick.y = dy / max;
  $("#joystick-knob").style.transform = "translate(" + dx + "px, " + dy + "px)";
}

function releaseJoystick() {
  joystick.x = 0;
  joystick.y = 0;
  joystick.pointerId = null;
  $("#joystick-knob").style.transform = "translate(0, 0)";
}

$("#joystick").addEventListener("pointerdown", (event) => {
  joystick.pointerId = event.pointerId;
  event.currentTarget.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
$("#joystick").addEventListener("pointermove", (event) => {
  if (event.pointerId === joystick.pointerId) updateJoystick(event);
});
$("#joystick").addEventListener("pointerup", releaseJoystick);
$("#joystick").addEventListener("pointercancel", releaseJoystick);
$("#augment-cards").addEventListener("click", (event) => {
  const card = event.target.closest("[data-augment]");
  if (card) chooseAugment(card.dataset.augment);
});
$("#start-button").addEventListener("click", startGame);
$("#restart-button").addEventListener("click", restartGame);
$("#pause-button").addEventListener("click", () => togglePause());
$("#resume-button").addEventListener("click", () => togglePause(false));

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "escape"].includes(key)) {
    event.preventDefault();
  }
  if (key === "escape") togglePause();
  else keys.add(key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetGame();
requestAnimationFrame(loop);
