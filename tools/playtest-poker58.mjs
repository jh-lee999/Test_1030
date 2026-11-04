// Diagnostic policy, NOT a human playtest or evidence that a game is fun.
// Reads visible cards/counts, never the hidden draw order; uses no game RNG.
import * as E from '../poker-engine.js';
export function settle(g){for(let n=0;g.phase==='resolve'&&n<120;n++)E.tick(g,1/30);}
export function discardPlan(g){
 const ranks={};for(const c of g.hand)ranks[c.rank]=(ranks[c.rank]||0)+1;
 const groups=Object.keys(ranks).map(Number).sort((a,b)=>ranks[b]-ranks[a]||b-a),plans=[];
 const add=keep=>{const ids=g.hand.filter(c=>!keep.includes(c.id)).map(c=>c.id).slice(0,5);if(ids.length&&!plans.some(p=>p.join(',')===ids.join(',')))plans.push(ids);};
 add(g.hand.filter(c=>ranks[c.rank]>=2).map(c=>c.id));add(g.hand.filter(c=>c.rank===groups[0]).map(c=>c.id));
 for(const suit of Object.keys(E.SUITS))if(g.hand.filter(c=>c.suit===suit).length>=3)add(g.hand.filter(c=>c.suit===suit).map(c=>c.id));
 for(let start=1;start<=10;start++){const keep=[],seen=new Set();for(const c of g.hand){const r=c.rank===14&&start===1?1:c.rank;if(r>=start&&r<start+5&&!seen.has(r)){seen.add(r);keep.push(c.id);}}if(keep.length>=4)add(keep);}
 // Sample unseen card DISTRIBUTION, not its shuffled order. Seed policy separately.
 const handIds=new Set(g.hand.map(c=>c.id)),discarded=new Set(g.discardPile),pool=g.deck.filter(c=>!handIds.has(c.id)&&!discarded.has(c.id));if(pool.length<5)return plans[0]||[];
 let state=0x12345678;const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 let best=null,bestValue=-1;for(const ids of plans){const remaining=g.hand.filter(c=>!ids.includes(c.id));let value=0;for(let n=0;n<12;n++){const indices=new Set();while(indices.size<ids.length)indices.add(Math.floor(rng()*pool.length));const hand=[...remaining,...[...indices].map(i=>pool[i])],preview={...g,hand,discards:g.discards-1},r=E.bestHand(preview);value+=Math.min(g.enemyHp,r?.damage||0);}value/=12;if(value>bestValue){bestValue=value;best=ids;}}
 const current=E.bestHand(g)?.damage||0;return bestValue>Math.min(current,g.enemyHp)*1.08?best:[];
}
export function shopPlan(g){
 const needed=4-g.relics.length,candidate=g.shop.relics.find(id=>['rubber','weather','candy','yellow','bell','pillow'].includes(id));
 if(candidate&&needed&&g.gold>=13)return {kind:'relic',id:candidate};
 if(g.hp<24&&E.canService(g,'rest'))return {kind:'rest'};
 const past=g.history,preferred=g.relics.includes('paint')?'flush':g.relics.includes('ladder')?'straight':'twoPair';
 if(E.canService(g,'train')&&g.training[preferred]<Math.ceil(g.depth/2)+1)return {kind:'train',id:preferred};
 if(g.gold>=10&&E.canService(g,'remove')){const c=[...g.deck].sort((a,b)=>a.rank-b.rank)[0];return {kind:'remove',id:c.id};}
 if(E.canService(g,'copy')&&g.gold>=12){const c=[...g.deck].sort((a,b)=>b.rank-a.rank)[0];return {kind:'copy',id:c.id};}
 return {kind:'travel'};
}
export function run(seed,starter='echo',mode='classic'){
 const g=E.createGame(seed,mode),log=[];E.chooseStarter(g,starter);for(let n=0;n<150&&!['won','dead'].includes(g.phase);n++){
  if(g.phase==='pick'){const r=E.bestHand(g);if(r&&r.damage>=g.enemyHp){E.attack(g);log.push({room:g.depth+1,hand:r.id,damage:r.damage});settle(g);continue;}const ids=g.discards?discardPlan(g):[];if(ids.length){for(const id of ids)E.toggleCard(g,id);E.discard(g);continue;}if(r){E.attack(g);log.push({room:g.depth+1,hand:r.id,damage:r.damage});settle(g);}else if(g.discards){for(const c of g.hand.slice(0,5))E.toggleCard(g,c.id);E.discard(g);}else E.pass(g);
  }else if(g.phase==='shop'){const p=shopPlan(g);if(p.kind==='relic')E.buyRelic(g,p.id);if(p.kind==='rest')E.rest(g);if(p.kind==='train')E.train(g,p.id);if(p.kind==='remove')E.editDeck(g,'remove',p.id);if(p.kind==='copy')E.editDeck(g,'copy',p.id);if(p.kind==='travel')E.travel(g);}
 }
 return {seed,starter,phase:g.phase,depth:g.depth+1,hp:g.hp,deck:g.deck.length,attacks:g.attacks,best:g.best,gold:g.gold,relics:g.relics,training:g.training,log};
}
if(typeof process!=='undefined'&&process.argv[1]?.endsWith('playtest-poker58.mjs')){const count=Number(process.argv[2]||12),runs=Array.from({length:count},(_,i)=>run('poker58-'+i,['echo','paint','ladder'][i%3]));console.log(JSON.stringify({warning:'Distribution-sampling diagnostic policy, not human play or fun validation',wins:runs.filter(r=>r.phase==='won').length,count,results:runs.map(({log,...r})=>r)},null,2));}
