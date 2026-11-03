# Project instructions

## Butter artwork: persistent source of truth

**Latest user decision, 2026-11-03:** v35 was explicitly rejected as unnatural
and grotesque. Asked whether the original game's art/motion should take priority
over the fixed 2D template (with only one source view available), the user chose
**"원작 그림·모션 우선"**. This supersedes v32-as-active-game-template below.

The ACTIVE renderer is now `butter-original-motion.js`, using whole baked poses
from `assets/butter-original36/`. Read its `CREDITS.md`, inspect `poster.png` and
actual animated poses, and read the motion reference before changing it. The
game must not load the rejected v35 limb/cleanplate assets or restore that rig as
a fallback. Missing animation images fall back to the ORIGINAL idle/poster.

Idle/Move/Attack1_1/Skill1_1/Ultimate1_1 are source clips. WalkShoot is explicitly
our original-rig composition (Move lower body + Attack1_1 upper body), NOT a
discovered original clip. Only ONE three-quarter source view exists in this
implementation: no fake four-direction claim, no mirrored physical hands.
The floor arrow shows aim independently. Future directional art is separate work.

Run `npm test`, `npm run check:butter-canon`, `npm run check:butter-original`,
and the current `tools/check-butter-original-browser.mjs` browser test. Inspect
real playback: technical success is not aesthetic approval. Every source-frame
cell has a constant clip origin and shared world scale, never per-frame auto-fit.
The baker must apply local rig/constraint overrides BEFORE Spine updates meshes.
The metadata lowerChecks must stay identical across shot phases at one gait phase.

The following v28–35 rules/documentation are HISTORICAL preservation rules, not
instructions to force those rejected pixels back into the active game.

Before changing Butter's images, sprites, animation, model, proportions, colors,
outfit, handedness, or the rendering of those assets:

1. Read `docs/art/BUTTER_CANON.md` and `docs/art/butter-canon.json` completely.
2. Open and visually inspect the actual approved image
   `assets/butter-2d-study.png`. Do not reconstruct her appearance from memory,
   prose alone, the currently deployed sprite, or the newest generated model.
3. Run `npm run check:butter-canon` before and after the work. A passing check
   protects file identity and atlas geometry; likeness still needs visual review.
4. For image generation, pass the approved image as an actual reference input.
   For later animation, also pass the relevant existing directional artwork.
5. Preserve the approved source. Save iterations at new versioned paths, show
   the source beside the candidate, and record differences and unresolved issues.
   Generated output is a candidate until the user explicitly accepts it.
6. Use one shared scale/foot anchor and check complete silhouettes at game size.
   Do not clip hair, swap physical hands by mirroring, darken the palette through
   repeated regenerations, or call static direction switching a walk animation.

The 3D studies in versions 26–31 were criticized by the user and are **not**
approved visual references. The user approved the v32 four-direction sheet as
the fixed sprite template and requested integration. The v35 game uses that
UNCHANGED PNG through `butter-motion.js` and the v33 source layout, with
`assets/butter-2d35/rig.js` and `motion.js` for independent limbs/tail/band.
New animations remain reviewable candidates: do not regenerate the face/body
to add motion. The two-hand motion is implemented; a dedicated giant-slingshot
pose is NOT. `assets/butter-2d35/cleanplate.png` may only fill old arm/weapon
occlusion masks, never replace the entire approved character. Two source hand
attachments and their provenance are recorded in that directory's CREDITS.md.
`butter-2d-motion.html` compares the source and the actual game renderer.
The user rejected v33's barely visible motion. v34 is preserved as
`butter-motion-cutout34.js` for optional-image failure fallback. Check foot travel at 96px AND real preview
playback (including reduced-motion opt-in), not only sampled frame differences.
Existing 3D assets and their archived renderer are preserved, not used in-game.

For animation work, also read `docs/art/BUTTER_MOTION_REFERENCE.md` and its linked
JSON. They record actual playback/pose inspection of the user-supplied Trickcal
viewer (`battle/butter`, Normal) on 2026-11-03, not guessed motion from static art.
The original has separate Move/Attack/Skill clips, but four-direction coverage
and combined moving fire were NOT established. Keep the approved artwork and
handedness rules; source motion is a reference, not an approved replacement.
Distinguish the original reference survey from the subsequent v35 implementation.
Browser checks must load all three images and assert `layered35`, not silently
exercise the fallback. Keep rear-view arms behind hair/body, and clear the full
old silhouettes (including antialiasing) when moving arms or tail.

Carry forward explicit user corrections in `BUTTER_CANON.md`. If the user changes
an approved rule or approves a new master, update the record and checksum together
and explain the change. A newer file or successful technical check is not approval.
