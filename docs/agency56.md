# Make the near-miss yours · v56

User asked to continue until the game felt more engaging to us, not merely to add
another list of systems. The concrete targets were passive waiting for a good
roll and too many post-fight confirmations. This stays a dice roguelite; no new
genre, character redraw or permanent growth.

## Changes

Two manual pip edits per encounter. Select a die by clicking it (still toggles
hold), then use −/+ or [ / ]. An edit is exactly ±1 within1..6, costs one of the
two charges, auto-holds that die and clears its kept flag. It does not consume
RNG, a reroll, or add pressure. A later actual held-through reroll can earn kept
again; clicking/editing alone cannot farm the pillow bonus. Budget does not
refill per turn, only at the next encounter; new runs reset cumulative usage.

Read-only near-miss hints enumerate legal single edits that create a new
combination or upgrade kind to four/five. Up to two hints show actual post-edit
damage/guard, including the loss of kept on that die. They spend one edit and
select the resulting pattern, **never attack automatically**. If any current
legal pattern already kills, hints disappear: do not encourage wasting a charge
or destroying a ready lethal hand. Manual controls remain available.

Relic cards/inventory explain existing echo-weather, echo-candy, kept-rubber and
bell-manual-edit relationships. These hints add no hidden effect or multiplier.
Intermittently absent external SVG use instances during die rebuilds were seen
in a desktop capture. The UI now optionally inlines the existing symbol paths,
retaining their32px viewBoxes/colors. Failed symbol fetch uses the existing
external fallback; startup never waits for this optional request. No source
icons/artwork are regenerated.

Once the camp budget is spent, route choices appear immediately. One redundant
confirmation per camp is removed (five per complete run). travelFromCamp validates
phase, budget and route ID before atomically saving history and advancing. Old
leaveCamp/chooseRoute APIs stay available for regression tests/diagnostics.

Normal enemy HP is now210/300/430/560/740; boss1800. Elite scaling remains×1.6/
counter+4. This gives the new control room to matter and exposes enemy cycles;
large earned combinations can still one-shot. Boss≤50% HP gains counter+3 and
permanent exposure1.35. Both are visible. Its counter and intent are snapshotted
at attack commit. Crossing the threshold at impact cannot surprise the player
with an increased counter for that already-committed attack, even after pause.

## What was actually played / judged

A separate interactive browser session used seed56, real UI actions, current
hand/intent inspection and explicit decisions, not sampled-policy instructions
or granted items/HP. Starter chosen was 황금 방울, not the policy's default.

First hand: [6,4,1,1,4]. Pair96/guard6 was chosen over free60/guard0, absorbing
the entire6 counter. Next hand [5,6,2,2,4], enemy114HP, charging/exposed. Changing
one2→3 produced2..6 straight, preserving both unused-reroll bell bonuses and
dealing442. Then straight was trained at camp, and the normal guard route chosen
directly, with no confirmation click. At the next guard's300HP, hand[4,2,6,4,4]
allowed6→5→4 using both edits, a four-kind312 after its28 armor. This second
encounter was inspected as a ready payoff, not reported as a full completed run.

The observed improvement was a controllable setup→payoff: defending deliberately,
repairing a near-miss and seeing a big source-timed shot, rather than simply
waiting for RNG. This is a limited qualitative judgment, not evidence everyone
will find it fun or a claim of a complete human playthrough. A further improvement
found during that inspection was suppressing hints after a lethal combo exists.

## Verification and limitations

234 unit tests (8 new): edit validation/purity/budget, real preview equivalence,
no pillow farming, range boundaries, atomic travel, threshold crossing and
committed counter, existing-only synergy hints and no wasted lethal suggestions.
Source/canon/original/stage/sprite checks remain required; no source files changed.

check-dice56-browser replays the natural first encounter above with native
mouse/keyboard controls and checks the actual442 payoff, no autofire, unchanged
rolls/pressure, hidden lethal hints, direct camp travel, mobile touch/reduced
motion, all320/390/760/844 widths and a900px desktop attack button. Explicit
synergy/boss-crossing fixtures are separated from that real-resource sequence.
The updated check-dice55-browser performs the full six-room seeded run using a
read-only sampled policy and legal buttons, including manual-edit choices.

Final checks passed:234 unit tests, all four source/art checks, the updated
six-room browser run (9 attacks,11 rerolls,5 camps/routes), v56 native controls /
442 payoff / boss snapshot tests, and all preserved classic, original playback,
nine platformer and three bonk browser checks. The manual inspection is separate
from both these automated resource runs and explicitly labeled fixtures.

Across seeds1..16 with the same sampled one-step policy and current HP values:

| Available edits | Wins/16 | Mean ending HP (loss=0) | Mean attacks |
|---|---:|---:|---:|
| Not used |9|10.5625|17.3125|
| Used for new combos/lethals |15|23.4375|11.9375|

The editing policy used8.9375 edits/run on average. It knows no future game RNG,
grants no resources, and is not optimal or a fun metric. It shows agency matters,
not that difficulty is finalized. These numbers preceded the UI-only icon fix
and suppression of redundant hints when a lethal is already ready; that policy
already attacked existing lethal hands instead of editing them.

Six rooms, four enemy roles and14 artifacts remain a small prototype. More menus
or numerical upgrades are not themselves entertainment. Future work should be
driven by actual player feedback on hand decisions, payoff clarity and repetition,
not by extending this diagnostic into a false claim of human enjoyment.
