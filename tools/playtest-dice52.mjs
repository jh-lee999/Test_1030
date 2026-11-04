// Offline legal-action balance diagnostic. Not a human test or proof of fun.
import {createGame,evaluate,PATTERNS,toggleHold,reroll,attack,chooseRelic,tick,pass} from '../dice-engine.js';
export function settle(g){for(let i=0;i<300&&['rolling','resolve'].includes(g.phase);i++)tick(g,1/120);}
export function bestAttack(g){return Object.keys(PATTERNS).map(id=>evaluate(g,id)).filter(r=>r&&!r.blocked).sort((a,b)=>b.damage-a.damage)[0];}
export function bestMove(g,samples=20){
 const now=bestAttack(g);if(now?.damage>=g.enemyHp||g.rerolls===0)return now?{type:'attack',id:now.id}:{type:'pass'};
 let seed=12345;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const utility=r=>r?Math.min(g.enemyHp,r.damage)+r.damage*.02:0;
 let best={score:utility(now)*1.04,move:now?{type:'attack',id:now.id}:{type:'pass'}};
 for(let mask=0;mask<31;mask++){
  let score=0;
  for(let n=0;n<samples;n++){
   const s={...g,rerolls:g.rerolls-1,dice:g.dice.map((v,i)=>mask&(1<<i)?v:1+Math.floor(rand()*6)),kept:g.dice.map((_,i)=>Boolean(mask&(1<<i)))};
   score+=utility(bestAttack(s))/samples;
  }
  if(score>best.score)best={score,move:{type:'roll',mask}};
 }
 return best.move;
}
export function relicChoice(g,style='echo'){
 const order=style==='pillow'?['pillow','echo','rubber','empty','candy','bell']:style==='early'?['bell','rubber','echo','candy','pillow','empty']:['echo','rubber','candy','pillow','empty','bell'];
 order.splice(2,0,'weather','yellow','scythe','rust');order.push('belt','lucky','komi','mace');
 return [...g.choices].sort((a,b)=>(order.includes(a)?order.indexOf(a):999)-(order.includes(b)?order.indexOf(b):999))[0];
}
export function play(seed,{style='echo',plan=true}={}){
 const g=createGame(seed),trace=[];
 for(let i=0;i<180&&!['won','dead'].includes(g.phase);i++){
  if(['draft','reward'].includes(g.phase)){chooseRelic(g,relicChoice(g,style));settle(g);}
  else if(g.phase==='pick'){
   const move=plan?bestMove(g):bestAttack(g)?{type:'attack',id:bestAttack(g).id}:g.rerolls?{type:'roll',mask:0}:{type:'pass'};
   if(move.type==='roll'){for(let i=0;i<5;i++)if(g.held[i]!==Boolean(move.mask&(1<<i)))toggleHold(g,i);reroll(g);settle(g);}
   else if(move.type==='attack'){const result=evaluate(g,move.id);attack(g,move.id);settle(g);trace.push({stage:g.stage+1,turn:g.turn,hp:g.hp,damage:result.damage,pattern:move.id,relics:[...g.relics]});}
   else{if(!pass(g))throw Error('unavailable pass');settle(g);}
  }else settle(g);
 }
 return {seed,phase:g.phase,stage:g.stage+1,hp:g.hp,attacks:g.attacks,best:g.best,relics:g.relics,trace};
}
if(typeof process!=='undefined'&&import.meta.url===`file://${process.argv[1]}`){for(const plan of [false,true])for(const seed of ['52','BUTTER','1','2','3','4'])console.log(JSON.stringify(play(seed,{plan})));}
