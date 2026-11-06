import {emptyProgress as baseProgress,unlocked as oldUnlocked,startSelection as oldSelection,mergeProgress as oldMerge} from './dungeon76-progress.js';
import {UNLOCKS} from './dungeon80-content.js';
export const emptyProgress=()=>({...baseProgress(),routes:[],styles:[],puzzles:0,escapes:0});
export function unlocked(p=emptyProgress()){const ids=oldUnlocked(p);if(p.bosses.length>=2)ids.push('stormLessons');if((p.routes||[]).filter(r=>r!=='root').length>=2)ids.push('branchLessons');if(p.puzzles>0)ids.push('puzzleMaster');if(p.escapes>0)ids.push('eclipseRoute');return ids;}
export function startSelection(p,options={}){const open=unlocked(p),selection=oldSelection(p,options);return {...selection,route:options.route==='eclipse'&&open.includes('eclipseRoute')?'eclipse':selection.route,loadout:'random',unlocks:open};}
export function mergeProgress(p,g){return {...oldMerge(p,g),routes:[...new Set([...(p.routes||[]),...(g.regionPath||[])])],styles:[...new Set([...(p.styles||[]),...g.rooms.map(r=>r.style)])],puzzles:Math.max(p.puzzles||0,g.puzzlesCompleted||0),escapes:Math.max(p.escapes||0,g.phase==='won'?(g.previousEscapes||0)+1:0)};}
export const unlockView=p=>Object.entries(UNLOCKS).filter(([id])=>!['chargedStart','fanStart','prismStart'].includes(id)).map(([id,d])=>({id,...d,open:unlocked(p).includes(id)}));
