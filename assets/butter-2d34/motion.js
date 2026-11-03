// v34 changes motion timing/amplitude, NEVER the approved source PNG or crops.
export const BUTTER_MOTION = Object.freeze({
  bootLift: 34,
  frontSwing: .065,
  sideSwing: .24,
  windup: .085,
  recoil: .13,
  previewCycleSeconds: .6,
  previewFrames: 8,
});

// A side-view rear boot is partly hidden in the source. Reuse the COMPLETE
// foreground boot for that limb while walking; exposing the half-occluded
// cutout would leave a severed toe. No mirroring or nonuniform scaling.
export const BUTTER_WALK_BOOTS = Object.freeze({
  left: { rear: 0, source: 1, pivot: [240, 488] },
  right: { rear: 1, source: 0, pivot: [355, 494] },
});
