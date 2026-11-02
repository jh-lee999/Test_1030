# Project instructions

## Butter artwork: persistent source of truth

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
the fixed sprite template and requested integration. The v33 game uses that
UNCHANGED PNG through `butter-motion.js` and `assets/butter-2d33/rig.js`.
New animations remain reviewable candidates: do not regenerate the face/body
to add motion. The small cutouts are not full new two-handed/skill poses.
`butter-2d-motion.html` compares the source and the actual game renderer.
Existing 3D assets and their archived renderer are preserved, not used in-game.

Carry forward explicit user corrections in `BUTTER_CANON.md`. If the user changes
an approved rule or approves a new master, update the record and checksum together
and explain the change. A newer file or successful technical check is not approval.
