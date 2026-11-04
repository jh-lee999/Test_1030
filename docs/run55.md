# A run built from decisions · v55

User asked for autonomous fun improvements informed by other roguelites. This
keeps the dice game and all approved source art, rather than changing genre again.

## Design references, not copied game rules

- **Slay the Spire**: readable enemy intentions, choosing encounters and spending
  a rest opportunity on either survival or growth.
- **Dicey Dungeons**: dice can have a tactical purpose beyond maximizing their
  numeric total. Our unused-scoring-die guard rule is a new adaptation, not an
  assertion that Dicey Dungeons uses that exact rule.
- **Balatro**: developing particular combinations and building synergies inside
  limited item slots. Four slots and these upgrade numbers are our rules, not
  Balatro's exact Joker/hand system.

These are conceptual references from known mechanics, not a claim of fresh human
playthroughs, a complete clone, or copied assets/code from those three games.
Trickcal/Kenney art and source/rights credits from earlier versions remain.

## What changed

New root: dice55.js + dice-run-engine.js + dice55.css. Classic dice.js/engine
stay intact. dice54.html preserves the previous index byte-for-byte (Git blob
645baed19a4b4fff9f65dc16a91e550b5f2e8814). v52/53/54 browser checks now use
that archive. Shared renderer only gains optional text-label overrides; its
default output and all character scales, poses, effect files and anchors stay.

### Each turn: damage vs safety

Five6-sided dice, two optional rerolls and the existing four combinations remain.
Each die NOT used by the scoring pattern provides2 temporary guard. Pair leaves
three dice for guard6, triple leaves guard4, free/straight leave none. Ribbon
cannot duplicate guard. Temporary guard absorbs first, permanent belt shield
second, then actual HP loss charges yellow/mace and checks Komi. Unused guard
expires; no guard farming. For example, [1,1,6,5,4] can choose low pair damage to
block6 instead of the larger free throw with no guard. All card previews show
damage, guard and actual HP loss if the enemy survives.

Every valid reroll adds1 to that turn's enemy attack. All-held/invalid/double
rerolls cannot consume RNG or add pressure. The cost is shown at the button.
Kills still avoid the counter, so pushing for a lethal combination can be right.

### Enemies have turns, not only escalating HP

| Role | Three-turn cycle: base counter | Extra rule |
|---|---|---|
| Follower |6 /2 /12| The charging second turn is exposed |
| Archer |3 /14 /2| Third turn reload is exposed |
| Guard |7 /10 /4| First two turns have28 armor; pair ignores and permanently breaks it for this fight |
| Ghost boss |10 /18 /5| Third turn exposed; previous pattern banned |

Exposure multiplies outgoing damage1.35. Every fourth turn adds another2 counter
damage. Add reroll pressure and elite+4 where applicable. Intent/rule and next
action are deterministic, public and read-only. No damage occurs while deciding.
The boss retains a legal pass when every pattern is banned and no rerolls remain.

### Each camp: an opportunity cost

Six encounters, starting HP48. Normal enemy max HP by depth:140/235/340/450/600;
final boss1600. A clear does **not** automatically heal or grant a relic. It gives
one camp activity; clearing an elite gives two. Each activity buys exactly one:

- Heal up to16 (cannot waste an activity at full HP).
- Train one combination, stacking chips+8 and **final** multiplier+.75 per
  level, capped atLv3. Added once after original relic scoring, then exposure.
- Choose one of three unowned relics. Four slots maximum; when full, explicitly
  choose which old relic to replace or cancel. No silent deletion. Only charges
  belonging to the removed relic are reset. This consumes one activity on actual
  selection, not browsing. Back/reopen preserves the offer and RNG—no free reroll.

The upcoming rooms are visible BEFORE spending camp activities. Afterwards choose
one of two rooms: normal, or an elite of another role with HP×1.6/counter+4 for
two camp activities. The last gate is the single boss, not a fake branch. This is
a small seeded branching ladder, not an entire multi-act map/DAG or new shop.

Training, relics, HP and rage/weather/mace charges persist through the run.
Belt shield8, Komi's once-use flag and broken armor reset per fight. New runs
reset everything. No permanent progression, purchases or monetization.

## Implementation / invariants

Classic.evaluate supplies the verified original/fan artifact scoring. The run
applies its own training, exposure, armor, actual-enemy-HP scythe execution and
lifesteal calculation. Damage/charges/guard/heal commit once at the same original
release+travel clock; surviving enemy counters once. Menus freeze clocks.
Roll, loot and route RNG streams are separate and versioned55. Previews and
diagnostic planners consume no game RNG. Same seed replays v55, not v54 routes.

## Diagnostics and honest limits

226 unit tests passed:10 new tests cover guard priority, reroll cost, enemy
cycles/armor, mutually exclusive camps, training cap, cached offers, route stakes,
all-six gating, boss fallback, menu freeze, atomic four-slot replacement and reset.
The four original art/canon checks passed. Source files are untouched.

An early diagnostic showed unlimited relic accumulation dominated training.
Four slots plus explicit swaps and stronger training reduced that imbalance.
Across seeds1..16, the same sampled one-step policy produced:

| Policy variation | Wins /16 | Mean remaining HP (loss=0) |
|---|---:|---:|
| HP-aware, training/rest, takes eligible elites |14|18|
| Same choices, normal routes only |9|5.375|
| Damage-only turn valuation |13|15.25|
| Never rest |5|4.875|
| No training, relic replacements instead |11|14.125|

This establishes measurable decision effects, NOT equal strategy balance, global
optimality, player difficulty or fun. These are small deterministic samples, not
human playtests. The policy cannot see future dice or grant resources; its elite
selection is a simple HP/relic-count heuristic. Live player feedback is needed.

check-dice55-browser separately completes a button-driven legal seed52 six-room
resource run, checking every displayed damage. It distinguishes explicit
four-slot swap / mobile camp / elite fixtures from that run. It checks cached
reward cancellation, touch, 320/390/760/844 widths, 900px desktop attack reach,
help freeze and missing-art fallback. Screenshots of combat/camp/route/swap were
inspected. All classic and old platformer/bonk browser checks remain required.

Final browser run passed with8 attacks,12 rerolls,5 route choices and6 clears.
Full-slot replacement, cached cancellation and mobile elite choice are separate
explicit fixtures, not grants made during that run. Classic dice52/artifacts53/
effects54, original playback, nine platformer checks and bonk48/49/50 all passed
against their preserved entries with no runtime errors.
