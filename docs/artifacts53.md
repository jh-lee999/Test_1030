# Source-reference artifacts · v53

Root keeps the v52 dice loop, source Butter/monster/background files, anchors,
renderer, archives and four encounters. This is not another character redraw.

Eight original artifact PNGs, verified Korean names and effect summaries come
from a pinned public 2025-08-25 Triple3T/trickcaltool snapshot. See
assets/trickcal-artifacts53/CREDITS.md and sources.json for URLs, hashes, rights
limitations and original-vs-adapted mapping. No current live-game coefficient,
signature animation, art license, or identical original combat is claimed.

## Rules

There are 14 nonduplicate relics, at most four owned per run. Each draft offers
two unowned original-reference artifacts and one fan relic when available.
Loot RNG uses a new :relic53 stream; original :dice52 rolls stay unchanged.
The same seed replays v53, not the old v52 relic draft sequence.

Original-reference effects: yellow card enhanced combo ×1.35 plus ×2 at rage3;
Komi heal8 once/fight after surviving a counter at ≤30% HP; weather +18 chips
every3 scoring triggers; belt shield8 each fight; scythe free/pair execution
after leaving a normal enemy at ≤18% maxHP; lucky die free/pair 5% actual HP
damage lifesteal, floor/cap4; rust ×1.2 when injured; mace after3 HP-damage
counters grants free/pair ×1.5 and cancels its counter. No fake new gun animation.

Order: pattern → die chips → finite echo/candy/kept/weather triggers → bell/
empty → yellow/rust/mace → rubber → floor → first-turn guard → optional normal
enemy execution. Lifesteal uses min(enemyHP, damage), clamps maxHP, and happens
once at impact. UI rounds displayed multipliers only; engine damage keeps its
actual calculation. Preview never changes RNG, charges, HP or once-use flags.

At impact commit lightning remainder, rage spend, mace spend and heal once.
Enemy only counters if alive. Stun cancels that counter; otherwise shield absorbs
first, then HP loss charges rage/mace, then Komi checks living HP. Shield damage
alone cannot charge either. No revive or overkill lifesteal. Rage/lightning/mace
carry between rooms; shield resets to8 and Komi's flag clears on room advance.
All growth resets on a fresh run. Pass receives the ordinary shield-aware counter.

Existing fan pillow's kept-die +.5 mechanic remains under 꼭 쥔 행운, so it no
longer incorrectly claims to be original 코미의 베개. All six fan relics are
labeled, and original cards separate source summaries from this game's rules.
Cards use unmodified PNGs with object-fit:contain. Optional PNG failure reveals
the SVG underneath; no start dependency or remote runtime request is introduced.
Visible statuses show rage/lightning/mace, Komi availability, shield and selected
counter/absorption, lifesteal or execution. Source credit links live in the footer.

## Verification / limits

210 unit tests passed, including 11 new source-hash, draft, trigger, cap, carry,
preview purity and once-only tests. Canon/original/stage/sprite checks passed.
check-artifacts53-browser uses a real draft plus an explicitly labeled eight-item
fixture (not a legal four-item run) to inspect icons, provenance, shield, charges,
stun and lifesteal. It checks 320/390/760/844 widths and missing-PNG start/attack.
check-dice52-browser separately completes a legal seeded resource run using only
actual buttons and read-only sampled decisions, plus isolated boss-pass fixture.
Original and all archived platformer/bonk browser checks remain required.

Final seed52 browser run passed with 8 rerolls, 9 attacks, 3 rewards and boss
victory, owning echo/bell/weather/pillow. This exercises a sourced weather
artifact in a genuine run as well as all eight artifacts in the explicit fixture.
The original playback/archive check, nine platformer checks and bonk48/49/50
checks all passed serially with no runtime errors. Desktop draft, eight-icon
inventory fixture and 390px scrollable draft screenshots were inspected locally.

Sampled policy prioritizes some offensive original artifacts and consumes no
future RNG. It is not a human playtest, proof of fun, optimal policy, or a broad
difficulty survey. Four encounters, no shop or metaprogression remain the scope.

Decimal multiplication strips binary float noise to 8 decimal places before
flooring, in both trace totals and damage (e.g. 30 ×1.2 ×1.5 =54, never53).
