# Butter's little dice roguelike · v52

User rejected the pinball and accepted the dice proposal. Active root now loads
dice.js, dice-engine.js, dice-renderer.js and dice.css. slingshot51.html is a
byte-identical archive of the previous index (Git blob0e96ef32cf17e960814709ae4579f7960ab08f84).
All old engines, art, studies and side-scroll47.html are retained. Bonk browser
checks now target slingshot51.html; their test hooks and assertions remain.

## Prototype loop

Choose one of three starter relic offers. Each turn rolls five fair6-sided dice,
then allows two optional rerolls. Click/tap dice to hold, or use keys1..5. R rerolls
unheld dice. All-held reroll is disabled. Choose one of four attack cards, inspect
its exact relic-adjusted calculation and commit. The enemy counters only if it
survives. Three ordinary encounters each grant a new nonduplicate relic and heal12
once, then a ghost boss bans the last used pattern. Everything resets on replay.

| Pattern | Scoring dice | Base chips | Base mult |
| --- | --- | --- | --- |
| Free throw | All5 |4|1|
| Pair | Highest matching pair,2 dice |8|2|
| Kind | Largest matching group,3/4/5 dice |12|3/5/9|
| Straight |1..5 or2..6, all5 |18|4|

Each scoring die adds twice its face value to chips. Ribbon echoes repeated
scoring faces exactly once, and its echoed events trigger candy/pillow as well.
Candy adds8 chips on face1 or6; pillow adds .5 mult for a die actually held through
a reroll. Simply clicking hold after finishing rolls does NOT earn that bonus.
Bell adds12 chips per unused reroll; empty pouch adds2 mult when both are spent.
Rubber multiplies final mult by1.5. Damage is floor(chips×mult), with a first-turn
guard reduction30 (minimum1). Trace entries and previews share this exact engine.
No endless event recursion, paid rolls, monetization or real-money stakes.

Enemy HP180/320/460/1000, counter6/8/10/12. Every fourth turn adds another2 counter
damage; archer adds3 from turn3. Actual next damage is always displayed. Boss bans
pattern IDs, including the whole kind family. If all valid patterns are banned
and rerolls exhausted, the pass button takes the normal counter, clears the ban
and starts another turn. No disabled-button dead end.

RNG is explicit seeded state with independent roll/loot streams. Preview does not
change either. Held dice do not consume roll RNG. Menus/blur freeze rolling,
resolution and source-animation time. Attack damage applies once at source
release timing plus .3s star travel; resolution lasts about1–1.45s, not a long
forced spectator interval. Double input cannot duplicate damage or rewards.

## Art and UI

Existing original whole-pose Butter and four original monster roles are reused,
not redrawn. Butter size80/anchor(190,220) fits FULL idle/shoot/high cells within
1000×300. Monster cells use fixed per-role scales. Source images, frame origins,
colors and art renderer are unchanged. One source view exists; no invented rig.
The combat, dice faces, UI names and scoring rules are fan-game adaptations, not
claimed original Trickcal mechanics. Provenance stays in existing asset credits.

Plum/cream table, held-die highlights, explicit face numbers, actual score cards,
readable counter/rule, staged score trace, seed replay and touch controls. Modal
content makes the rest of the app inert. Reduced motion removes UI rolling and
decorative playback but keeps the same rules. Failed optional images use basic
display and do not prevent starting. No external runtime requests or telemetry.

## Verification and limits

Unit tests cover all patterns, hold/RNG isolation, finite relic chains, exact
calculations, bogus hold prevention, one-hit/one-counter settlement, pause,
duplicate reward rejection, boss fallback, four-room progression and full art
cell bounds. Browser uses actual mouse/keyboard/touch and completes a genuine
seed52 resource run:11 rerolls,8 attacks,3 rewards, boss and victory. It separates
an explicit no-legal-pattern pass fixture from that genuine run. Also checks
seed replay, phone widths320/390/760/844, reduced motion and image failure.

playtest-dice52.mjs samples legal hold masks for one-step expected-value decisions;
it never grants stats/HP/kills or peeks at future roll RNG. It is not a human
playtest, global optimum or proof of fun. A first comparison exposed an excessive
pillow multiplier; reducing +1 to+.5 removed many single-attack clears while
preserving echo synergy. Across seeds1..24, planned echo/pillow-priority runs won
24 each, early-bell priority18; no-reroll counterparts won2/0/5. This establishes
decision impact, not player difficulty or enjoyment. Live feedback is still needed.

Scope intentionally remains4 fights,4 patterns,6 relics (at most4 owned per run).
No shop, metaprogression, deck editing or claimed complete Balatro clone. Run
npm test, all art checks, check-dice52-browser and ALL archived required checks.
An initial archived platformer smoke run missed its timed boulder assertion;
an isolated serial rerun passed unchanged. No archived runtime was modified.
