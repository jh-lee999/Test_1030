# v46: a decision loop, not more disconnected counters

The reported problem was not a missing shop button: holding forward attack felt
like the entire game. This revision connects a run's combat input, earned skill,
route risk and rewards. Butter's original images/poses, physics and world45
generation are unchanged. Existing stacked inventory, markets and three acts stay.

## Choices and consequences

| Locked path | Basic action | E skill | Cost |
| --- | --- | --- | --- |
| Ricochet | every third released basic guarantees a low shot, plus normal proc/pity | 3 large bouncing homing shots | basic damage x.85; isolated enemies cannot chain |
| Barrage | interval x.62; +18 heat/release; heat60+ gives damage x1.35/focus +2 | 8 large piercing fan shots and heat reset | damage x.72; overheat locks fire until heat <=30 |
| Boulder | hold up to .9s, release to fire; full charge breaks guard and adds pierce | original rolling boulder, damage x1.3/radius x1.2 | damage x.9; range x.8; holding forever never fires |

Charged damage = original shot damage * (1 + normalized charge * 2.4).
Charging preserves low-grade probability, pity, level-scaled bounce and counters.
Normal item accumulation and inscriptions rebuild from inventory, then apply the
chosen path and awakening exactly once. Style tags weight random items x1.5;
ordinary ricochet/heavy rewards guarantee lower/upper books respectively. They do
NOT remove other builds' items or lock a run out of completing a set.

Focus starts at25, caps100, and survives room changes: primary hits +4 (charged
+4..12; hot barrage +6), kills +5, a real perfect dodge +14, a clean room +12. Hits are throttled
per target to once/.25s. Skills/echo shards don't generate hit focus; kills still
pay. No idle refilling. E costs ceil(60*(1-CDR*.5)), or45 base with overload.
The existing 1.1s casting immunity remains; casting interval is1.8*(1-CDR).
Cooling after .18s without a shot is35/s held or85/s released. Menus freeze time.

The first cleared elite or boss replaces its item reward with one awakening:

- Echo: primary hit sends two .3-damage homing shards toward other enemies within
  240px. Max HP x.85. Shards cannot recursively split or farm focus.
- Predator: close (<190px) PRIMARY hit heals3, at most once/.6s. Range x.75.
  Rolling boulders and skill/echo hits cannot automate this healing.
- Overload: damage x1.25 and E base cost45; incoming damage x1.3.

No reroll, cash alternative, replacement, permanent unlock or meta-stat growth.
Map captions advertise the awakening route; the first boss is a fallback if the
player skips elites. Later elite/boss rewards are ordinary items. After death or
victory, return to the path picker to try a different build on the same seed.

## Iteration evidence and limits

1. Initial comparison found charged hits earned the same4 focus as weak rapid
   hits, deliberate venting barely helped, and charging accidentally bypassed low
   procs. Adjusted hit reward by charge, made released cooling85/s, restored proc/
   pity/counter. These are actual combat changes, not only displayed stats.
2. Rechecking found rolling boulders could automate Predator healing and the old
   clean-clear cooldown reward meant little for focus-based skills. Restricted
   healing to primary hits and connected clean play to +12 focus. Corrected skill
   stat rows and charging instructions to match the chosen path.
3. Barrage still paid an overheating penalty without an interesting upside.
   Added the60+ hot window: visible orange shots, damage x1.35 and6 focus/hit.
   Players can ride that window, vent early or spend E to reset and burst again.

`tools/playtest-paths46.mjs` advances real generated games using legal movement,
jump, attack, dodge and skill inputs, plus normal reward/route/shop functions.
It never grants HP, kills, items, coordinates or coins. The pilot reads complete
room state and jump witnesses, is clumsy under pressure, and is NOT a human or a
difficulty benchmark. Its reported-seed/46 comparisons check that idle held-fire
doesn't finish the opening room, resources can be earned, and complete campaigns
remain possible without stat cheats. Do not optimize the game just for this bot.

The browser check also uses actual keyboard and CDP touch input, captures original
generated encounters and 18s input-only playbacks for all three paths, and checks
the awakening interface separately with an explicitly marked UI fixture. Original
art/pose bounds and old 21-room campaign checks remain required. Passing tests
does not establish subjective fun. The design judgment is narrower: charging,
venting and ricochet now demand different actions and give a concrete reason to
risk an elite and pick compatible rewards. Enemy/boss depth and long-term content
are still prototype limitations; this is not claimed to equal Skul's variety.
