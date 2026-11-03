# v51 · direct pointer correction

The user rejected v50 mouse movement as wobbling. The previous interpretation
of the feedback added angular lag to absolute pointer input. This correction
removes that lag, rather than tuning another spring or delayed follower.

setPointerAim() applies the clamped pointer coordinates to g.aim in the event
handler and synchronizes the controller's target and applied reference. Later
RAF updates have nothing left to follow. Preview, launcher and shot still share
the same actual g.aim. Mouse release fires immediately along its exact ray;
there is no mouse alignment wait. Touch coordinates are also immediate, but
touching the board still never fires without the separate Fire button.

Keyboard increments keep their v50 fine controls and bounded easing. Shift
mouse deltas retain20% gain but apply immediately, with no after-movement drift.
Moving the pointer overrides an unfinished keyboard target. An already committed
keyboard shot remains locked and can still be cancelled by pause/help/blur.
The combat engine, seeded boards, stats, RNG, renderer and source art are untouched.

Four new unit tests verify immediate reversal, unchanged aim/path after60 frames,
immediate exact-ray fire, override of an unfinished keyboard target and unchanged
resources/RNG. check-bonk50-browser.mjs retains its old filename but now checks
the CURRENT v51 pointer contract, using real mouse reversals and comparing input
event coordinates against actual aim in that same event. It samples25 RAF frames
to catch any remaining path drift and checks instant firing, fine keys/Shift and
touch. Pending keyboard cancellation uses an explicit synchronous key-event
fixture; real keyboard taps and holds are separately tested. These are mechanical
checks, not a claim that the user has approved the feel.
