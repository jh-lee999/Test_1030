# v49 · readable slingshot GUI

User requested better GUI. This update changes presentation, not the v48 loop,
engine, seed generation, source sprites, character scale/anchor or timing.

## What changed

- Cream HUD and cards, forest/gold table rails and consistent existing SVG icons.
- HP/XP bars, four-encounter route and a clear aim/flight/enemy/reward phase strip.
- Explicit fire label and king charge/prepared/spent states. Preparing is not firing.
- Larger enemy health/intent chips, selected-enemy ring and readable detail text.
  The threat estimate counts all surviving enemies' next shot/contact damage;
  killing them during the volley reduces it. It is not unavoidable damage.
- Live volley hit/damage score. Cards show numerical before/after effects and
  whether the choice contributes to or completes a fusion. Ingredient progress
  is capped at the actual recipe requirement.
- Mobile build notes start collapsed, controls stay near the board, long panels
  scroll, and help holds the exact prior phase. Reduced motion is respected.

`bonk-ui.js` derives labels only, with no state/RNG mutation. Normal input handlers
still call the same v48 engine actions. Help uses the existing pause mechanism;
opening it from an already paused or reward state does not resume combat.
The old `__bonk48` test API remains compatible. Engine module version stays48;
GUI/renderer URLs are49 to invalidate the previous cached page shell.

## Verification and limits

Unit tests compare intent against actual enemy damage, card values against fired
balls, fusion caps, and unchanged game state/RNG streams. GUI browser checks use
real controls to inspect targets, open/close help during flight and pause, queue
and fire a king, expand mobile notes and reach all six 400-XP choices at320px.
The king charge and 400-XP cases are explicitly isolated UI fixtures, not evidence
of earning them during play. The unchanged v48 browser check separately completes
a genuine resource run with its existing full-information diagnostic solver.

Screenshots inspected at1440×900 and390×844: title, aim, help, flight, rewards and
king. Width checks cover320/390/760/844. No external runtime assets were added.
Original art/cell bounds checks and archived side-scroller regressions also run.
This does not establish player approval, balance or fun. Four encounters, eight
upgrades and the reflection-only preview are still the v48 prototype limits.
