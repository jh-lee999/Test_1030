import {
  clamp,
  collectLoot,
  createProgress,
  distance,
  registerEnemyDefeat,
  restoreProgress,
  talkToLuna,
  usePotion,
  xpNeeded
} from "./rpg-engine.js";

const SAVE_KEY = "moonlight-rpg-save-v2";
const WORLD = { width: 1400, height: 1000 };
const canvas = document.querySelector("#game-canvas");
const stage = document.querySelector("#game-stage");
const ctx = canvas.getContext("2d");
const $ = (selector) => document.querySelector(selector);

let progress = loadProgress();
let player;
let enemies;
let projectiles;
let particles;
let loot;
let totalKills = progress.slimeKills;
let started = false;
let dialogueOpen = false;
let gameEnded = false;
let soundEnabled = true;
let audioContext;
let lastTime = performance.now();
let elapsed = 0;
let viewWidth = 390;
let viewHeight = 700;
let dpr = 1;
let screenShake = 0;
let attackCooldown = 0;
let toastTimer;
let nearbyNpc = null;

const camera = { x: 0, y: 0 };
const keys = new Set();
const joystick = { x: 0, y: 0, pointerId: null };

const npcs = [
  { id: "luna", name: "달빛 마녀 루나", x: 680, y: 540, color: "#9c78c6" },
  { id: "pico", name: "상인 피코", x: 845, y: 530, color: "#cc8b69" }
];

const houses = [
  { x: 470, y: 305, w: 220, h: 155, roof: "#795b8e", wall: "#d8c39e", door: "#6d4f3c" },
  { x: 790, y: 315, w: 205, h: 145, roof: "#547e7a", wall: "#d5c59d", door: "#684b39" }
];

const obstacles = [
  { x: 485, y: 345, w: 190, h: 115 },
  { x: 805, y: 355, w: 175, h: 105 },
  { x: 180, y: 650, w: 240, h: 155 }
];

const enemySpawns = [
  [235, 205], [1050, 210], [1190, 455], [245, 500],
  [350, 835], [1050, 820], [760, 150], [1240, 760]
];

const trees = [];
const flowers = [];
for (let i = 0; i < 74; i += 1) {
  const angle = i * 2.399;
  const edge = i % 3;
  let x;
  let y;
  if (edge === 0) {
    x = 45 + ((i * 137) % 1310);
    y = 45 + ((i * 67) % 120);
  } else if (edge === 1) {
    x = 40 + ((i * 91) % 130);
    y = 170 + ((i * 113) % 760);
  } else {
    x = 1220 + ((i * 41) % 135);
    y = 170 + ((i * 83) % 760);
  }
  trees.push({ x, y, size: 30 + (i % 4) * 5, shade: i % 3, phase: angle });
}
for (let i = 0; i < 95; i += 1) {
  const x = 170 + ((i * 127) % 1050);
  const y = 190 + ((i * 73) % 730);
  if (!obstacles.some((o) => x > o.x - 20 && x < o.x + o.w + 20 && y > o.y - 20 && y < o.y + o.h + 20)) {
    flowers.push({ x, y, color: ["#f5cf83", "#d4b8ed", "#f2a9b7"][i % 3] });
  }
}

function loadProgress() {
  try {
    return restoreProgress(JSON.parse(localStorage.getItem(SAVE_KEY)));
  } catch {
    return createProgress();
  }
}

function saveProgress() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}

function makeEnemy(type, x, y) {
  const boss = type === "boss";
  return {
    type,
    x,
    y,
    spawnX: x,
    spawnY: y,
    radius: boss ? 46 : 22,
    hp: boss ? 18 : 2,
    maxHp: boss ? 18 : 2,
    speed: boss ? 42 : 48,
    angle: Math.random() * Math.PI * 2,
    wanderTime: 1 + Math.random() * 2,
    hitFlash: 0,
    dead: false,
    respawn: 0
  };
}

