import {HEROES,LOADOUTS,UNLOCKS} from './dungeon76-content.js';
export const emptyProgress=()=>({bestClears:0,bestKills:0,bestFloor:0,bosses:[],trial:false,secret:false,bargain:false});
export function unlocked(p=emptyProgress()){
 const out=[];
 if(p.bestClears>=3)out.push('chargedStart');
 if(p.bestKills>=20)out.push('fanStart');
 if(p.bosses.includes('velvet'))out.push('velvetHero','prism');
 if(p.bosses.includes('erpin'))out.push('prismStart','wildRoute');
 if(p.trial)out.push('ward');if(p.secret)out.push('scope');if(p.bargain)out.push('greed');
 return out;
}
export function mergeProgress(p,g){
 const a=g.achievements||emptyProgress();
 return {bestClears:Math.max(p.bestClears,g.clears),bestKills:Math.max(p.bestKills,g.kills),bestFloor:Math.max(p.bestFloor,g.floorIndex+1),bosses:[...new Set([...p.bosses,...a.bosses])],trial:p.trial||a.trial,secret:p.secret||a.secret,bargain:p.bargain||a.bargain};
}
export function startSelection(progress,selection={}){
 const open=unlocked(progress),hero=HEROES[selection.hero]&&(!HEROES[selection.hero].unlock||open.includes(HEROES[selection.hero].unlock))?selection.hero:'butter',loadout=LOADOUTS[selection.loadout]&&(!LOADOUTS[selection.loadout].unlock||open.includes(LOADOUTS[selection.loadout].unlock))?selection.loadout:'random';
 return {hero,loadout,route:selection.route==='wild'&&open.includes('wildRoute')?'wild':'normal',unlocks:open};
}
export function unlockView(progress){const open=unlocked(progress);return Object.entries(UNLOCKS).map(([id,d])=>({id,...d,open:open.includes(id)}));}
