const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
export const BUTTER_STRIDE_DISTANCE = 112;

export function advanceButterGait(gait, distance, dx, dy, dt) {
  const moving = distance > 0.001;
  if (moving) {
    gait.phase = (gait.phase + distance / BUTTER_STRIDE_DISTANCE * TAU) % TAU;
    gait.dx = dx;
    gait.dy = dy;
  }
  gait.amount += ((moving ? 1 : 0) - gait.amount) * (1 - Math.exp(-dt * 18));
  if (gait.amount < 0.002) gait.amount = 0;
}

// The two feet are exactly half a cycle apart. Half of each cycle is planted;
// the other half lifts and passes. Direction affects the feet, not the aim pose.
export function butterFootPose(phase, leg, amount, view, movement, facing) {
  if (amount === 0) return { x: 0, y: 60, lift: 0 };
  const p = ((phase + leg * Math.PI) % TAU + TAU) % TAU;
  const travel = Math.cos(p) * amount;
  const lift = p > Math.PI ? -Math.sin(p) * amount : 0;
  const forward = movement.dx * facing.x + movement.dy * facing.y;
  const lateral = movement.dx * -facing.y + movement.dy * facing.x;
  if (view === "side") {
    return { x: -travel * 29 * (Math.abs(forward) > 0.1 ? Math.sign(forward) : 1), y: 60 - lift * 21, lift };
  }
  return {
    x: travel * lateral * 10 + (leg === 0 ? -1 : 1) * lift * 6,
    y: 60 + travel * forward * 10 - lift * 12,
    lift
  };
}

export function butterBodyPose(gait, view, facing) {
  const amount = gait.amount;
  const phase = gait.phase;
  const forward = gait.dx * facing.x + gait.dy * facing.y;
  const contact = Math.pow(Math.max(0, Math.cos(phase * 2)), 3) * amount;
  return {
    amount,
    phase,
    hipX: view === "side" ? 0 : Math.sin(phase) * 3.8 * amount,
    // A grounded compression on contact, rather than lifting the entire sprite.
    hipY: contact * 4.2,
    squash: 1 - amount * (view === "side" ? 0.015 : 0.025) - contact * 0.012,
    roll: amount * (view === "side" ? -forward * 0.13 + Math.sin(phase) * 0.018 : gait.dx * 0.045 + Math.sin(phase) * 0.045),
    headX: Math.sin(phase - 0.5) * 3.8 * amount,
    headY: -Math.sin(phase * 2 - 0.5) * 1.2 * amount,
    hairX: Math.sin(phase - 0.85) * 6 * amount,
    tailX: Math.sin(phase - 1.1) * 9 * amount,
    tailY: Math.cos(phase - 1.1) * 2.2 * amount
  };
}

export function butterUpperPoint(x, y, dynamics, view) {
  const head = 1 - smooth((y - 138) / 42);
  const hair = smooth((Math.abs(x - 160) - 42) / 42) * smooth((y - 110) / 90);
  const rootX = view === "side" ? 181 : 160;
  const tailCenter = view === "side" ? 204 : 126;
  const tail = Math.exp(-Math.pow((x - tailCenter) / 34, 2) - Math.pow((y - 203) / 20, 2)) * smooth(Math.abs(x - rootX) / 24);
  const localX = x - 160 + head * dynamics.headX + hair * dynamics.hairX + tail * dynamics.tailX;
  const localY = (y - 224) * dynamics.squash + head * dynamics.headY + tail * dynamics.tailY;
  const cos = Math.cos(dynamics.roll), sin = Math.sin(dynamics.roll);
  return { x: 160 + dynamics.hipX + localX * cos - localY * sin, y: 224 + dynamics.hipY + localX * sin + localY * cos };
}

export function butterUpperPose(action) {
  if (!action || action.type === "high") return { from: 0, to: 0, mix: 0 };
  const p = clamp(action.time / action.duration, 0, 1);
  const release = action.type === "low" ? 0.5 : 0.55;
  if (p < release) return { from: 0, to: 1, mix: smooth(p / (release * 0.85)) };
  if (p < release + 0.13) return { from: 1, to: 2, mix: smooth((p - release) / 0.13) };
  return { from: 2, to: 0, mix: smooth((p - release - 0.13) / (1 - release - 0.13)) };
}

let bodyBlend;
function upperTexture(image, row, pose) {
  if (!bodyBlend) {
    bodyBlend = document.createElement("canvas");
    bodyBlend.width = bodyBlend.height = 320;
  }
  const blend = bodyBlend.getContext("2d");
  blend.clearRect(0, 0, 320, 320);
  if (pose.from === pose.to || pose.mix < 0.001 || pose.mix > 0.999) {
    const frame = pose.mix > 0.999 ? pose.to : pose.from;
    blend.drawImage(image, frame * 320, row * 320, 320, 320, 0, 0, 320, 320);
  } else {
    // The common torso stays opaque during the upper-body pose blend.
    blend.globalCompositeOperation = "lighter";
    blend.globalAlpha = 1 - pose.mix;
    blend.drawImage(image, pose.from * 320, row * 320, 320, 320, 0, 0, 320, 320);
    blend.globalAlpha = pose.mix;
    blend.drawImage(image, pose.to * 320, row * 320, 320, 320, 0, 0, 320, 320);
  }
  blend.globalAlpha = 1;
  blend.globalCompositeOperation = "source-over";
  return bodyBlend;
}

