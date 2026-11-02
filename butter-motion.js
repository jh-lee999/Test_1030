const TAU = Math.PI * 2;
export const BUTTER_STRIDE_DISTANCE = 120;
export const BUTTER_CHIBI_LAYOUT = Object.freeze({
  cell: 160, columns: 7, rows: 3, anchorX: 80, anchorY: 136
});

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

// Every state selects a complete drawn pose. Shooting never replaces moving
// feet with a stationary shooting stance, and no pixels are warped or blended.
export function butterSpriteState({ facingX, facingY, gait, action }) {
  const view = Math.abs(facingX) > Math.abs(facingY) * 0.82 ? "side" : facingY < 0 ? "up" : "down";
  const row = { down: 0, side: 1, up: 2 }[view];
  let frame = 0;
  if (action?.type === "high") {
    frame = 6;
  } else if (gait.amount > 0.2) {
    const forward = gait.dx * facingX + gait.dy * facingY;
    const phase = forward < -0.25 ? -gait.phase : gait.phase;
    const cycle = ((phase % TAU) + TAU) % TAU / TAU;
    frame = [1, 2, 3, 4][Math.min(3, Math.floor(cycle * 4))];
  } else if (action) {
    const progress = action.time / action.duration;
    const release = action.type === "low" ? 0.5 : 0.55;
    if (progress >= 0.18 && progress <= release + 0.16) frame = 5;
  }
  return { view, row, frame, flip: view === "side" && facingX > 0 };
}

export function drawButterMotion(context, images, state) {
  const { row, frame, flip } = butterSpriteState(state);
  const { cell, anchorX, anchorY } = BUTTER_CHIBI_LAYOUT;
  const size = state.size * 1.42;
  context.save();
  if (flip) context.scale(-1, 1);
  if (state.recoil && row === 1) context.translate(state.recoil * 0.6, 0);
  context.drawImage(
    images.atlas,
    frame * cell, row * cell, cell, cell,
    -anchorX / cell * size, state.size * 0.28 - anchorY / cell * size,
    size, size
  );
  context.restore();
}
