export * from './dungeon82-ui.js';
import {compactBuild as fullBuild} from './dungeon82-ui.js';
import {buildStats,WEAPON_NAMES} from './dungeon82-build.js';
export function compactBuild(g){
 if(g.rooms[g.room].cleared)return fullBuild(g);const s=buildStats(g);
 return WEAPON_NAMES[g.weapon]+' · '+s.damage+' 피해 · '+s.rate.toFixed(1)+'/초'+(s.traits.length?' · '+s.traits.slice(0,2).join(' · ')+(s.traits.length>2?' 외 '+(s.traits.length-2):''):'');
}
