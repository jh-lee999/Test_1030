// The packed images have real, isolated 320px cells. These coordinates are also
// used by the sprite inspector, so the preview and game sample identical pixels.
export const BUTTER_SPRITE_LAYOUT = Object.freeze({
  cell: 320,
  columns: 6,
  rows: 3,
  anchorX: 160,
  anchorY: 280
});

export function butterFrameRect(row, frame) {
  const { cell, columns, rows } = BUTTER_SPRITE_LAYOUT;
  if (!Number.isInteger(row) || row < 0 || row >= rows || !Number.isInteger(frame) || frame < 0 || frame >= columns) {
    throw new RangeError("Invalid Butter sprite frame");
  }
  return [frame * cell, row * cell, cell, cell];
}

export function drawButterFrame(context, image, row, frame, size, feetY = 0) {
  const { cell, anchorX, anchorY } = BUTTER_SPRITE_LAYOUT;
  context.drawImage(
    image,
    ...butterFrameRect(row, frame),
    -anchorX / cell * size,
    feetY - anchorY / cell * size,
    size,
    size
  );
}
