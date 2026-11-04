# Strongest combination by default · v57

User reported having a completed strong hand but still throwing the weaker
previous selection. The UI only replaced an INVALID selection, so free throw
could remain selected alongside a stronger triple/straight.

The new read-only UI policy defaults to the greatest actual legal evaluate()
damage. All relics, training, exposure, armor, execution and the boss ban are
included. Equal damage prefers more guard, then stable pattern order. Initial
rolls, rerolls, edits and changed scoring reselect the best, even when the old
selection remains valid. Preview, highlight and the committed attack agree.

Players can still deliberately choose defense; that explicit choice persists
only until the hand/scoring changes. Hold-only clicks, idle frames and menus
do not erase it. Resolution/paused resolution keep the committed result. The
attack handler synchronizes before committing, closing an input/RAF race.
No automatic firing, consumed reroll, RNG, HP, scoring or artwork change.

Four unit tests cover ordering/legality/ties, context signatures and read-only
real-engine selection. Browser checks use actual buttons: initial bell pair96,
manual free override, edit-created four-kind300, rerolls, boss-banned jackpot,
pass fallback, no auto-fire and touch. Existing active/classic checks remain.
