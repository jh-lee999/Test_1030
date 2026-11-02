const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };

export function advanceButterGait(gait, distance, dx, dy, dt) {
  const moving = distance > 0.001;
  if (moving) {
    gait.phase = (gait.phase + distance / 145 * TAU) % TAU;
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
    return { x: -travel * 16 * (Math.abs(forward) > 0.1 ? Math.sign(forward) : 1), y: 60 - lift * 9, lift };
  }
  return {
    x: travel * lateral * 7,
    y: 60 + travel * forward * 6 - lift * 5,
    lift
  };
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
function drawUpper(context, image, row, pose) {
  if (pose.from === pose.to || pose.mix < 0.001 || pose.mix > 0.999) {
    const frame = pose.mix > 0.999 ? pose.to : pose.from;
    context.drawImage(image, frame * 320, row * 320, 320, 320, 0, 0, 320, 320);
    return;
  }
  if (!bodyBlend) {
    bodyBlend = document.createElement("canvas");
    bodyBlend.width = bodyBlend.height = 320;
  }
  const blend = bodyBlend.getContext("2d");
  blend.clearRect(0, 0, 320, 320);
  // Add premultiplied weights in a separate buffer: the common torso stays
  // opaque instead of revealing the floor during an ordinary alpha fade.
  blend.globalCompositeOperation = "lighter";
  blend.globalAlpha = 1 - pose.mix;
  blend.drawImage(image, pose.from * 320, row * 320, 320, 320, 0, 0, 320, 320);
  blend.globalAlpha = pose.mix;
  blend.drawImage(image, pose.to * 320, row * 320, 320, 320, 0, 0, 320, 320);
  blend.globalAlpha = 1;
  blend.globalCompositeOperation = "source-over";
  context.drawImage(bodyBlend, 0, 0);
}

function drawLeg(context, image, row, leg, hipX, foot, view, amount) {
  context.save();
  context.translate(hipX, 220);
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
    // A small two-bone knee bend in profile; the head and pelvis never hop.
    const a = 30, b = 34;
    const d = clamp(Math.hypot(foot.x, foot.y), 1, a + b - 0.01);
    const toward = Math.atan2(foot.x, foot.y);
    const upper = toward - Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const kneeX = Math.sin(upper) * a;
    const kneeY = Math.cos(upper) * a;
    const lower = Math.atan2(foot.x - kneeX, foot.y - kneeY);
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
  const feet = [0, 1].map(leg => butterFootPose(gait.phase, leg, gait.amount, view, gait, facing));
  context.save();
  if (view === "side" && facingX > 0) context.scale(-1, 1);
  context.translate(0, size * 0.28);
  context.scale(size * 1.55 / 320, size * 1.55 / 320);
  context.translate(-160, -280);
  const hips = view === "side" ? [156, 164] : [145, 175];
  const order = view === "side" || feet[0].y < feet[1].y ? [0, 1] : [1, 0];
  for (const leg of order) drawLeg(context, images.legs, row, leg, hips[leg], feet[leg], view, gait.amount);
  // Recoil belongs to the arms/torso and never resets the gait or spreads feet.
  context.translate(view === "side" ? recoil * 2 : 0, -recoil * 0.5);
  drawUpper(context, images.upper, row, butterUpperPose(action));
  context.restore();
}
