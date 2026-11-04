// Decision diagnostic using public hand information, not future RNG or grants.
import * as E from '../dice-run-engine.js';
import * as Base from './playtest-dice55.mjs';
export const {settle,relicChoice,replacement,campChoice}=Base;
function utility(g,r){if(!r||r.blocked)return -1e9;const loss=r.damage>=g.enemyHp?0:E.counterPreview(g,r).loss;return Math.min(g.enemyHp,r.damage)+r.damage*.005+(r.heal-loss)*(g.hp<20?12:7)+(r.breakArmor?18:0);}
export function bestMove(g,useEdits=true){
 const now=Base.bestAttack(g);if(now?.damage>=g.enemyHp)return {type:'attack',id:now.id};
 if(useEdits){const options=E.nudgeSuggestions(g).map(s=>{const next=structuredClone(g);E.nudgeDie(next,s.index,s.delta);const r=E.evaluate(next,s.id);return {...s,score:utility(next,r),lethal:r.damage>=g.enemyHp};}).sort((a,b)=>b.score-a.score);
  const edit=options[0];if(edit&&(edit.lethal||edit.score>utility(g,now)+30))return {type:'edit',index:edit.index,delta:edit.delta,id:edit.id};}
 return Base.bestMove(g);
}
export function play(seed,{edits=true,elite=true}={}){
 const g=E.createGame(seed),trace=[];let rolls=0;
 for(let n=0;n<500&&!['won','dead'].includes(g.phase);n++){
  if(['draft','reward'].includes(g.phase))E.chooseRelic(g,relicChoice(g),replacement(g));
  else if(g.phase==='camp'){if(g.campPoints){const c=campChoice(g);E.camp(g,c.kind,c.id);}else E.travelFromCamp(g,elite&&g.hp>=30&&g.relics.length>=2&&g.routes.some(r=>r.id==='elite')?'elite':g.routes[0].id);}
  else if(g.phase==='pick'){const move=bestMove(g,edits);if(move.type==='edit'){E.nudgeDie(g,move.index,move.delta);trace.push({depth:g.depth,edit:move.index,delta:move.delta,pattern:move.id});}else if(move.type==='roll'){for(let i=0;i<5;i++)if(g.held[i]!==Boolean(move.mask&(1<<i)))E.toggleHold(g,i);E.reroll(g);rolls++;}else if(move.type==='attack'){const r=E.evaluate(g,move.id);E.attack(g,move.id);trace.push({depth:g.depth,pattern:move.id,damage:r.damage,guard:r.guard});}else E.pass(g);}
  settle(g);
 }
 return {seed,phase:g.phase,hp:g.hp,depth:g.depth+1,attacks:g.attacks,edits:g.nudgesUsed,rolls,history:g.history,relics:g.relics,training:g.training,trace};
}
if(typeof process!=='undefined'&&import.meta.url===`file://${process.argv[1]}`)for(const seed of ['56','55','52','1','2','3','4']){const g=play(seed);console.log(JSON.stringify({...g,trace:undefined}));}
