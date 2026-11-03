# v50 · aiming control feel

**Superseded for pointer input by v51:** the user rejected the trailing mouse
motion as wobbling. Pointer tracking and mouse firing are now immediate; easing
and buffered alignment described below remain keyboard-only. See pointer51.md.

The user reported overly fast angle changes. Previously every pointer event
assigned g.aim immediately; each arrow press also shifted the target by45 world
pixels. This patch changes input handling only, not the v48 combat engine,
trajectory physics, generated boards, RNG, progression, source art or renderer.

## Behavior

- Pointer events set a target. RAF eases the actual angle with a270 degree/s
  ceiling and an18/s near-target response. The rate-bounded exponential is
  integrated analytically, so constant-target motion matches at30/60/144Hz.
  There is no overshoot or accumulation of raw pointer events.
- Every displayed preview and procedural launcher uses the actual g.aim used by
  fire(). There is no independent visual angle drifting from the physics ray.
- A click/Space/Fire request locks its intended target, finishes alignment and
  fires once. The final target point is exact, not an approximation left over
  from easing. The near-target snap tolerance is .06 degrees. Typical settled
  shots remain immediate; a large abrupt change needs a short alignment period.
  Pending state is labeled and duplicate fire/king toggles are blocked.
- Arrow tap .45 degrees; Shift tap .1. Holding after .18s turns18 degrees/s or4
  with Shift. Shift mouse deltas use20% gain, with no absolute-position jump.
- Touch moves the aim only. Fire still requires its own button. Cancellation,
  pause/help, blur/hidden tab and restart discard the buffered shot and held keys.
  Returning from pause never fires an old request. A new turn resynchronizes at
  its actual returned-ball launcher position.
- Functional input easing also applies with reduced motion; no new decorative
  animation, screen shake, art transforms or external assets are introduced.

`bonk-aim.js` is a separate input controller. `bonk-ui.js` remains read-only.
Direct engine aimAt() calls from diagnostics invalidate the old input target,
preserving the existing __bonk48 test API and pure solver.

## Verification

Seven unit tests cover bounded monotonic rotation, frame-rate invariance, legal
points at both launch edges, exact preview/shot ray, cancellation, fine steps and
unchanged state/RNG outside aim. The new browser check samples live RAF rotation,
uses real mouse/keyboard/touch, checks held-key rates and Shift mouse gain, moves
the pointer after a quick click to verify target locking, and interrupts pending
shots with pause/help/blur. Its100-charge king case is an isolated UI fixture.
Screenshot checkpoints cover moving/settled aim, a locked click and phone input.
The v48/v49 browser checks now await the real fired phase rather than assuming
that a newly requested quick shot is synchronous. Their gameplay assertions stay.

Run npm test, existing sprite/source checks, all archived required browser checks,
and tools/check-bonk48-browser.mjs, check-bonk49-browser.mjs and
check-bonk50-browser.mjs. Passing checks verify mechanics, not user approval of
feel, overall balance or fun. The broader gameplay recommendations from the
previous analysis have NOT been implemented by this input patch.
