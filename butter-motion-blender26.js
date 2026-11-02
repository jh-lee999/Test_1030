import {BUTTER_MUZZLES} from "./assets/butter-model-anchors.js?v=26";
const TAU = Math.PI * 2;
export const BUTTER_STRIDE_DISTANCE = 120;
export const BUTTER_MODEL_LAYOUT = Object.freeze({
  cell:128, columns:16, rows:32, anchorX:64, anchorY:108, viewStride:128,
  gaitFrames:12, attackFrames:8
});
const VIEWS = ["down", "left", "right", "up"];
const CLIPS = Object.freeze({ idle:0, walk:1, shoot:13, walkShoot:21, high:117 });

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

// Real armature renders for every gait/attack combination. Never mirror the
// holding hand, restart the feet on a shot, or deform pixels at runtime.
export function butterSpriteState({ facingX, facingY, gait, action }) {
  const side = Math.abs(facingX) > Math.abs(facingY) * 0.82;
  const view = side ? facingX < 0 ? "left" : "right" : facingY < 0 ? "up" : "down";
  const moving = gait.amount > 0.2 && action?.type !== "high";
  const forward = gait.dx * facingX + gait.dy * facingY;
  const phase = forward < -0.25 ? -gait.phase : gait.phase;
  const cycle = ((phase % TAU) + TAU) % TAU / TAU;
  const walkFrame = moving ? Math.min(11, Math.floor(cycle * 12)) : 0;
  let progress = action ? Math.max(0, Math.min(1, action.time / Math.max(.001, action.duration))) : 0;
  // Low-grade gameplay releases at .50, the normal rig animation at .55.
  if (action?.type === "low") progress = progress < .5 ? progress / .5 * .55 : .55 + (progress - .5) / .5 * .45;
  const attackFrame = action ? Math.min(7, Math.floor(progress * 8)) : 0;
  const clip = action?.type === "high" ? "high" : action ? moving ? "walkShoot" : "shoot" : moving ? "walk" : "idle";
  const local = CLIPS[clip] + (clip === "walkShoot" ? walkFrame * 8 + attackFrame : clip === "walk" ? walkFrame : action ? attackFrame : 0);
  const index = VIEWS.indexOf(view) * BUTTER_MODEL_LAYOUT.viewStride + local;
  return { view, clip, walkFrame, attackFrame, index, flip:false,
    sx:index % 16 * 128, sy:Math.floor(index / 16) * 128 };
}

export function drawButterMotion(context, images, state) {
  const { sx, sy } = butterSpriteState(state);
  const { cell, anchorX, anchorY } = BUTTER_MODEL_LAYOUT;
  const size = state.size * 1.42;
  context.drawImage(
    images.atlas,
    sx, sy, cell, cell,
    -anchorX / cell * size, state.size * 0.28 - anchorY / cell * size,
    size, size
  );
}

export function butterMuzzleOffset(state) {
  const {index}=butterSpriteState(state);
  const [x,y]=BUTTER_MUZZLES[index]??[64,108];
  const {cell,anchorX,anchorY}=BUTTER_MODEL_LAYOUT,size=state.size*1.42;
  return {x:(x-anchorX)/cell*size,y:state.size*.28+(y-anchorY)/cell*size};
}
