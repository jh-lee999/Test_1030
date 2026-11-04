# Projectile presentation · v54

The active dice game now draws a sourced rotating stone, muzzle glint, warm
comet trail, small star motes, expanding hit ring and dust. High attacks use a
larger stone and stronger burst; rage adds a second ring; actual weather chip
procs add blue lightning. Mace stun can show three orbiting stars. These are
visuals for an existing single attack, NOT additional damage events.

One verified `rock` region comes from original Butter's atlas. Seven particle
textures are Kenney Particle Pack CC0, not discovered original Trickcal attack
animations. See assets/dice-fx54/CREDITS.md and atlas.json for original URLs,
regions, hashes, transformations and separate rights. The combined512x256 PNG
is63,403 bytes. No original full texture, skeleton or external runtime is bundled.

## Timing and art invariants

dice-effects.js is a pure sampler of pending.clock. It derives the launch point
from butterMuzzleOffset at the SAME source release time as the existing engine.
Normal release is .33333s and high .69915s; both reach the enemy at the engine's
existing release+.3s hitAt. Position follows a short continuous arc; stone
rotation and particle positions derive solely from time/index, not RNG or RAF
event counts. Hit particles finish within the existing .35s post-hit settlement.

Butter's original images, uniform80px size, (190,220) anchor, drawButterMotion
call and all monster/source cells remain unchanged. No cutout hands, new poses,
per-frame fitting, recoil transform or camera shake. Resolve score text moves
above the projectile lane instead of covering it. Scores, HP, charges, rolls,
enemy timing, seed streams and all archived games are unchanged.

Sampling has a bounded <=32 sprite budget. Weather bolt requires a real weather
step in the committed result, not item ownership or a cosmetic random chance.
Pause/menu clocks freeze naturally. Reduced motion removes the moving shot,
muzzle flash, rotations, star spray and bolts; a small static impact ring remains.
The atlas loads asynchronously and cannot delay start. If it fails, the shot
falls back to a small neutral stone without stopping combat. Runtime is local.

## Verification

216 unit tests and all four canon/original/stage/sprite checks passed. Six new
tests protect source/atlas identity, full bounds, shared source muzzle/release,
readonly deterministic sampling, true-proc-only bolts, pause, reduced motion and
identical combat results with/without repeated effect sampling.

check-dice-effects54-browser captures a genuine button-driven first projectile,
pauses it mid-flight and verifies the pending clock freezes. Separate clearly
labeled enhanced/weather fixtures use the real renderer/assets and verify no
game-state mutation. Screenshots use clipped1000x300 panels, since background
overscan on an unclipped900px filmstrip would overwrite adjacent samples.
Desktop flight and source high release/flight/hit strips were visually inspected.
Mobile/reduced-motion and missing-atlas start/attack settlement are checked.

Run v53 artifact and v52 resource browser checks, the original playback/archive
check, nine platformer checks and bonk48/49/50 checks too. Browser automation and
technical passes are not aesthetic approval by the user or proof of fun.

All of those browser checks passed in this revision. The legal seed52 dice run
still uses8 rerolls/9 attacks/3 rewards and wins with the same HP, build and score
rules; the VFX sampler introduces no combat changes. Missing-atlas and reduced
motion checks passed separately from the enhanced visual fixtures.