function resetWorld() {
  player = {
    x: 735,
    y: 650,
    radius: 15,
    speed: 190,
    hp: progress.maxHp,
    facingX: 0,
    facingY: -1,
    moving: false,
    invulnerable: 0
  };
  enemies = enemySpawns.map(([x, y]) => makeEnemy("slime", x, y));
  if (progress.quest === "boss" && !progress.bossDefeated) spawnBoss();
  projectiles = [];
  particles = [];
  loot = [];
  updateHud();
  updateQuest();
}

function spawnBoss() {
  if (!enemies.some((enemy) => enemy.type === "boss" && !enemy.dead)) {
    enemies.push(makeEnemy("boss", 700, 125));
    showToast("북쪽 폐허에 킹 슬라임이 나타났습니다!");
  }
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  viewWidth = Math.max(1, rect.width);
  viewHeight = Math.max(1, rect.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
}

function playTone(frequency, duration = 0.08, type = "sine", volume = 0.035) {
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
    // Audio is optional.
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function showDialogue(name, text, avatar = "☾") {
  dialogueOpen = true;
  $("#dialogue-name").textContent = name;
  $("#dialogue-text").textContent = text;
  $("#dialogue-avatar").textContent = avatar;
  $("#dialogue").hidden = false;
}

function closeDialogue() {
  dialogueOpen = false;
  $("#dialogue").hidden = true;
  if (progress.completed) showResult(true);
}

function updateHud() {
  const hpPercent = clamp((player?.hp ?? progress.maxHp) / progress.maxHp * 100, 0, 100);
  const xpPercent = clamp(progress.xp / xpNeeded(progress.level) * 100, 0, 100);
  $("#level-label").textContent = "LV. " + progress.level;
  $("#hp-label").textContent = Math.ceil(player?.hp ?? progress.maxHp) + " / " + progress.maxHp;
  $("#hp-fill").style.width = hpPercent + "%";
  $("#xp-fill").style.width = xpPercent + "%";
  $("#coin-label").textContent = progress.coins;
  $("#crystal-label").textContent = progress.crystals;
  $("#potion-count").textContent = progress.potions;
}

function updateQuest() {
  const data = {
    meet_luna: ["달빛 마녀 루나를 만나기", ""],
    slime_hunt: ["그림자 슬라임 물리치기", progress.slimeKills + " / " + progress.slimeGoal],
    boss: ["북쪽 폐허의 킹 슬라임 처치", "BOSS"],
    boss_done: ["루나에게 승리 알리기", "!"],
    complete: ["달빛 마을에 평화가 찾아왔습니다", "✓"]
  }[progress.quest] || ["마을을 탐험하기", ""];
  $("#quest-title").textContent = data[0];
  $("#quest-progress").textContent = data[1];
}

function isBlocked(x, y, radius) {
  if (x < 35 + radius || y < 35 + radius || x > WORLD.width - 35 - radius || y > WORLD.height - 35 - radius) return true;
  return obstacles.some((rect) => (
    x + radius > rect.x &&
    x - radius < rect.x + rect.w &&
    y + radius > rect.y &&
    y - radius < rect.y + rect.h
  ));
}

function movePlayer(dx, dy, dt) {
  const length = Math.hypot(dx, dy);
  if (length < 0.08) {
    player.moving = false;
    return;
  }
  dx /= Math.max(1, length);
  dy /= Math.max(1, length);
  player.facingX = dx;
  player.facingY = dy;
  player.moving = true;
  const move = player.speed * dt;
  const nextX = player.x + dx * move;
  const nextY = player.y + dy * move;
  if (!isBlocked(nextX, player.y, player.radius)) player.x = nextX;
  if (!isBlocked(player.x, nextY, player.radius)) player.y = nextY;
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

function attack() {
  if (!started || dialogueOpen || gameEnded || attackCooldown > 0) return;
  attackCooldown = Math.max(0.22, 0.38 - progress.level * 0.015);
  const length = Math.hypot(player.facingX, player.facingY) || 1;
  const dx = player.facingX / length;
  const dy = player.facingY / length;
  projectiles.push({
    x: player.x + dx * 23,
    y: player.y + dy * 23,
    vx: dx * 520,
    vy: dy * 520,
    radius: 9,
    life: 0.72,
    damage: progress.attackDamage,
    dead: false
  });
  emitParticles(player.x + dx * 22, player.y + dy * 22, "#e8d197", 5, 60);
  playTone(460, 0.08, "triangle", 0.03);
}

function useHealingPotion() {
  if (!started || dialogueOpen || gameEnded) return;
  const result = usePotion(progress, player.hp);
  progress = result.progress;
  if (!result.used) {
    showToast(progress.potions < 1 ? "회복 물약이 없습니다." : "이미 체력이 가득합니다.");
    return;
  }
  player.hp = result.hp;
  emitParticles(player.x, player.y, "#ff9caf", 16, 85);
  playTone(620, 0.22, "sine", 0.04);
  saveProgress();
  updateHud();
  showToast("체력을 45 회복했습니다.");
}

function interact() {
  if (!started || gameEnded) return;
  if (dialogueOpen) {
    closeDialogue();
    return;
  }
  if (!nearbyNpc) {
    showToast("가까이 있는 사람에게 다가가 보세요.");
    return;
  }
  if (nearbyNpc.id === "luna") {
    const result = talkToLuna(progress);
    const oldQuest = progress.quest;
    progress = result.progress;
    if (oldQuest !== "boss" && progress.quest === "boss") spawnBoss();
    if (result.leveledUp) {
      player.hp = progress.maxHp;
      showToast("레벨 " + progress.level + "! 마법이 더 강해졌습니다.");
    }
    saveProgress();
    updateHud();
    updateQuest();
    showDialogue(nearbyNpc.name, result.dialogue, "☾");
    playTone(720, 0.08, "sine", 0.025);
  } else {
    showDialogue(
      nearbyNpc.name,
      progress.potions > 0
        ? "북쪽 숲은 위험해. 다치면 오른쪽의 하트 물약을 눌러!"
        : "물약을 모두 썼구나! 레벨이 오르면 새 물약을 하나 받을 수 있어.",
      "♧"
    );
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    if (enemy.dead) {
      if (enemy.type === "boss") continue;
      enemy.respawn -= dt;
      if (enemy.respawn <= 0 && !progress.completed) {
        enemy.dead = false;
        enemy.hp = enemy.maxHp;
        enemy.x = enemy.spawnX;
        enemy.y = enemy.spawnY;
      }
      continue;
    }

    const playerDistance = distance(enemy, player);
    let dx;
    let dy;
    if (playerDistance < (enemy.type === "boss" ? 430 : 275)) {
      dx = (player.x - enemy.x) / Math.max(1, playerDistance);
      dy = (player.y - enemy.y) / Math.max(1, playerDistance);
    } else {
      enemy.wanderTime -= dt;
      if (enemy.wanderTime <= 0) {
        enemy.wanderTime = 1.2 + Math.random() * 2.2;
        enemy.angle += (Math.random() - 0.5) * 2.6;
      }
      dx = Math.cos(enemy.angle) * 0.45;
      dy = Math.sin(enemy.angle) * 0.45;
    }

    const speed = enemy.speed * (enemy.type === "boss" && enemy.hp < enemy.maxHp / 2 ? 1.35 : 1);
    const nextX = enemy.x + dx * speed * dt;
    const nextY = enemy.y + dy * speed * dt;
    if (!isBlocked(nextX, enemy.y, enemy.radius)) enemy.x = nextX;
    else enemy.angle += Math.PI / 2;
    if (!isBlocked(enemy.x, nextY, enemy.radius)) enemy.y = nextY;
    else enemy.angle += Math.PI / 2;

    if (playerDistance < enemy.radius + player.radius + 2 && player.invulnerable <= 0) {
      player.hp = Math.max(0, player.hp - (enemy.type === "boss" ? 24 : 11));
      player.invulnerable = 1;
      screenShake = enemy.type === "boss" ? 12 : 7;
      const knockX = (player.x - enemy.x) / Math.max(1, playerDistance);
      const knockY = (player.y - enemy.y) / Math.max(1, playerDistance);
      player.x = clamp(player.x + knockX * 24, 40, WORLD.width - 40);
      player.y = clamp(player.y + knockY * 24, 40, WORLD.height - 40);
      emitParticles(player.x, player.y, "#ed7186", 10, 110);
      playTone(120, 0.18, "sawtooth", 0.035);
      updateHud();
      if (player.hp <= 0) showResult(false);
    }
  }
}

function updateProjectiles(dt) {
  for (const projectile of projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (projectile.life <= 0 || isBlocked(projectile.x, projectile.y, projectile.radius)) projectile.dead = true;
    if (projectile.dead) continue;

    for (const enemy of enemies) {
      if (enemy.dead || distance(projectile, enemy) > projectile.radius + enemy.radius) continue;
      projectile.dead = true;
      enemy.hp -= projectile.damage;
      enemy.hitFlash = 0.12;
      screenShake = enemy.type === "boss" ? 5 : 2;
      emitParticles(projectile.x, projectile.y, enemy.type === "boss" ? "#f4ce73" : "#bd9ae4", 8, 95);
      playTone(enemy.type === "boss" ? 185 : 230, 0.07, "square", 0.025);
      if (enemy.hp <= 0) defeatEnemy(enemy);
      break;
    }
  }
  projectiles = projectiles.filter((projectile) => !projectile.dead);
}

function defeatEnemy(enemy) {
  enemy.dead = true;
  enemy.respawn = 6 + Math.random() * 3;
  totalKills += enemy.type === "slime" ? 1 : 0;
  const result = registerEnemyDefeat(progress, enemy.type);
  progress = result.progress;
  const drops = enemy.type === "boss" ? 7 : 1 + (Math.random() > 0.65 ? 1 : 0);
  for (let i = 0; i < drops; i += 1) {
    loot.push({
      type: i === drops - 1 && Math.random() > 0.62 ? "crystal" : "coin",
      x: enemy.x + (Math.random() - 0.5) * 35,
      y: enemy.y + (Math.random() - 0.5) * 25,
      phase: Math.random() * 6,
      amount: enemy.type === "boss" ? 3 : 1
    });
  }
  emitParticles(enemy.x, enemy.y, enemy.type === "boss" ? "#f4d88a" : "#a783d5", enemy.type === "boss" ? 32 : 16, 145);
  if (result.leveledUp) {
    player.hp = progress.maxHp;
    showToast("레벨 " + progress.level + "! 최대 체력과 마법 공격력이 올랐습니다.");
    playTone(880, 0.34, "sine", 0.045);
  } else {
    showToast("+" + result.xp + " 경험치");
  }
  if (result.counted && progress.slimeKills >= progress.slimeGoal) {
    showToast("슬라임 퇴치 완료! 루나에게 돌아가세요.");
  }
  if (enemy.type === "boss") showToast("킹 슬라임 격파! 루나에게 돌아가세요.");
  saveProgress();
  updateHud();
  updateQuest();
}

function updateLoot(dt) {
  for (const item of loot) {
    item.phase += dt * 3;
    if (distance(item, player) < 34) {
      item.collected = true;
      progress = collectLoot(progress, item.type, item.amount);
      playTone(item.type === "coin" ? 840 : 1040, 0.08, "sine", 0.025);
    }
  }
  const collected = loot.some((item) => item.collected);
  loot = loot.filter((item) => !item.collected);
  if (collected) {
    saveProgress();
    updateHud();
  }
}

function emitParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.35 + Math.random() * 0.65);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
      size: 2 + Math.random() * 4,
      color
    });
  }
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
}

