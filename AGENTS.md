# Project instructions

## ACTIVE v48: slingshot pinball prototype (user-approved genre change)

The user explicitly accepted the proposed small Butter pinball roguelike after
rejecting repeated side-scroller improvements. `index.html` now loads bonk.js,
bonk-engine.js and bonk-renderer.js. The unchanged side-scroller entry is archived
at side-scroll47.html; all platformer browser checks now target that URL. Earlier
side-scroller campaign/physics/build requirements below still protect the archive,
not a demand to force21 rooms or real-time platform movement into the new game.

Current scope: three seeded encounters then one ghost boss,3 normal monster roles,
8 stackable run upgrades and2 explicit fusion goals. No meta growth. Aiming is
free; one committed volley resolves before ONE enemy turn. No damage during aim.
Excess XP queues every level choice; all choices finish before enemy/next phase.
Walls, round bumpers and enemies use shared reflection equations with <=1/240s
physics substeps. Low chains use finite level-scaled hops, clear target on impact,
allow A-B-A and exclude only the immediate victim. All balls expire by6s; recall
still pays the normal enemy turn. First returning ball sets the next launcher X.
Split children never split again (64 ball cap). Explosions pay kill XP once.
King is earned on hits, costs100 at firing, pierces enemies/pegs and scales with
upper upgrades. Fusion conditions/effects are in bonk-engine.js, not UI-only claims.

Keep original Butter/monster files and the one original camera view unchanged.
The procedural table launcher shows aim; do not fabricate a rear/up-facing rig.
HERO_PRESENTATION uses one uniform scale/anchor for idle/shoot/high; full source
cells must fit. First queue release follows butterReleasePoint. Do not fake
moving source hands or auto-fit frames. Canon and source bounds still apply.
Run bonk48 tests/browser plus ALL archived required checks. The aiming solver is
full-information diagnostic automation, NOT a human playtest or proof of fun.
See docs/bonk48.md. Preserve the unrelated untracked chibi release WebP.

## v47 combat spaces and committed attacks (supersedes v45/46 geometry)

The user rejected v46 as boring. Do not equate extra build choices, tests or a
bot win with fun. The reported barrage seed is 1793686699326: formerly holding
J for20s killed2 enemies at full HP on isolated platforms. WORLD_VERSION=47:
combat/elite rooms now have a1450..1940px connected floor and four randomized
optional-ledge arrangements. At least4 enemies share the floor; mixed rosters,
safe spawns, reachable raised support enemies and the existing21-depth DAG stay.
Events/bosses keep their earlier geometry; player physics and art are unchanged.
`platformer-threats.js` owns shared windups, attack reservations and committed
aim. Arena tells start on screen, >=.28s apart, max2 concurrent windups. Do not
cancel an already-started tell when the player leaves. Melee facing and archer
aim lock when their tell starts; front-only melee must miss a player behind.
Rusher exposes after landing, fan/guard/archer after release, drone in recovery.
An exposed primary hit deals150% damage; skills do not get this bonus. Keep the
green label/guard shield and actual window consistent. Drone detection/flight
lane/locked muzzle rules remain. Initial first-room drones start outside780px.
Run encounters47 unit/browser plus ALL previous checks. The new browser separates
the real-input skirmish from its explicit guard fixture; neither proves fun.
See docs/encounters47.md. Preserve the unrelated untracked chibi release source.

## v46 coherent run paths

Product runs select one immutable ricochet/barrage/boulder path before starting.
`platformer-paths.js` owns definitions. Keep style and awakening outside inventory
and preserve them through rebuildStats, sales and room transitions. No meta growth.
Focus is earned only by combat: primary hit +4 (charged +4..12), kill +5,
real perfect evade +14, clean clear +12. It never refills with time. E costs
ceil((awakening overload ? 45 : 60) * (1 - cooldownReduction*.5)); minimum cast
interval 1.8*(1-CDR). Skill/echo hits cannot generate hit focus or predator healing.
Barrage: +18 heat per release, locked at 100 until <=30. After .18s, cooling is
35/s while held and 85/s while released. Heat60+ releases gain x1.35 damage and
+2 hit focus (orange shots); keep this visible risk/reward, not only a penalty.
Boulder charges while held, fires ONLY
on release; charge must retain lower-grade proc/pity/counter rules. Cancelling
input in menus discards the charge. First elite/boss gives one irreversible
awakening instead of an item. Block its reroll/cash alternative.
World stays v45; physics and source art unchanged. Neutral engine default is
kept for old regression fixtures ONLY (`?test=1&path=classic`), not a product path.
Run paths46 tests/browser as well as ALL earlier required checks. The input-only
pilot is a diagnostic, not proof of fun or a claim of human playtesting. Report
its limits and inspect the actual keyboard/touch playback. See docs/paths46.md.

