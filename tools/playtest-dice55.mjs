// Legal-action diagnostic, not a human playtest or proof of fun.
import * as E from '../dice-run-engine.js';
export function settle(g){for(let n=0;n<400&&['rolling','resolve'].includes(g.phase);n++)E.tick(g,1/120);}
export function bestAttack(g,defensive=true){return Object.keys(E.PATTERNS).map(id=>E.evaluate(g,id)).filter(r=>r&&!r.blocked).sort((a,b)=>utility(g,b,defensive)-utility(g,a,defensive))[0];}
function utility(g,r,defensive){if(!r)return -1e9;const kill=r.damage>=g.enemyHp,loss=kill?0:E.counterPreview(g,r).loss;return Math.min(g.enemyHp,r.damage)+r.damage*.005+(defensive?(r.heal-loss)*(g.hp<20?12:7):0)+(r.breakArmor?18:0);}
export function bestMove(g,defensive=true,samples=20){
 const now=bestAttack(g,defensive);if(now?.damage>=g.enemyHp||!g.rerolls)return now?{type:'attack',id:now.id}:{type:'pass'};
 let seed=31991;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let best={score:utility(g,now,defensive)+2,move:now?{type:'attack',id:now.id}:{type:'pass'}};
 for(let mask=0;mask<31;mask++){let score=0;for(let n=0;n<samples;n++){const hypothetical={...g,rerolls:g.rerolls-1,dice:g.dice.map((v,i)=>mask&(1<<i)?v:1+Math.floor(rand()*6)),kept:g.dice.map((_,i)=>Boolean(mask&(1<<i)))};score+=utility(hypothetical,bestAttack(hypothetical,defensive),defensive)/samples;}if(score>best.score)best={score,move:{type:'roll',mask}};}
 return best.move;
}
export function relicChoice(g){const order=['echo','rubber','weather','yellow','pillow','bell','candy','lucky','rust','belt','komi','empty','scythe','mace'];return [...g.choices].sort((a,b)=>order.indexOf(a)-order.indexOf(b))[0];}
export function replacement(g){const order=['echo','rubber','weather','yellow','pillow','bell','candy','lucky','rust','belt','komi','empty','scythe','mace'];return [...g.relics].sort((a,b)=>order.indexOf(b)-order.indexOf(a))[0];}
export function campChoice(g,{rests=true,training=true}={}){if(rests&&g.hp<g.maxHp*.65)return {kind:'rest'};if(g.relics.length<2)return {kind:'relic'};if(training){const id=g.training.pair<2?'pair':g.training.kind<2?'kind':null;if(id)return {kind:'train',id};}return {kind:'relic'};}
export function play(seed,{defensive=true,rests=true,training=true,elite=true}={}){
 const g=E.createGame(seed),trace=[];
 for(let n=0;n<400&&!['won','dead'].includes(g.phase);n++){
  if(['draft','reward'].includes(g.phase)){E.chooseRelic(g,relicChoice(g),replacement(g));settle(g);}
  else if(g.phase==='camp'){if(g.campPoints){const choice=campChoice(g,{rests,training});if(!E.camp(g,choice.kind,choice.id))throw Error('bad camp');}else E.leaveCamp(g);}
  else if(g.phase==='route'){E.chooseRoute(g,elite&&g.hp>=30&&g.relics.length>=2&&g.routes.some(r=>r.id==='elite')?'elite':g.routes[0].id);settle(g);}
  else if(g.phase==='pick'){const move=bestMove(g,defensive);if(move.type==='roll'){for(let i=0;i<5;i++)if(g.held[i]!==Boolean(move.mask&(1<<i)))E.toggleHold(g,i);E.reroll(g);settle(g);}else if(move.type==='attack'){const r=E.evaluate(g,move.id);E.attack(g,move.id);settle(g);trace.push({depth:g.depth,hp:g.hp,pattern:move.id,damage:r.damage,guard:r.guard});}else{E.pass(g);settle(g);}}
  else settle(g);
 }
 return {seed,phase:g.phase,hp:g.hp,depth:g.depth+1,relics:g.relics,training:g.training,history:g.history,attacks:g.attacks,trace};
}
if(typeof process!=='undefined'&&import.meta.url===`file://${process.argv[1]}`)for(const seed of ['55','52','BUTTER','1','2','3','4','5']){const r=play(seed);console.log(JSON.stringify({...r,trace:undefined}));}
