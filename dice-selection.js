// Read-only UI policy. Maximum actual legal damage, then guard on exact ties.
export function strongestPattern(results){
 return results.filter(r=>r&&!r.blocked&&Number.isFinite(r.damage)).reduce((best,r)=>!best||r.damage>best.damage||r.damage===best.damage&&(r.guard||0)>(best.guard||0)?r:best,null);
}
export function attackSelectionKey(game,results){
 // Holding alone, animation clocks and menus must not erase an explicit choice.
 // A new roll, edit, turn, enemy or changed scoring rules must recalculate it.
 return JSON.stringify([game.rollSerial,game.depth,game.turn,game.dice,game.kept,game.rerolls,results.map(r=>r?[r.id,r.damage,r.guard,r.blocked]:null)]);
}
