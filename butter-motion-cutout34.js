// Archived v34 implementation, also used if the optional limb texture fails.
import { BUTTER_2D_LAYOUT, BUTTER_2D_VIEWS } from './assets/butter-2d33/rig.js?v=33';
import { BUTTER_MOTION, BUTTER_WALK_BOOTS } from './assets/butter-2d34/motion.js?v=34';
export { BUTTER_2D_LAYOUT, BUTTER_2D_VIEWS };
export { BUTTER_MOTION };
const TAU = Math.PI * 2;
export const BUTTER_STRIDE_DISTANCE = 120;
const cache = new WeakMap();
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));

export function advanceButterGait(gait, distance, dx, dy, dt) {
  if (distance > .001) {
    gait.phase = (gait.phase + distance / BUTTER_STRIDE_DISTANCE * TAU) % TAU;
    gait.dx = dx; gait.dy = dy;
  }
  gait.amount += ((distance > .001 ? 1 : 0) - gait.amount) * (1 - Math.exp(-dt * 18));
  if (gait.amount < .002) gait.amount = 0;
}

export function butterSpriteState({ facingX, facingY, gait, action }) {
  const x = action?.dx ?? facingX, y = action?.dy ?? facingY;
  const side = Math.abs(x) > Math.abs(y) * .82;
  const view = side ? x < 0 ? 'left' : 'right' : y < 0 ? 'up' : 'down';
  const phase = gait.phase * (gait.dx * x + gait.dy * y < -.25 ? -1 : 1);
  const cycle = ((phase % TAU) + TAU) % TAU / TAU;
  const amount = action?.type === 'high' ? 0 : clamp(gait.amount);
  const progress = action ? clamp(action.time / Math.max(.001, action.duration)) : 0;
  const release = action?.type === 'high' ? .68 : action?.type === 'low' ? .5 : .55;
  const pull = action ? progress < release ? Math.sin(progress / release * Math.PI / 2)
    : Math.cos(clamp((progress - release) / .17) * Math.PI / 2) : 0;
  const kick = action ? Math.sin(clamp((progress - release) / (1 - release)) * Math.PI) : 0;
  const moving = amount > .002;
  return {
    view, flip: false, phase, amount, progress, release, pull, kick,
    walkFrame: moving ? Math.floor(cycle * 12) : 0,
    attackFrame: action ? Math.min(7, Math.floor(progress * 8)) : 0,
    clip: action?.type === 'high' ? 'high' : action ? moving ? 'walkShoot' : 'shoot' : moving ? 'walk' : 'idle',
    weaponAngle: (pull * BUTTER_MOTION.windup - kick * BUTTER_MOTION.recoil) * (view === 'up' ? -1 : 1),
  };
}

// Alternate the feet, with one planted on the original baseline at all times.
// The head/body never bobs, stretches or changes shape.
export function butterBootTransforms(pose) {
  const side = pose.view === 'left' || pose.view === 'right';
  const rig = BUTTER_2D_VIEWS[pose.view];
  return [0, Math.PI].map((offset, i) => {
    const wave = Math.sin(pose.phase + offset) * pose.amount;
    const [x, y, w] = rig.boots[i];
    const reusable = pose.amount > .002 && BUTTER_WALK_BOOTS[pose.view]?.rear === i ? BUTTER_WALK_BOOTS[pose.view] : null;
    const pivot = reusable?.pivot ?? [x + w / 2, y + 5];
    const sourceIndex = reusable?.source ?? i;
    const [sx, sy, sw] = rig.boots[sourceIndex];
    const sourcePivot = [sx + sw / 2, sy + 5];
    const angle = wave * (side ? BUTTER_MOTION.sideSwing : BUTTER_MOTION.frontSwing) * (pose.view === 'right' ? -1 : 1);
    const lift = Math.max(0, wave) * BUTTER_MOTION.bootLift;
    // Swing around the cuff, not sideways out of the knee. Compensate the
    // rotation's vertical shortening so the supporting foot stays grounded.
    const ground = (rig.foot[1] - pivot[1]) * (1 - Math.cos(angle));
    return { x: 0, y: ground - lift, angle, pivot, lift, sourceIndex, sourcePivot };
  });
}

function polygon(path, points) {
  points.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y)); path.closePath();
}

export function prepareButterMotion(atlas) {
  if (cache.has(atlas)) return cache.get(atlas);
  const parts = {};
  for (const [view, rig] of Object.entries(BUTTER_2D_VIEWS)) {
    const body = new Path2D(); body.rect(0, 0, 627, 627);
    const boots = rig.boots.map(([x, y, w, h], i) => {
      const points = rig.bootMasks?.[i] ?? [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
      const part = new Path2D(); polygon(part, points);
      polygon(body, points.map(([px,py]) => [px,Math.max(y+8,py)]));
      return part;
    });
    const firingBody = new Path2D(body); polygon(firingBody, rig.weapon.polygon);
    const weapon = new Path2D(); polygon(weapon, rig.weapon.polygon);
    parts[view] = { body, firingBody, boots, weapon };
  }
  cache.set(atlas, parts);
  return parts;
}

export function butterSourceTransform(size, view) {
  const scale = BUTTER_2D_LAYOUT.sourceScale * size / 112;
  const [fx, fy] = BUTTER_2D_VIEWS[view].foot;
  return { scale, x: -fx * scale, y: size * .28 - fy * scale };
}

function rotatePoint([x, y], [px, py], angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
}

export function butterMuzzleOffset(state) {
  const pose = butterSpriteState(state), rig = BUTTER_2D_VIEWS[pose.view];
  const [mx, my] = rotatePoint(rig.muzzle, rig.weapon.pivot, pose.weaponAngle);
  const t = butterSourceTransform(state.size, pose.view);
  return { x: t.x + mx * t.scale, y: t.y + my * t.scale };
}

export function drawButterMotion(ctx, images, state) {
  const pose = butterSpriteState(state), rig = BUTTER_2D_VIEWS[pose.view];
  const t = butterSourceTransform(state.size, pose.view);
  ctx.save();
  ctx.translate(t.x, t.y); ctx.scale(t.scale, t.scale); // ONE positive uniform scale.
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (pose.clip === 'idle' || state.reference) {
    ctx.drawImage(images.atlas, ...rig.rect, 0, 0, 627, 627);
  } else {
    const parts = prepareButterMotion(images.atlas)[pose.view];
    const feet = butterBootTransforms(pose);
    // Draw directly from the source image, not an intermediate raster surface:
    // image/canvas downsampling differs in browsers and can alter face pixels.
    const source = () => ctx.drawImage(images.atlas, ...rig.rect, 0, 0, 627, 627);
    for (const i of rig.bootOrder ?? [0, 1]) {
      const foot = feet[i];
      ctx.save(); ctx.translate(foot.x, foot.y);
      ctx.translate(...foot.pivot); ctx.rotate(foot.angle); ctx.translate(-foot.sourcePivot[0], -foot.sourcePivot[1]);
      ctx.clip(parts.boots[foot.sourceIndex]); source(); ctx.restore();
    }
    const firing = Math.abs(pose.weaponAngle) > 1e-8;
    ctx.save(); ctx.clip(firing ? parts.firingBody : parts.body, 'evenodd'); source(); ctx.restore();
    if (firing) {
      const [px, py] = rig.weapon.pivot;
      ctx.save(); ctx.translate(px, py); ctx.rotate(pose.weaponAngle); ctx.translate(-px, -py);
      ctx.clip(parts.weapon); source(); ctx.restore();
    }
  }
  ctx.restore();
}