function update(dt) {
  elapsed += dt;
  screenShake = Math.max(0, screenShake - dt * 28);
  attackCooldown = Math.max(0, attackCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  if (!started || dialogueOpen || gameEnded) {
    updateParticles(dt);
    return;
  }

  const movement = getMovement();
  movePlayer(movement.x, movement.y, dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateLoot(dt);
  updateParticles(dt);

  nearbyNpc = npcs
    .map((npc) => ({ ...npc, proximity: distance(npc, player) }))
    .filter((npc) => npc.proximity < 82)
    .sort((a, b) => a.proximity - b.proximity)[0] || null;
  $("#interact-button").classList.toggle("nearby", Boolean(nearbyNpc));
}

function drawMap() {
  ctx.fillStyle = "#678d68";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  for (let y = 0; y < WORLD.height; y += 48) {
    for (let x = 0; x < WORLD.width; x += 48) {
      const hash = ((x * 13 + y * 7) / 48) % 5;
      ctx.fillStyle = hash < 2 ? "rgba(255,255,255,.018)" : "rgba(24,63,43,.025)";
      ctx.fillRect(x, y, 48, 48);
    }
  }

  ctx.lineCap = "round";
  ctx.strokeStyle = "#b6a477";
  ctx.lineWidth = 104;
  ctx.beginPath();
  ctx.moveTo(710, 1040);
  ctx.lineTo(715, 170);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(160, 560);
  ctx.bezierCurveTo(430, 525, 950, 580, 1260, 525);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 14]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(300, 730);
  ctx.fillStyle = "#56899a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 120, 78, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(211,238,235,.35)";
  ctx.lineWidth = 5;
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    ctx.strokeStyle = "rgba(220,244,239,.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-35 + i * 24, -10 + i * 7, 19, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  for (const flower of flowers) {
    ctx.fillStyle = "rgba(39,82,52,.45)";
    ctx.fillRect(flower.x - 1, flower.y + 1, 2, 5);
    ctx.fillStyle = flower.color;
    ctx.beginPath();
    ctx.arc(flower.x, flower.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  drawShrine();
  houses.forEach(drawHouse);
  trees.forEach(drawTree);
}

function drawHouse(house) {
  ctx.fillStyle = "rgba(20,31,27,.22)";
  ctx.beginPath();
  ctx.ellipse(house.x + house.w / 2, house.y + house.h + 13, house.w * 0.55, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = house.wall;
  roundedRect(house.x, house.y + 45, house.w, house.h - 45, 12);
  ctx.fill();
  ctx.fillStyle = house.roof;
  ctx.beginPath();
  ctx.moveTo(house.x - 18, house.y + 57);
  ctx.lineTo(house.x + house.w / 2, house.y - 5);
  ctx.lineTo(house.x + house.w + 18, house.y + 57);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = house.door;
  roundedRect(house.x + house.w / 2 - 21, house.y + house.h - 61, 42, 61, 8);
  ctx.fill();
  ctx.fillStyle = "#efcf72";
  ctx.beginPath();
  ctx.arc(house.x + house.w / 2 + 12, house.y + house.h - 31, 3, 0, Math.PI * 2);
  ctx.fill();
  [-1, 1].forEach((side) => {
    ctx.fillStyle = "#765d54";
    roundedRect(house.x + house.w / 2 + side * 67 - 19, house.y + 82, 38, 34, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,221,126,.7)";
    ctx.fillRect(house.x + house.w / 2 + side * 67 - 14, house.y + 87, 28, 24);
  });
}

function drawTree(tree) {
  const sway = Math.sin(elapsed * 1.2 + tree.phase) * 1.2;
  ctx.fillStyle = "rgba(20,44,30,.25)";
  ctx.beginPath();
  ctx.ellipse(tree.x + 4, tree.y + tree.size * 0.62, tree.size * 0.7, tree.size * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#65503b";
  ctx.fillRect(tree.x - 4, tree.y, 8, tree.size * 0.7);
  ctx.fillStyle = ["#315f4b", "#3e6e51", "#2c5945"][tree.shade];
  ctx.beginPath();
  ctx.arc(tree.x + sway, tree.y - tree.size * 0.2, tree.size * 0.55, 0, Math.PI * 2);
  ctx.arc(tree.x - tree.size * 0.37 + sway, tree.y + 2, tree.size * 0.38, 0, Math.PI * 2);
  ctx.arc(tree.x + tree.size * 0.38 + sway, tree.y + 3, tree.size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(173,220,154,.14)";
  ctx.beginPath();
  ctx.arc(tree.x - tree.size * 0.18 + sway, tree.y - tree.size * 0.36, tree.size * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function drawShrine() {
  const active = progress.quest === "boss" && !progress.bossDefeated;
  ctx.fillStyle = "rgba(34,24,50,.22)";
  ctx.beginPath();
  ctx.ellipse(700, 122, 92, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#777181";
  ctx.fillRect(625, 95, 18, 76);
  ctx.fillRect(757, 95, 18, 76);
  ctx.fillRect(610, 86, 180, 18);
  ctx.fillStyle = active ? "#b392e5" : "#625d6a";
  ctx.globalAlpha = active ? 0.35 + Math.sin(elapsed * 3) * 0.12 : 0.18;
  ctx.beginPath();
  ctx.ellipse(700, 137, 57, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawNpc(npc) {
  const bob = Math.sin(elapsed * 2.2 + npc.x) * 1.3;
  drawShadow(npc.x, npc.y + 13, 18, 7);
  ctx.fillStyle = npc.color;
  ctx.beginPath();
  ctx.moveTo(npc.x - 15, npc.y + 14 + bob);
  ctx.quadraticCurveTo(npc.x, npc.y - 8 + bob, npc.x + 15, npc.y + 14 + bob);
  ctx.lineTo(npc.x + 20, npc.y + 31 + bob);
  ctx.lineTo(npc.x - 20, npc.y + 31 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f1c9a6";
  ctx.beginPath();
  ctx.arc(npc.x, npc.y - 5 + bob, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = npc.id === "luna" ? "#2b2342" : "#5a352e";
  ctx.beginPath();
  ctx.arc(npc.x, npc.y - 9 + bob, 12, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(npc.x - 11, npc.y - 10 + bob, 22, 5);
  if (npc.id === "luna" && progress.quest !== "complete") {
    const needsTalk = ["meet_luna", "boss_done"].includes(progress.quest) ||
      (progress.quest === "slime_hunt" && progress.slimeKills >= progress.slimeGoal);
    if (needsTalk) {
      ctx.fillStyle = "#f4d88a";
      ctx.font = "900 20px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("!", npc.x, npc.y - 35 + Math.sin(elapsed * 3) * 3);
    }
  }
}

function drawPlayer() {
  const step = player.moving ? Math.sin(elapsed * 12) * 2.4 : Math.sin(elapsed * 2) * 0.7;
  const alpha = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 ? 0.35 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawShadow(player.x, player.y + 14, 19, 7);
  ctx.strokeStyle = "#6c5638";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(player.x + 14, player.y - 2);
  ctx.lineTo(player.x + 19 + player.facingX * 3, player.y + 26);
  ctx.stroke();
  ctx.fillStyle = "#ecd57e";
  ctx.beginPath();
  ctx.arc(player.x + 14, player.y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#514078";
  ctx.beginPath();
  ctx.moveTo(player.x - 15, player.y + 12);
  ctx.quadraticCurveTo(player.x, player.y - 6, player.x + 15, player.y + 12);
  ctx.lineTo(player.x + 18, player.y + 30 + step);
  ctx.lineTo(player.x - 18, player.y + 30 - step);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8ed4bd";
  ctx.fillRect(player.x - 11, player.y + 11, 22, 5);
  ctx.fillStyle = "#f4ceaa";
  ctx.beginPath();
  ctx.arc(player.x, player.y - 6, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2444";
  ctx.beginPath();
  ctx.arc(player.x, player.y - 10, 12, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(player.x - 17, player.y - 11);
  ctx.lineTo(player.x + 2, player.y - 35);
  ctx.lineTo(player.x + 18, player.y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d9b7ef";
  ctx.fillRect(player.x - 18, player.y - 12, 36, 4);
  ctx.fillStyle = "#352b42";
  const eyeX = player.facingX * 2;
  const eyeY = player.facingY > 0 ? 1 : 0;
  ctx.beginPath();
  ctx.arc(player.x - 4 + eyeX, player.y - 5 + eyeY, 1.2, 0, Math.PI * 2);
  ctx.arc(player.x + 4 + eyeX, player.y - 5 + eyeY, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  if (enemy.dead) return;
  const boss = enemy.type === "boss";
  const bounce = Math.sin(elapsed * (boss ? 4 : 6) + enemy.x) * (boss ? 3 : 2);
  drawShadow(enemy.x, enemy.y + enemy.radius * 0.68, enemy.radius * 0.9, enemy.radius * 0.28);
  ctx.save();
  ctx.translate(enemy.x, enemy.y + bounce);
  ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : boss ? "#7a4a9e" : "#76549a";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius, enemy.radius * 0.45);
  ctx.quadraticCurveTo(-enemy.radius * 1.05, -enemy.radius * 0.8, 0, -enemy.radius);
  ctx.quadraticCurveTo(enemy.radius * 1.05, -enemy.radius * 0.8, enemy.radius, enemy.radius * 0.45);
  ctx.quadraticCurveTo(enemy.radius * 0.48, enemy.radius * 0.9, 0, enemy.radius * 0.62);
  ctx.quadraticCurveTo(-enemy.radius * 0.48, enemy.radius * 0.9, -enemy.radius, enemy.radius * 0.45);
  ctx.fill();
  ctx.fillStyle = boss ? "#f2cfe9" : "#efe8fa";
  const eyeY = -enemy.radius * 0.18;
  ctx.beginPath();
  ctx.ellipse(-enemy.radius * 0.34, eyeY, boss ? 5 : 3, boss ? 7 : 5, 0, 0, Math.PI * 2);
  ctx.ellipse(enemy.radius * 0.34, eyeY, boss ? 5 : 3, boss ? 7 : 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#251a32";
  ctx.beginPath();
  ctx.arc(-enemy.radius * 0.31, eyeY + 1, boss ? 2.5 : 1.5, 0, Math.PI * 2);
  ctx.arc(enemy.radius * 0.37, eyeY + 1, boss ? 2.5 : 1.5, 0, Math.PI * 2);
  ctx.fill();
  if (boss) {
    ctx.fillStyle = "#f3d477";
    ctx.beginPath();
    ctx.moveTo(-20, -enemy.radius + 4);
    ctx.lineTo(-16, -enemy.radius - 20);
    ctx.lineTo(-4, -enemy.radius - 10);
    ctx.lineTo(3, -enemy.radius - 25);
    ctx.lineTo(12, -enemy.radius - 10);
    ctx.lineTo(21, -enemy.radius - 20);
    ctx.lineTo(19, -enemy.radius + 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (enemy.hp < enemy.maxHp || boss) {
    const width = boss ? 86 : 40;
    const y = enemy.y - enemy.radius - (boss ? 35 : 16);
    ctx.fillStyle = "rgba(24,16,34,.72)";
    roundedRect(enemy.x - width / 2, y, width, 6, 3);
    ctx.fill();
    ctx.fillStyle = boss ? "#e66e83" : "#cf9de0";
    roundedRect(enemy.x - width / 2 + 1, y + 1, (width - 2) * clamp(enemy.hp / enemy.maxHp, 0, 1), 4, 2);
    ctx.fill();
  }
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    const gradient = ctx.createRadialGradient(projectile.x, projectile.y, 1, projectile.x, projectile.y, 15);
    gradient.addColorStop(0, "#fffbe0");
    gradient.addColorStop(0.35, "#f1d38e");
    gradient.addColorStop(1, "rgba(191,151,231,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8c8";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLoot() {
  for (const item of loot) {
    const y = item.y + Math.sin(item.phase) * 4;
    drawShadow(item.x, item.y + 8, 8, 3);
    ctx.fillStyle = item.type === "coin" ? "#f1c75f" : "#9bdcf2";
    ctx.beginPath();
    if (item.type === "coin") {
      ctx.arc(item.x, y, 7, 0, Math.PI * 2);
    } else {
      ctx.moveTo(item.x, y - 9);
      ctx.lineTo(item.x + 7, y);
      ctx.lineTo(item.x, y + 9);
      ctx.lineTo(item.x - 7, y);
      ctx.closePath();
    }
    ctx.fill();
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShadow(x, y, rx, ry) {
  ctx.fillStyle = "rgba(21,35,27,.22)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  const targetX = clamp(player.x - viewWidth / 2, 0, WORLD.width - viewWidth);
  const targetY = clamp(player.y - viewHeight / 2, 0, WORLD.height - viewHeight);
  camera.x += (targetX - camera.x) * 0.12;
  camera.y += (targetY - camera.y) * 0.12;
  const shakeX = screenShake ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake ? (Math.random() - 0.5) * screenShake : 0;
  ctx.save();
  ctx.translate(-camera.x + shakeX, -camera.y + shakeY);
  drawMap();
  drawLoot();
  npcs.forEach(drawNpc);
  enemies.forEach(drawEnemy);
  drawPlayer();
  drawProjectiles();
  drawParticles();
  ctx.restore();
  if (!started) {
    ctx.fillStyle = "rgba(18,13,31,.16)";
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }
}

function gameLoop(now) {
  const dt = Math.min(0.033, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function showResult(won) {
  gameEnded = true;
  $("#result-icon").textContent = won ? "♛" : "☾";
  $("#result-kicker").textContent = won ? "MOONLIGHT HERO" : "TRY AGAIN";
  $("#result-title").textContent = won ? "달빛 마을의 수호자!" : "마법이 사라졌어요";
  $("#result-copy").textContent = won
    ? "킹 슬라임을 물리치고 마을에 평화를 되찾았습니다."
    : "슬라임에게 쓰러졌지만 모험은 다시 시작할 수 있어요.";
  $("#result-level").textContent = progress.level;
  $("#result-kills").textContent = totalKills;
  $("#result-coins").textContent = progress.coins;
  $("#result-screen").hidden = false;
}

function startGame() {
  started = true;
  $("#start-screen").classList.add("hidden");
  $("#area-banner").classList.remove("show");
  void $("#area-banner").offsetWidth;
  $("#area-banner").classList.add("show");
  playTone(523, 0.12, "sine", 0.025);
  setTimeout(() => playTone(784, 0.2, "sine", 0.025), 100);
}

function restartGame() {
  localStorage.removeItem(SAVE_KEY);
  progress = createProgress();
  totalKills = 0;
  gameEnded = false;
  dialogueOpen = false;
  $("#dialogue").hidden = true;
  $("#result-screen").hidden = true;
  resetWorld();
  startGame();
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
$("#attack-button").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  attack();
});
$("#interact-button").addEventListener("click", interact);
$("#potion-button").addEventListener("click", useHealingPotion);
$("#dialogue-close").addEventListener("click", closeDialogue);
$("#start-button").addEventListener("click", startGame);
$("#restart-button").addEventListener("click", restartGame);
$("#sound-button").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("#sound-button").classList.toggle("muted", !soundEnabled);
  if (soundEnabled) playTone(660, 0.1, "sine", 0.03);
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "e", "q"].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);
  if (key === " ") attack();
  if (key === "e") interact();
  if (key === "q") useHealingPotion();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("resize", resizeCanvas);
window.addEventListener("blur", () => keys.clear());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

resizeCanvas();
resetWorld();
requestAnimationFrame(gameLoop);
