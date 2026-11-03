// Reference: docs/art/butter-motion-reference.json. Normalize, do not impose
// the original RPG's multi-second clips on this game's attack cooldowns.
export const BUTTER_MOTION = Object.freeze({
  previewCycleSeconds:.8, previewFrames:12,
  bootLift:28, frontSwing:.08, sideSwing:.26, kneeSwing:.34,
  tailSwing:.065, tailLag:.65,
});
export const BUTTER_RELEASE = Object.freeze({normal:4/9,low:33/70,high:75/118});
export const butterReleasePoint = type => BUTTER_RELEASE[type] ?? BUTTER_RELEASE.normal;
