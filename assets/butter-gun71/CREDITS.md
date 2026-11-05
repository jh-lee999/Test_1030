# Butter's original pistol motion · v71

The user requested Yellow Card to change Butter's normal attack to a gun and
cast her ultimate twice. The source is the SAME Normal rig credited in
[v36](../butter-original36/CREDITS.md), not a new costume or generated character.
Original sources/hashes are preserved there. No source file was overwritten.

Inspected 2026-11-05 through the normal public viewer at
https://viewer.dclnslde.com/ : battle/butter / Butter / Normal.
`OW1_Attack2_1` is 3.0000002s long. Visual inspection confirms drawing a pistol,
aiming, firing and recoil. Event1002924 at1.4333334s agrees with visible firing;
the earlier Event1002925 at0.3s is NOT used as the shot release.
We did not inspect the original game's damage code or claim its exact mechanics.

The two sheets sample the original aim/fire/recoil window1.2..1.85s so Butter
does not holster and redraw on each autoattack. `gun`:36 whole poses.
`walkGun`:24 gait phases ×16 firing phases, composed on the SAME original rig
using the v36 Move lower-body/constraints override. It is NOT an original named
WalkGun clip. Rig evaluation happens after overrides, not cutout compositing.
Both use constant source scale.18, shared original root and Point_Attack_OW1
muzzle markers, whole-frame horizontal mirroring and no recoloring/per-frame fit.

`tools/bake-butter-gun71.mjs` reproduces the sheets. No Spine runtime, original
skeleton, voice or full raw texture is shipped with the game. Assets are local
and image failure falls back to original idle art without blocking play.

Trickcal art belongs to its original rights holders including EPID Games.
This is an unofficial fan prototype. Public access/noncommercial use does not
establish a redistribution license; no separate permission has been verified.
These images are not CC0, MIT, newly approved master art, or licensed for sale.
The two-cast Yellow Card effect is the user's requested survivor adaptation,
not a claim about the artifact's original effect. The pinned2025 reference
associates two ultimate casts with Butter's signature ability, not Yellow Card.
