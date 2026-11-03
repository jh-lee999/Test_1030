# Project instructions

## Active v41 economy and contracts (supersedes v39 remote shop access)

Shops are physical merchants: first-room exit and optional shop rooms at depths
1/3/5. F/B requires room completion, ground contact and merchant proximity.
Shop rooms start cleared/rewardTaken and can be skipped without spending or
accepting a contract. Validate merchant platform support and path reachability.
WORLD_VERSION is 41; the same input seed is reproducible within this version,
not promised to reproduce the v38 graph. Physics stays unchanged.

`platformer-economy.js` owns quotes, shop RNG rolls and contract definitions.
Purchases/removals must pass through engine functions to synchronize cooldowns
and shields. Sell one inventory copy, rebuild stats and clamp HP; never heal on
removal or double-apply inscriptions. Show sale consequences before confirmation.
Sale value is less than the combined discount/coupon buy price: no arbitrage.
Service purchases don't earn stamps or consume coupons; stock rerolls don't
reset once-per-market service flags. Use only shopRandom for market randomness.

Contracts activate on the next combat, wait through safe rooms, settle once,
and pause timers in all menu phases. Flawless tracks actual HP damage, not shield
loss; frenzy affects enemy HP and incoming damage only while active in its room.
Everything resets on a fresh run. No permanent progression has been authorized.
Run economy41 unit tests and `tools/check-platformer-market-browser.mjs` alongside
the build/chain/world/art/browser checks. The merchant is friendly reuse of the
existing fan Idle pose with a procedural stall, not an original merchant NPC.
See `docs/market41.md`. Butter and all source sprite files are unchanged.

## v40 lower-grade ricochet rule

Lower grade adds one bounce per level, plus inscription/item chain bonuses.
The user explicitly requested repeat hits on a nearby previous target: A -> B -> A
is legal. Do not restore the lifetime hit blacklist for homing shots; only the
immediately previous victim is excluded. Select the nearest living target within
480 world pixels of the hit enemy, with >=80ms between impacts and a finite bounce
budget. Normal piercing projectiles still use a lifetime hit blacklist. Run
`test/platformer-chain40.test.js` and `tools/check-platformer-chain-browser.mjs`.
The previous discussion of replacing the airborne low-skill source pose was only
a proposal, not approved/applied; do not conflate this ricochet change with art.

## Active v39 build rules

The user clarified that accumulation means **within the same run**, not permanent
meta-progression. `platformer-build.js` owns the side-scroller's 28 items, derived
stats and six 2/4 inscriptions. Inventory counts are the source of truth; rebuild
from base stats on acquisition, never overwrite earlier stacks. Duplicate copies
count for inscriptions; apply each threshold bonus once. Use engine `grantItem`
for acquisitions so current cooldowns/shield stay consistent. Do not migrate the
archived top-down engine's rules. Shop, loot, combat and map RNG stay separate.
See `docs/build39.md` for formulas, caps and which Skul-inspired features are NOT
implemented. Keep low-grade level bonuses connected to real projectile behavior,
not only descriptions. Changes must pass the build/combat39 unit tests and
`tools/check-platformer-build-browser.mjs` in addition to the existing checks.
I opens build/inventory; B opens the shop only after room/event completion. These
panels freeze combat. Fresh runs reset items; room transitions preserve them.

## Butter artwork: persistent source of truth

**Latest genre / mirroring decision, 2026-11-03:** the user requested a Skul-like
side-scrolling platform action game (NOT a belt-scroller), Butter as the default,
and original Trickcal monsters/backgrounds. They explicitly answered
**"좌우 반전 허용"**, including the weapon and bag changing sides on a whole-frame
flip. This supersedes the historical no-mirroring/physical-hand rules BELOW for
the active side-scroller only. Do not change or regenerate the source artwork.
`index.html` now runs `platformer.js`; `topdown36.html` preserves the old game.
`platformer-renderer.js` flips the WHOLE original pose, and `heroMuzzle` in
`platformer-engine.js` applies the same transform to the source muzzle marker.
Jump poses are samples of source Move, not a newly discovered Jump animation.
As of v38, room topology/geometry comes from `platformer-world.js`, not preset
platform arrays. Keep map, per-node geometry, loot and combat RNG streams separate.
`platformer-physics.js` is shared by actual movement and navigation validation;
changing jump/gravity/speed requires regenerating and retesting reachability.
Run `test/platformer-world.test.js`: seed reproducibility, graph connectivity,
all-platform/exit navigation, live jump witnesses, events and route gating.
Never silently reintroduce fixed four-room progression or assume an exit is at
the global FLOOR height. Preserve Butter artwork during world-generation changes.
Run the v36 preview/archive browser check AND `tools/check-platformer-browser.mjs`.
Keep source provenance in `assets/trickcal-stage37/CREDITS.md` / `sources.json`.

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
implementation: no fake four-direction claim. The v36 archived top-down game
does not mirror; the v37 side-scroller mirrors as explicitly authorized above.

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