## v45 core combat and pacing

User clarified: everything feels dull because holding forward attack clears the
game. Prioritize positioning and actual enemy pressure, not extra menus/stats.
WORLD_VERSION=45: 4–6 main combat platforms, 1 event platform, preserving physics
and 3-act progression. Ordinary fire has a 620px base path budget (speed/range
items scale it); initial homing acquisition respects remaining range. Ricochet
still has the approved level-scaled finite bounce budget and A-B-A revisits.
Both teams' bullets stop at platform bodies; boulders keep their existing floor
bounce physics. A projectile already inside a platform may exit it (source
muzzle overlap), but cannot enter other cover. Roaming drone/rusher knockback
uses room bounds: NEVER clamp them back to their original home platform.
Dash through a real attack grants one 3s counter charge per dash, spent by the
next normal attack to fire a 150%-damage low shot. Existing immunity and empty
dashes do not grant this. Counter is not permanent/inventory progression.
Short hit pauses affect enemies only; player inputs and clocks remain live.
Synthesized audio is user-gesture unlocked and optional; never affects RNG.
Run combat45 tests plus the existing world/build/chain/drone/art/browser checks.

## v44 drone correction

platformer-drone.js owns drone behavior: finite detection, a horizontal distance
band, acceleration limits, grounded flight lane, fixed-muzzle .7s aim and .45s
recovery. Never resume exact pixel-offset pursuit or copy player jump/fall Y.
Do not rotate or move the muzzle during an attack: aimTarget and telegraph must
match the two released shots. World generation stays v43 so the reported seed
1793682210169 is unchanged. Run drone44 tests and check-platformer-drone-browser.

## Active v43 enemy variety and difficulty

Use platformer-art.js to merge immutable v37 art with the four original v43
monster atlases. Keep source hashes and constant clip origins. Do not bake over
old art. Original caster/guard/rusher/drone roles are fan-game adaptations.
platformer-enemies.js owns enemy profiles and mixed encounter rosters. Every
combat room guarantees >=3 different types; elites add support enemies.
Rusher crosses platform edges with shared landBody; drone tracks outside home;
guard turns at intervals and blocks 75% frontal damage outside attacks. Behind,
attack windows, burns, boulders and damage-enabled dashes are counters. Caster
locks a visible 1s mark that dies with its owner; menus freeze marks.
High-skill immunity is now ONLY 1.1s of casting (supersedes older full-duration
immunity statements); boulder duration/scaling are unchanged. Keep UI accurate.
Run enemies43 tests/browser, required old checks and new sprite gutter checks.
WORLD_VERSION=43. New runs regenerate mixed formations; same-run stats persist.

## Active v42 campaign (supersedes v41 single-act topology)

WORLD_VERSION 42 has 3 acts, 7 route depths each (STAGES=21). Bosses at 6/13
lead onward; ONLY the exit at depth 20 wins. Keep ACTS biome pools coherent.
Map shows one act at a time and switches to the next act at a guardian gate.
Inventory, money, coupons and pending contracts persist across acts.
Each act keeps its own shop/rest choices. Bosses reuse existing source art with
new fan shockwave / archer spread / ghost radial patterns and half-HP pressure.
Preserve windup for an attack already in progress when crossing half HP.
Hazards warn for .9 seconds before .4 seconds of damage, stop in menus and
after clearing, and can be avoided by jumping/dashing. Do not change physics.
Boss rewards guarantee three epic choices even on reroll; no cash alternative.
Normal rewards allow a once-only cash alternative, higher on gold-marked routes.
Run campaign42 tests, all existing required tests and the 21-room browser loop.
See docs/campaign42.md for scope and remaining limits.

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
