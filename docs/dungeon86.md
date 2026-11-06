# v86 — essential animation is not decorative reduced motion

2026-11-06 Asia/Seoul. User clarified the symptom is animation stopping/jumping,
not necessarily missing source pixels. This revision does not replace source art,
change animation releases, or retune combat to conceal the problem.

## Reproduced faults

85 forced the player's gait/action/time to zero, regular enemies' index to zero,
and bosses/Velvet to their initial frame when `prefers-reduced-motion: reduce`.
In the same3s engine-input/render fixture,85 rendered only one player idle frame
and one frame per enemy. Normal mode rendered88 moving-shot source frames,
12 walking frames,60 high-skill frames and24 walking frames per enemy.

86 keeps those essential actor clocks in BOTH settings. Reduced motion still
suppresses decorative trails, rotations, bobbing, glow and damage-number drift.
It no longer hides the attack/walk motions conveying combat state. This behavior
is reproduced under a controlled media setting, not proof of the user's OS setting.

The old missing-clip fallback always selected idle/reference frame0. A missing
moving-shot sheet could therefore stop the legs while the player moved.86 uses a
ready walking clip with the existing gait phase, an available attack for stationary
shots, then a time-animated idle, and a
poster only as last resort. Missing enemy attack/boss skill clips likewise use a
ready animated walk/idle instead of a frozen pose or temporary circle when possible.

The loader now publishes a new image only AFTER decode/priming. It preserves the
previous ready image during replacement/retry, bounds retries at2, and prevents
an older late decode from overwriting a newer request. Small essential hero clips
are queued before scenery/icons. Gun sheets prefetch when Yellow is actually
visible in the current room's gifts/stock, without granting the item or reading
unvisited rooms. Loaders/visual state never enter the saved game or consume RNG.

Fully loaded source selection, frame rectangles, origins, uniform scale, source
release times and facing remain identical to71/36. No cutout/limb rig, invented
frames, crossfade ghosts, or original art files were added/replaced. All1296 original
Butter/gun frames were read and had nonempty silhouettes. The long sheets still
use the original pixels. Their size alone was not established as the cause.

## Verification

- `test/dungeon86.test.js`: original frame selection across800 state combinations,
  animated degraded fallbacks, unchanged whole-cell draw geometry, paused clocks,
  async decode visibility, bounded failure/retry and last-request-wins behavior.
- `tools/audit-animation86-browser.mjs`: all1296 source frames, then real engine
  inputs and renderer source-rectangle traces.86 normal/reduced essential frame
  sequences match in order. `AUDIT_VERSION=85` reads the exact85 archive to reproduce frame0.
- `tools/check-dungeon86-animations-browser.mjs`: actual keyboard walking,
  moving firing, high skill and gun firing in normal/reduced media contexts;
  also repeats with moving-shot sheets blocked. Observes actual renderer calls,
  verifies real shots/high skill, paused frame stability, unchanged actor pose
  across a live media-preference toggle, and exact saved resume.
  Yellow is explicitly granted as a weapon fixture, not organically earned.
- A Canvas stream records the reduced-motion keyboard run for visual inspection.
  Cache clearing is used only to observe source-frame rectangles; neither that
  trace nor the recording is an FPS benchmark or a human fun assessment.
- Existing86 browser/crate/rules/decision/pixel/mobile/failure paths and full tests.
  Isolated performance check uses no concurrent heavy test/recording.

Engine84, world84, save84,85 cache/door passages and original assets are unchanged.
Continue the existing `butter.dungeon84.v1` run. Exact85 root is `dungeon85.html`;
old85 tests only redirect their entry URL.85 diagnostic/source pins are immutable.

```sh
npm test
node tools/audit-animation86-browser.mjs
AUDIT_VERSION=85 node tools/audit-animation86-browser.mjs
node tools/check-dungeon86-animations-browser.mjs
node tools/check-dungeon86-browser.mjs
node tools/check-dungeon86-rules-browser.mjs
node tools/check-dungeon86-crates-browser.mjs
node tools/check-dungeon86-decisions-browser.mjs
node tools/check-dungeon86-pixels-browser.mjs
# Run alone:
node tools/check-dungeon86-performance.mjs
```
