# v47: fight together, commit to attacks

The user rejected v46's claimed improvement. Adding path selection had not fixed
the underlying combat. In the reported barrage seed1793686699326, the v46 engine
could hold J for20 seconds, kill2 enemies and remain at90 HP. The first room was
2428px wide with9 platforms. Most enemies were tied to disconnected home ledges.
This is a reproducible structural symptom, NOT a quantitative measure of fun.

## Scope

- WORLD_VERSION47 regenerates combat/elite rooms as1450..1940px arenas. One
  connected floor allows ordinary melee pursuit and retreat without fall/reset
  interruptions. Four randomized ledge arrangements create optional high ground
  and reachable support positions. The reported seed is1539px wide with4 platforms.
- Four main-roster enemies share the floor; support casters/archers use raised
  ledges. Elite rooms add support and a rusher. At least3 enemy roles remain.
  Initial enemies keep340px spawn clearance; first-room drones start >780px away.
- Initial enemy cooldowns are1.2s plus a small stagger; room title duration is1.4s.
  Health, basic enemy damage, player physics and original source art are unchanged.
- Treasure/rest/shop geometry, bosses,21-depth branching graph, inventory growth,
  contracts and the v46 paths/focus/awakening rules are retained.

## Read -> avoid -> punish

`platformer-threats.js` shares windup definitions and attack reservations between
behavior and procedural tells. In arenas, new attacks begin on screen, at least
.28s apart, with at most2 simultaneous windups. Already-promised attacks are not
cancelled when the player leaves the view. This is a readability constraint, not
an invisible damage reduction or immunity mechanic.

Ordinary melee facing and archer aim lock at the beginning of a tell. Archers
show their actual fixed firing line. Fan/guard hitboxes hit only the committed
front: crossing behind during the warning genuinely avoids the hit. Rusher
direction is locked before launch, stops on landing and exposes a recovery.
Drone retains finite detection, grounded flight lane and locked aim/muzzle.

Fan/guard/archer release and drone/rusher recovery open a short green-labelled
window. Primary shots deal150% damage in it; skill shots/boulders don't. An exposed
guard cannot retain its idle frontal block. No new resource bar, skill button,
menu or permanent progression was added.

## Verification and limits

- Unit regressions check deterministic arenas, safe spawns,4 shared-floor enemies,
  mixed types, committed ballistic aim, true behind-melee avoidance, attack-slot
  limits, menu freezing and non-permanent primary-only punish damage.
- Existing1000-world coverage still checks every platform, enemy, shrine, loot
  and exit, with live jump witnesses at unchanged physics. The old platform-count
  diversity metric was updated from >8 to >=6: arenas deliberately replace long
  obstacle strings. New tests separately require all4 arrangements and a traversable
  full-width floor. Reachability and fallbacks were not relaxed.
- `check-platformer-encounters47-browser.mjs` captures actual keyboard fighting on
  the reported seed without health/position/item/enemy edits. A separately marked
  fixture verifies the guard's committed direction and visible opening. Death or
  HP loss is not interpreted as proof that combat is fun.
- All earlier original-art, build, campaign, market, chain, enemy, drone, path and
  browser checks remain required. Source images were neither edited nor regenerated.

This revision removes a concrete cause of passive shooting and makes evasion
reliable. It does not claim aesthetic approval, human playtesting, a finished
combat balance, or Skul-equivalent depth. Boss move sets and longer-term variety
remain limited. The user's judgment of actual play takes precedence over the
automated checks and the previous optimistic assessment.