function triangle(context, texture, source, target) {
  const [s0, s1, s2] = source, [d0, d1, d2] = target;
  const sx1 = s1.x - s0.x, sy1 = s1.y - s0.y;
  const sx2 = s2.x - s0.x, sy2 = s2.y - s0.y;
  const dx1 = d1.x - d0.x, dy1 = d1.y - d0.y;
  const dx2 = d2.x - d0.x, dy2 = d2.y - d0.y;
  const det = sx1 * sy2 - sx2 * sy1;
  const a = (dx1 * sy2 - dx2 * sy1) / det;
  const b = (dy1 * sy2 - dy2 * sy1) / det;
  const c = (dx2 * sx1 - dx1 * sx2) / det;
  const d = (dy2 * sx1 - dy1 * sx2) / det;
  const centerX = (d0.x + d1.x + d2.x) / 3, centerY = (d0.y + d1.y + d2.y) / 3;
  context.save();
  context.beginPath();
  for (let i = 0; i < 3; i++) {
    const p = target[i];
    const length = Math.hypot(p.x - centerX, p.y - centerY);
    // A tiny overlap avoids transparent seams between neighboring triangles.
    const x = p.x + (p.x - centerX) / length * 0.45;
    const y = p.y + (p.y - centerY) / length * 0.45;
    if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath(); context.clip();
  context.transform(a, b, c, d, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - d * s0.y);
  context.drawImage(texture, 0, 0);
  context.restore();
}

function drawUpper(context, image, row, pose, dynamics, view) {
  const texture = upperTexture(image, row, pose);
  if (dynamics.amount < 0.002) {
    context.drawImage(texture, 0, 0);
    return;
  }
  // A connected mesh keeps neck, hair and tail attached while their tips lag.
  const columns = 10, rows = 8;
  const source = [], warped = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const point = { x: 16 + x * 32, y: 16 + y * 32 };
    source.push(point); warped.push(butterUpperPoint(point.x, point.y, dynamics, view));
  }
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < columns - 1; x++) {
    const a = y * columns + x, b = a + 1, c = b + columns, d = a + columns;
    triangle(context, texture, [source[a], source[b], source[c]], [warped[a], warped[b], warped[c]]);
    triangle(context, texture, [source[a], source[c], source[d]], [warped[a], warped[c], warped[d]]);
  }
}

function drawLeg(context, image, row, leg, hipX, hipY, foot, view, amount) {
  context.save();
  context.translate(hipX, hipY);
  if (view === "side" && leg === 0) {
    context.filter = "brightness(0.86)";
    context.scale(0.92, 1);
  }
  if (view !== "side" || amount < 0.01) {
    const angle = Math.atan2(foot.x, foot.y);
    context.rotate(-angle);
    context.scale(1, Math.hypot(foot.x, foot.y) / 60);
    context.drawImage(image, leg * 96, row * 96, 96, 96, -48, -12, 96, 96);
  } else {
    // The planted foot stays grounded while the other knee folds on its pass.
    const a = 30, b = 34;
    const length = Math.hypot(foot.x, foot.y);
    const d = clamp(length, 1, a + b - 0.01);
    const targetX = foot.x * d / length, targetY = foot.y * d / length;
    const toward = Math.atan2(targetX, targetY);
    const upper = toward - Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const kneeX = Math.sin(upper) * a;
    const kneeY = Math.cos(upper) * a;
    const lower = Math.atan2(targetX - kneeX, targetY - kneeY);
    context.save();
    context.rotate(-upper);
    context.drawImage(image, leg * 96, row * 96 + 12, 96, 29, -48, 0, 96, a + 1);
    context.restore();
    context.translate(kneeX, kneeY - 0.5);
    context.rotate(-lower);
    context.drawImage(image, leg * 96, row * 96 + 40, 96, 32, -48, 0, 96, b);
  }
  context.restore();
}

export function drawButterMotion(context, images, { size, facingX, facingY, gait, action, recoil = 0 }) {
  const view = Math.abs(facingX) > Math.abs(facingY) * 0.82 ? "side" : facingY < 0 ? "up" : "down";
  const row = { down: 0, side: 1, up: 2 }[view];
  const facing = { x: facingX, y: facingY };
  const dynamics = butterBodyPose(gait, view, facing);
  const feet = [0, 1].map(leg => butterFootPose(gait.phase, leg, gait.amount, view, gait, facing));
  context.save();
  if (view === "side" && facingX > 0) context.scale(-1, 1);
  context.translate(0, size * 0.28);
  context.scale(size * 1.55 / 320, size * 1.55 / 320);
  context.translate(-160, -280);
  const stance = gait.amount * 3;
  const hips = view === "side" ? [155 - stance * 0.5, 165 + stance * 0.5] : [145 - stance, 175 + stance];
  const order = view === "side" || feet[0].y < feet[1].y ? [0, 1] : [1, 0];
  for (const leg of order) drawLeg(context, images.legs, row, leg, hips[leg] + dynamics.hipX, 220 + dynamics.hipY, { ...feet[leg], y: feet[leg].y - dynamics.hipY }, view, gait.amount);
  // Recoil belongs to the arms/torso and never resets the gait or spreads feet.
  context.translate(view === "side" ? recoil * 3.5 : 0, -recoil * 0.7);
  drawUpper(context, images.upper, row, butterUpperPose(action), dynamics, view);
  context.restore();
}
