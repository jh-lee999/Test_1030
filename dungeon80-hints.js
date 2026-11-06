import {drawCastHints as baseDraw,castHint as baseHint,drawGroundThreat,enemyFacing} from './dungeon78-hints.js';
import {patternOf} from './dungeon80-bosses.js';
import {patternOf as oldPattern} from './dungeon76-bosses.js';
export {drawGroundThreat,enemyFacing};
function presentation(e){const alias={whirlCharge:'charge',cascade:'runes',veil:'runes'}[e.pattern];if(!alias)return e;const p=patternOf(e),out={...e,pattern:alias};if(e.action){const duration=oldPattern(out)?.tell||1;out.action={...e.action,time:duration*Math.min(1,e.action.time/(p?.tell||1))};}if(e.state==='attack'&&e.pattern==='cascade')out.targets=e.targets.slice(0,e.volley||0);if(e.state==='attack'&&e.pattern==='veil')out.targets=[];return out;}
export const castHint=(g,e)=>baseHint(g,presentation(e));
export function drawCastHints(c,g,e,options){baseDraw(c,g,presentation(e),options);if(e.state==='tell'&&e.blinkSpot)drawGroundThreat(c,{...e.blinkSpot,age:e.attackClock||0,triggered:false});if(e.state==='tell'&&e.ai==='burrow')drawGroundThreat(c,{x:e.aimX,y:e.aimY,age:e.attackClock||0,triggered:false});}
