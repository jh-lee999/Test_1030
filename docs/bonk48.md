# Butter's slingshot pinball · v48 prototype

The user approved trying the proposed genre change. The active root is now a
small turn-based aiming game, not another side-scroller difficulty patch. The
entire previous index is preserved verbatim as side-scroll47.html; no prior
game engine, original sprite file, source atlas or archive feature was deleted.

## Loop and scope

Aim freely with mouse or touch. Click/Space (touch: a separate Fire button)
commits one volley of3 stones. Walls, round bumpers and enemies reflect stones.
The first stone's reflection-only preview shows3 contacts, not split/homing
children. Enemy actions happen once after all stones finish; no aim-time HP loss.
Flights cap at6 seconds and may be recalled after .6s, still paying the enemy turn.
The first returned stone sets the next launch X. This was added after comparing
fixed-origin repeated shots that could miss the same side for many turns.

Three seeded encounters use fan/archer/guard roles, followed by an original-art
blanket ghost boss. Fans advance76/turn; archers advance35 and shoot every second
turn; guards advance52 and halve non-routed ordinary damage on odd turns. Banked,
low and giant shots bypass the guard's basic block. Reaching the danger line also
causes direct HP damage. The ghost advances28, fires and summons two fans on even
turns, with a bounded living enemy roster. The prototype is deliberately short.

## Progression

Kills award XP. Needed XP starts30 and increases12 per level; surplus is carried
through a while loop and EVERY pending level gets its own choice. Choices resolve
after a volley, before enemy actions. Clearing a normal encounter guarantees at
least one choice if no level choice was earned. The final boss goes to victory
without useless post-victory level menus. Fresh runs reset all upgrades.

Eight upgrades, each max3: split (third collision creates non-recursive shards),
mark (second hit explodes, including lethal marked hits), lower (extra finite
homing hops), upper (giant damage/radius and hit-charge), pouch (extra volley
stones), rubber (wall/bumper damage ramp), bomb (kill explosions), snack (HP and
post-encounter healing). The sidebar exposes these two goals in advance:

- Split2 + mark2 -> Star Candy Fireworks: shards also apply marks; blast radius+30.
- Lower2 + upper2 -> Meteor Boulder: giant hits emit two tracking star shards.

Kill flags are set before recursive explosions, preventing duplicate XP. Children
never split recursively; live balls cap64 and contact fuses are finite. Low
homing clears its target on every hit and spends finite hops, so A-B-A works but
an exhausted shot cannot stay magnetized to its last victim indefinitely.

King charge is earned from real hits, not time. Toggle with E at100 and commit
with the normal shot. Charge is spent on firing. The king ignores bumpers and
pierces enemy bodies; walls still reflect it. Base damage27/radius27; each upper
copy adds9 damage/6 radius. This is a fan-game adaptation, not original game code.

## Art and implementation

The original whole-pose Butter idle/shoot/high and monster clips are reused;
no source art was regenerated or edited. Only one source view exists. The table's
procedural slingshot displays actual aim, rather than pretending the character
has new up/back-facing poses. A single78px scale and (150,875) anchor fits the
FULL source cells of all3 Butter clips inside800x960. Release delays use the
original shared butterReleasePoint values. Atlas origins are never auto-fitted.

Engine is DOM-free, board and loot RNG streams are separate, physics uses at
most1/240s substeps. VFX jitter consumes no board RNG. Preview is read-only.
Missing art has explicit basic display fallback and cannot permanently disable
Start. Pause/blur freezes physics and enemy/volley clocks. Keyboard controls
regain canvas focus after utility buttons. No external runtime requests.

## Evaluation, not a claim of fun

`playtest-bonk48.mjs` is a full-information aiming solver that tries candidate
shots against copies, then uses legal fire/reward/next actions. It never grants
HP, stats or kills. It shows completion and attainable fusion, not human skill,
balance or fun. The browser check uses actual mouse, Space, E and touch controls,
accelerates remaining physics through normal ticks, takes live flight/reward/
giant screenshots, and finishes the genuine resource run. It also checks replay,
pause, phone widths and missing-image fallback.

Limits: four encounters,8 upgrades, no shop/map/multiplayer/permanent unlocks,
reflection-only preview, no rotating full-character aim rig. This is the small
core-loop trial the user requested. Difficulty and whether repeated aiming is
enjoyable need actual player feedback before adding a larger campaign.
