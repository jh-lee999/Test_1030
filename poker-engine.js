// v59: finite cards and ordered relic passes. Previews never consume RNG.
import {butterReleasePoint} from './butter-original-motion.js';
import {RELICS as OLD_RELICS,seedNumber} from './dice-engine.js';

export const SUITS={hearts:{symbol:'♥',name:'하트',color:'#b75466'},diamonds:{symbol:'♦',name:'다이아',color:'#ba7449'},clubs:{symbol:'♣',name:'클로버',color:'#3e8173'},spades:{symbol:'♠',name:'스페이드',color:'#58547c'}};
export const rankLabel=r=>({11:'J',12:'Q',13:'K',14:'A'}[r]||String(r));
export const cardName=c=>SUITS[c.suit].symbol+rankLabel(c.rank);
export const PATTERNS={
 high:{name:'하이 카드',hint:'가장 높은 카드 1장',chips:5,mult:1,growth:[10,1]},
 pair:{name:'원페어',hint:'같은 숫자 2장',chips:10,mult:2,growth:[15,1]},
 twoPair:{name:'투페어',hint:'서로 다른 짝 2개',chips:20,mult:2,growth:[20,1]},
 three:{name:'트리플',hint:'같은 숫자 3장',chips:30,mult:3,growth:[20,2]},
 straight:{name:'스트레이트',hint:'연속 숫자 5장 · A는 양 끝만',chips:30,mult:4,growth:[30,3]},
 flush:{name:'플러시',hint:'같은 무늬 5장',chips:35,mult:4,growth:[15,2]},
 fullHouse:{name:'풀하우스',hint:'같은 숫자 3장 + 다른 짝 2장',chips:40,mult:4,growth:[25,2]},
 four:{name:'포카드',hint:'같은 숫자 4장',chips:60,mult:7,growth:[30,3]},
 straightFlush:{name:'스트레이트 플러시',hint:'같은 무늬의 연속 숫자 5장',chips:100,mult:8,growth:[40,4]},
 royal:{name:'로열 스트레이트 플러시',hint:'같은 무늬 10 · J · Q · K · A',chips:120,mult:10,growth:[40,4]},
 five:{name:'파이브 카드',hint:'복제로 같은 숫자 5장',chips:120,mult:12,growth:[35,3],secret:true},
 flushHouse:{name:'플러시 하우스',hint:'같은 무늬의 풀하우스 · 복제 필요',chips:140,mult:14,growth:[40,4],secret:true},
 flushFive:{name:'플러시 파이브',hint:'같은 무늬·숫자 5장 · 복제 필요',chips:160,mult:16,growth:[50,4],secret:true}
};
const DESCRIPTIONS={
 echo:'득점 카드에 같은 숫자가 2장 이상이면 그 카드들을 한 번 더 발동. 번개·별사탕도 재발동.',
 candy:'득점한 A 또는 그림 카드(J/Q/K)가 발동할 때마다 칩 +8.',
 pillow:'이 유물 위치에서 하트 총 발동 1회당 배수 +0.5. 리본 재발동 포함. 곱배수 앞에 두면 함께 증폭돼요.',
 empty:'버리기를 모두 소모했다면 이 유물 위치에서 배수 +3. 뒤에 놓인 곱배수로 증폭 가능.',
 rubber:'이 유물 위치에서 현재 배수 ×1.5. 뒤에 오는 +배수까지 미리 곱하지 않아요.',
 bell:'이번 전투에 남긴 버리기 1회마다 칩 +10.',
 yellow:'트리플 이상 족보 배수 ×1.35. 실제 HP 피해로 분노 3을 모으면 추가 ×2 후 소모.',
 komi:'반격 후 살아 있고 HP가 30% 이하면 8 회복. 전투마다 한 번.',
 weather:'득점 카드 3회 발동마다 번개 칩 +18. 충전은 다음 공격·전투로 유지.',
 belt:'매 전투 시작 시 보호막 8. 실제 HP 피해만 분노·메이스를 충전.',
 scythe:'하이 카드·원페어·투페어 뒤 일반 적 HP가 18% 이하면 처형. 보스 제외.',
 lucky:'하이 카드·원페어·투페어의 실제 피해 5% 흡혈. 공격당 최대 4, 초과 피해 제외.',
 rust:'공격 결정 시 HP가 최대치보다 낮으면 배수 ×1.2.',
 mace:'실제 HP 피해 3회 후 작은 족보 공격 배수 ×1.5, 반격 취소. 적중 시 충전 소모.'
};
export const RELICS=Object.fromEntries(Object.entries(OLD_RELICS).map(([id,r])=>[id,{...r,text:DESCRIPTIONS[id]}]));
Object.assign(RELICS,{
 paint:{name:'한 가지 색의 꿈',color:'#d99fae',icon:'pillow',tag:'플러시 빌드',text:'플러시 계열이면 이 유물 위치에서 배수 ×1.8. 앞의 +배수도 함께 증폭.'},
 ladder:{name:'이어 붙인 사다리',color:'#9fbeb0',icon:'book-low',tag:'스트레이트 빌드',text:'스트레이트 계열이면 이 유물 위치에서 배수 ×2. 앞의 +배수도 함께 증폭.'}
});
export const RELIC_STAGES={echo:'card',candy:'card',weather:'card',pillow:'relic',empty:'relic',rubber:'relic',bell:'relic',yellow:'relic',rust:'relic',mace:'relic',paint:'relic',ladder:'relic',belt:'passive',komi:'passive',scythe:'impact',lucky:'impact'};
export const RUN_LENGTH=6,MAX_RELICS=4,MIN_DECK=20;
const small=id=>['high','pair','twoPair'].includes(id),flushes=id=>['flush','straightFlush','royal','flushHouse','flushFive'].includes(id),straights=id=>['straight','straightFlush','royal'].includes(id);
const score=(c,m)=>Math.floor(Number((c*m).toFixed(8)));
function random(g,key){g[key]=(g[key]+0x6d2b79f5)>>>0;let t=g[key];t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
function shuffle(g,ids){const out=[...ids];for(let i=out.length-1;i>0;i--){const j=Math.floor(random(g,'drawState')*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function classify(cards){
 if(!Array.isArray(cards)||!cards.length||cards.length>5||cards.some(c=>!c||!SUITS[c.suit]||!Number.isInteger(c.rank)||c.rank<2||c.rank>14))return null;
 const n=cards.length,counts={};for(const c of cards)counts[c.rank]=(counts[c.rank]||0)+1;
 const groups=Object.values(counts).sort((a,b)=>b-a),ranks=Object.keys(counts).map(Number).sort((a,b)=>a-b),flush=n===5&&cards.every(c=>c.suit===cards[0].suit),straight=n===5&&ranks.length===5&&(ranks[4]-ranks[0]===4||ranks.join(',')==='2,3,4,5,14');
 if(n===5&&groups[0]===5)return flush?'flushFive':'five';
 if(n===5&&groups[0]===3&&groups[1]===2)return flush?'flushHouse':'fullHouse';
 if(straight&&flush)return ranks[0]===10?'royal':'straightFlush';
 if(n===4&&groups[0]===4)return 'four';
 if(flush)return 'flush';if(straight)return 'straight';
 if(n===3&&groups[0]===3)return 'three';
 if(n===4&&groups[0]===2&&groups[1]===2)return 'twoPair';
 if(n===2&&groups[0]===2)return 'pair';
 return n===1?'high':null;
}
export function enemyIntent(g){
 const role=g.foe.enemy,n=(g.turn-1)%3,cycle=role==='guard'?[[6,25,'방패 전진'],[10,25,'밀어붙이기'],[3,0,'숨 고르기']]:role==='archer'?[[3,0,'조준'],[12,0,'저격'],[2,0,'재장전']]:role==='ghost'?[[8,0,'족보 봉인'],[14,0,'악몽 강타'],[4,0,'악몽의 빈틈']]:[[5,0,'견제'],[2,0,'힘 모으기'],[10,0,'내려치기']];
 const [base,armor,name]=cycle[n],enraged=g.foe.boss&&g.enemyHp<=g.foe.maxHp/2;
 return {name,attack:base+(g.foe.elite?3:0)+(enraged?3:0),armor:g.armorBroken?0:armor,exposed:n===2||enraged,enraged};
}
function scoreCards(g,id,indices){
 const def=PATTERNS[id],level=g.training[id]||0,intent=enemyIntent(g),has=k=>g.relics.includes(k),steps=[],cards=indices.map(i=>g.hand[i]),counts={};for(const c of cards)counts[c.rank]=(counts[c.rank]||0)+1;
 let chips=def.chips+level*def.growth[0],mult=def.mult+level*def.growth[1],strikes=g.strikes,heartTriggers=0;
 const record=(label,source,die=null,phase='relic',active=true)=>steps.push({label,source,die,phase,slot:g.relics.indexOf(source),active,chips,mult,total:score(chips,mult)});
 record(def.name+' Lv'+(level+1),'pattern',null,'base');
 // Card scoring is a separate pass, as in poker deck-builders. Retriggers are
 // finite and still fire card-stage effects, regardless of echo's slot.
 for(const [j,c]of cards.entries())for(let t=0;t<(has('echo')&&counts[c.rank]>=2?2:1);t++){
  const value=c.rank===14?11:Math.min(10,c.rank);chips+=value;record((t?'리본 재발동 · ':'')+cardName(c)+' 칩 +'+value,t?'echo':'card',indices[j],'card');
  if(c.suit==='hearts')heartTriggers++;
  for(const key of g.relics){
   if(key==='candy'&&c.rank>=11){chips+=8;record('별사탕 칩 +8','candy',indices[j],'card');}
   if(key==='weather'&&++strikes>=3){strikes-=3;chips+=18;record('날씨는 맑음 · 번개 칩 +18','weather',indices[j],'card');}
  }
 }
 const rageSpent=has('yellow')&&!small(id)&&g.rage===3,stun=has('mace')&&small(id)&&g.maceHits===3;
 // Do not regroup additions before multiplications: visible slot order IS the
 // actual fold. Inactive/card/impact/passive relics do not acquire extra procs.
 for(const key of g.relics){
  let active=true;
  if(key==='pillow'&&heartTriggers){mult+=heartTriggers*.5;record('하트 '+heartTriggers+'회 · 배수 +'+heartTriggers*.5,key);}
  else if(key==='empty'&&!g.discards){mult+=3;record('빈 주머니 · 배수 +3',key);}
  else if(key==='rubber'){mult*=1.5;record('고무줄 · ×1.5',key);}
  else if(key==='bell'&&g.discards){chips+=g.discards*10;record('황금 방울 · 칩 +'+g.discards*10,key);}
  else if(key==='yellow'&&!small(id)){mult*=1.35;record('옐로카드 · ×1.35',key);if(rageSpent){mult*=2;record('분노 3 소모 · ×2',key);}}
  else if(key==='rust'&&g.hp<g.maxHp){mult*=1.2;record('상처 · ×1.2',key);}
  else if(key==='mace'&&stun){mult*=1.5;record('참회의 메이스 · ×1.5 / 기절',key);}
  else if(key==='paint'&&flushes(id)){mult*=1.8;record('한 가지 색의 꿈 · ×1.8',key);}
  else if(key==='ladder'&&straights(id)){mult*=2;record('사다리 · ×2',key);}
  else {active=false;const phase=RELIC_STAGES[key];if(phase==='relic')record(RELICS[key].name+' · 이번 패 조건 미충족',key,null,'relic',active);}
 }
 if(intent.exposed){mult*=1.35;record('적의 빈틈 · ×1.35','exposed',null,'enemy');}
 const breakArmor=id==='pair'&&intent.armor>0,raw=score(chips,mult),armor=breakArmor?0:intent.armor;let damage=Math.max(1,raw-armor);
 if(armor)record('방패 −'+armor,'guard',null,'enemy');if(breakArmor)record('원페어 · 방패 파괴','break',null,'enemy');
 const remain=g.enemyHp-damage,execute=has('scythe')&&small(id)&&!g.foe.boss&&remain>0&&remain<=g.foe.maxHp*.18;
 if(execute){damage=g.enemyHp;record('림의 낫 · 처형','scythe',null,'impact');}
 const heal=has('lucky')&&small(id)?Math.min(4,Math.floor(Math.min(g.enemyHp,damage)*.05),g.maxHp-g.hp):0;
 return {id,name:def.name,indices,cardIds:cards.map(c=>c.id),relicOrder:[...g.relics],chips,mult,raw,damage,steps,strikes,stun,rageSpent,heal,execute,breakArmor,guard:Math.max(0,5-indices.length)*2,blocked:g.foe.boss&&g.lastPattern===id};
}
export function canReorder(g){return ['pick','shop','draft'].includes(g.phase);}
export function moveRelic(g,from,to){
 if(!canReorder(g)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=g.relics.length||to>=g.relics.length||from===to)return false;
 const [id]=g.relics.splice(from,1);g.relics.splice(to,0,id);return true;
}
export function reorderPreview(g,from,to){
 const relics=[...g.relics],preview={...g,relics};if(!moveRelic(preview,from,to))return null;
 const before=bestHand(g),after=bestHand(preview);return {order:relics,before:before?.damage||0,after:after?.damage||0,delta:(after?.damage||0)-(before?.damage||0),pattern:after?.id||null};
}
// Search every scoring subset, not just the highest nominal poker rank.
// A trained pair or a relic-amplified flush may beat a higher nominal hand.
export function evaluateHands(g){
 const out={};function visit(start,indices){if(indices.length){const id=classify(indices.map(i=>g.hand[i]));if(id){const r=scoreCards(g,id,indices);if(!out[id]||r.damage>out[id].damage||r.damage===out[id].damage&&r.guard>out[id].guard)out[id]=r;}}if(indices.length===5)return;for(let i=start;i<g.hand.length;i++)visit(i+1,[...indices,i]);}visit(0,[]);return out;
}
export function bestHand(g,results=evaluateHands(g)){return Object.values(results).filter(r=>!r.blocked).reduce((best,r)=>!best||r.damage>best.damage||r.damage===best.damage&&r.guard>best.guard?r:best,null);}
export function drawHints(g){
 if(g.phase!=='pick'||!g.discards)return [];
 const hints=[],remaining=new Set(g.drawPile),outs=predicate=>g.deck.filter(c=>remaining.has(c.id)&&predicate(c)).length;
 for(const [suit,s]of Object.entries(SUITS)){const keep=g.hand.filter(c=>c.suit===suit);if(keep.length===4&&outs(c=>c.suit===suit))hints.push({text:s.symbol+' 4장 · 플러시까지 같은 무늬 1장 (더미 '+outs(c=>c.suit===suit)+'장)',discard:g.hand.filter(c=>c.suit!==suit).map(c=>c.id)});}
 const counts={};for(const c of g.hand)counts[c.rank]=(counts[c.rank]||0)+1;
 for(const rank of Object.keys(counts).map(Number))if(counts[rank]===3&&outs(c=>c.rank===rank)){const keep=g.hand.filter(c=>c.rank===rank);hints.push({text:rankLabel(rank)+' 3장 · 포카드까지 1장 (더미 '+outs(c=>c.rank===rank)+'장)',discard:g.hand.filter(c=>!keep.includes(c)).map(c=>c.id).slice(0,5)});}
 for(let start=1;start<=10;start++){const keep=[],seen=new Set();for(const c of g.hand){const r=c.rank===14&&start===1?1:c.rank;if(r>=start&&r<start+5&&!seen.has(r)){seen.add(r);keep.push(c);}}if(keep.length!==4)continue;let missing=Array.from({length:5},(_,i)=>start+i).find(r=>!seen.has(r));if(missing===1)missing=14;const count=outs(c=>c.rank===missing);if(count)hints.push({text:'스트레이트까지 '+rankLabel(missing)+' 1장 (더미 '+count+'장)',discard:g.hand.filter(c=>!keep.includes(c)).map(c=>c.id)});}
 return hints.slice(0,2);
}
function foe(depth,elite=false){const roles=['fan','archer','guard','fan','archer','ghost'],names=['숲의 첫 내기','성급한 사수','방패 뒤의 거래','밤숲의 추종자','마지막 문지기','이불령의 마지막 내기'],maxHp=Math.round([180,340,570,850,1250,2300][depth]*(elite?1.45:1));return {depth,enemy:roles[depth],stage:{fan:0,archer:1,guard:2,ghost:3}[roles[depth]],name:(elite?'정예 · ':'')+names[depth],maxHp,boss:depth===5,elite};}
export function createGame(seed=Date.now()){
 const label=String(seed).trim().slice(0,48)||'BUTTER',deck=[];for(const suit of Object.keys(SUITS))for(let rank=2;rank<=14;rank++)deck.push({id:'c'+deck.length,rank,suit});
 const f=foe(0);return {seed:label,phase:'draft',time:0,depth:0,stage:0,foe:f,enemyHp:f.maxHp,hp:48,maxHp:48,gold:12,deck,nextCard:52,drawPile:[],discardPile:[],hand:[],selected:[],drawState:seedNumber(label+':cards58'),shopState:seedNumber(label+':shop58'),relics:[],training:Object.fromEntries(Object.keys(PATTERNS).map(id=>[id,0])),choices:['echo','paint','ladder'],hands:4,discards:3,turn:1,attacks:0,best:0,totalDamage:0,lastPattern:null,lastResult:null,pending:null,action:null,shield:0,strikes:0,rage:0,maceHits:0,komiUsed:false,armorBroken:false,history:[],shop:null,returnPhase:null,notice:'같은 숫자 / 같은 무늬 / 연속 숫자. 첫 유물로 빌드를 골라요.'};
}
function replenish(g){
 while(g.hand.length<8){if(!g.drawPile.length){if(!g.discardPile.length)break;g.drawPile=shuffle(g,g.discardPile);g.discardPile=[];}const id=g.drawPile.pop(),c=g.deck.find(c=>c.id===id);if(c)g.hand.push({...c});}
 g.selected=[];
}
function startFight(g,elite=false){g.foe=foe(g.depth,elite);g.stage=g.foe.stage;g.enemyHp=g.foe.maxHp;g.hands=4;g.discards=3;g.turn=1;g.lastPattern=null;g.lastResult=null;g.lastCounter=null;g.pending=null;g.action=null;g.armorBroken=false;g.shield=g.relics.includes('belt')?8:0;g.komiUsed=false;g.hand=[];g.discardPile=[];g.drawPile=shuffle(g,g.deck.map(c=>c.id));replenish(g);g.phase='pick';g.notice='8장 중 최대 피해 족보 자동 선택. 부족한 패를 골라 버릴 수 있어요.';}
export function chooseStarter(g,id){if(g.phase!=='draft'||!g.choices.includes(id))return false;g.relics.push(id);g.choices=[];startFight(g);return true;}
export function toggleCard(g,id){if(g.phase!=='pick'||!g.hand.some(c=>c.id===id))return false;const i=g.selected.indexOf(id);if(i>=0)g.selected.splice(i,1);else{if(g.selected.length>=5)return false;g.selected.push(id);}return true;}
export function discard(g){if(g.phase!=='pick'||g.discards<=0||g.selected.length<1||g.selected.length>5||g.selected.some(id=>!g.hand.some(c=>c.id===id)))return false;const selected=new Set(g.selected);g.discardPile.push(...g.hand.filter(c=>selected.has(c.id)).map(c=>c.id));g.hand=g.hand.filter(c=>!selected.has(c.id));g.discards--;replenish(g);g.notice='선택한 카드만 교체했어요. 남은 버리기 '+g.discards+'회 · 전투 전체에서 공유';return true;}
export function counterPreview(g,r){const resolving=g.phase==='resolve'||g.phase==='paused'&&g.returnPhase==='resolve',raw=resolving?g.pending.returnDamage:enemyIntent(g).attack,stun=Boolean(r?.stun),ward=stun?0:Math.min(raw,r?.guard||0),shieldSpent=stun?0:Math.min(g.shield,raw-ward);return {raw,ward,shieldSpent,loss:stun?0:raw-ward-shieldSpent,stun};}
export function attack(g){if(g.phase!=='pick'||g.hands<=0)return false;const result=bestHand(g);if(!result)return false;const type=result.damage>=300?'high':'normal',duration=type==='high'?1.1:.75,hitAt=butterReleasePoint(type)*duration+.3;g.pending={result,clock:0,hitAt,endAt:Math.max(duration+.15,hitAt+.35),applied:false,returnDamage:enemyIntent(g).attack};g.action={type,time:0,duration};g.lastResult=result;g.lastPattern=result.id;g.hands--;g.attacks++;g.selected=[];g.phase='resolve';g.notice=result.name+' · '+result.damage+' 피해 / 방어 '+result.guard;return true;}
function payCounter(g,r){const p=counterPreview(g,r);g.shield-=p.shieldSpent;g.hp=Math.max(0,g.hp-p.loss);g.lastCounter=p;if(p.loss){if(g.relics.includes('yellow'))g.rage=Math.min(3,g.rage+1);if(g.relics.includes('mace'))g.maceHits=Math.min(3,g.maceHits+1);}if(g.hp>0&&g.hp<=g.maxHp*.3&&g.relics.includes('komi')&&!g.komiUsed){g.hp=Math.min(g.maxHp,g.hp+8);g.komiUsed=true;}if(g.hp<=0||g.hands<=0){g.phase='dead';g.notice=g.hp<=0?'버터의 체력이 다했어요.':'공격 기회 4회를 모두 썼어요. 다음에는 패와 덱을 다듬어 봐요.';return false;}return true;}
function nextHand(g,ids){const used=new Set(ids);g.discardPile.push(...g.hand.filter(c=>used.has(c.id)).map(c=>c.id));g.hand=g.hand.filter(c=>!used.has(c.id));g.turn++;g.pending=null;g.action=null;replenish(g);g.phase='pick';const p=g.lastCounter;g.notice=(p?.stun?'기절 · 반격 취소':'반격 −'+(p?.loss||0)+' HP'+(p?.shieldSpent?' · 보호막 '+p.shieldSpent+' 흡수':''))+' · 공격 '+g.hands+'회 / 버리기 '+g.discards+'회 남음';}
export function canPass(g){return g.phase==='pick'&&g.discards===0&&!bestHand(g);}
export function pass(g){if(!canPass(g))return false;g.hands--;g.lastPattern=null;if(payCounter(g,null))nextHand(g,g.hand.map(c=>c.id));return true;}
function shopOffers(g){const pool=Object.keys(RELICS).filter(id=>!g.relics.includes(id)),relics=[];for(let i=0;i<3&&pool.length;i++){const j=Math.floor(random(g,'shopState')*pool.length);relics.push(pool.splice(j,1)[0]);}const booster=[];for(let i=0;i<3;i++)booster.push({rank:10+Math.floor(random(g,'shopState')*5),suit:Object.keys(SUITS)[Math.floor(random(g,'shopState')*4)]});return {relics,booster,cuts:0,copies:0,changes:0,lessons:0,rested:false,packBought:false};}
function clear(g){const interest=Math.min(5,Math.floor(g.gold/5)),reward=(g.foe.elite?14:8)+g.hands*2+interest;g.gold+=reward;g.history.push({depth:g.depth,name:g.foe.name,hp:g.hp,hands:g.hands,interest,reward});g.pending=null;g.action=null;if(g.foe.boss){g.phase='won';g.notice='직접 만든 덱으로 아공간 탈출!';}else{g.shop=shopOffers(g);g.phase='shop';g.notice='전투 보상 +'+reward+' G (이자 '+interest+' 포함). 덱과 유물 중 어디에 투자할까요?';}}
export function tick(g,dt){if(!['pick','resolve'].includes(g.phase)||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,1/30);g.time+=dt;if(g.phase!=='resolve')return;const p=g.pending;p.clock+=dt;g.action.time=Math.min(g.action.duration,g.action.time+dt);if(!p.applied&&p.clock>=p.hitAt){p.applied=true;g.enemyHp=Math.max(0,g.enemyHp-p.result.damage);g.best=Math.max(g.best,p.result.damage);g.totalDamage+=p.result.damage;g.strikes=p.result.strikes;if(p.result.rageSpent)g.rage=0;if(p.result.stun)g.maceHits=0;g.hp=Math.min(g.maxHp,g.hp+p.result.heal);if(p.result.breakArmor)g.armorBroken=true;}if(p.clock<p.endAt)return;if(!g.enemyHp){clear(g);return;}if(payCounter(g,p.result))nextHand(g,p.result.cardIds);}
export function serviceQuote(g,kind){if(!g.shop)return null;const s=g.shop;return {remove:{cost:4+s.cuts*2,left:2-s.cuts},copy:{cost:6,left:1-s.copies},suit:{cost:3,left:2-s.changes},rank:{cost:3,left:2-s.changes},train:{cost:5,left:2-s.lessons},rest:{cost:4,left:s.rested?0:1},pack:{cost:4,left:s.packBought?0:1},relic:{cost:8,left:1}}[kind]||null;}
export function canService(g,kind){const q=serviceQuote(g,kind);return g.phase==='shop'&&q?.left>0&&g.gold>=q.cost;}
export function editDeck(g,kind,id,value){
 if(!['remove','copy','suit','rank'].includes(kind)||!canService(g,kind))return false;const i=g.deck.findIndex(c=>c.id===id);if(i<0)return false;const c=g.deck[i];
 if(kind==='remove'&&g.deck.length<=MIN_DECK||kind==='suit'&&(!SUITS[value]||value===c.suit)||kind==='rank'&&(!Number.isInteger(value)||value<2||value>14||value===c.rank))return false;
 const q=serviceQuote(g,kind);g.gold-=q.cost;if(kind==='remove'){g.deck.splice(i,1);g.shop.cuts++;}if(kind==='copy'){g.deck.push({...c,id:'c'+g.nextCard++});g.shop.copies++;}if(kind==='suit'||kind==='rank'){c[kind]=value;g.shop.changes++;}
 g.notice=cardName(c)+' · '+({remove:'영구 제거',copy:'복제',suit:'무늬 변경',rank:'숫자 변경'}[kind])+' 완료 (이번 런)';return true;
}
export function train(g,id){if(!PATTERNS[id]||!canService(g,'train')||g.training[id]>=8)return false;g.gold-=serviceQuote(g,'train').cost;g.shop.lessons++;g.training[id]++;g.notice=PATTERNS[id].name+' Lv'+(g.training[id]+1)+' · 이번 런에 계속 누적';return true;}
export function rest(g){if(!canService(g,'rest')||g.hp>=g.maxHp)return false;g.gold-=serviceQuote(g,'rest').cost;g.shop.rested=true;g.hp=Math.min(g.maxHp,g.hp+16);return true;}
export function buyRelic(g,id,replace=null){if(!canService(g,'relic')||!g.shop.relics.includes(id)||g.relics.includes(id))return false;const i=g.relics.indexOf(replace);if(g.relics.length>=MAX_RELICS&&i<0)return false;if(g.relics.length>=MAX_RELICS){g.relics[i]=id;if(replace==='yellow')g.rage=0;if(replace==='weather')g.strikes=0;if(replace==='mace')g.maceHits=0;if(replace==='belt')g.shield=0;}else g.relics.push(id);g.gold-=8;g.shop.relics=g.shop.relics.filter(x=>x!==id);return true;}
export function buyPack(g,index){if(!canService(g,'pack')||!Number.isInteger(index)||index<0||index>=g.shop.booster.length)return false;g.gold-=4;g.deck.push({...g.shop.booster[index],id:'c'+g.nextCard++});g.shop.packBought=true;return true;}
export function travel(g,elite=false){if(g.phase!=='shop'||typeof elite!=='boolean'||g.depth>=5||elite&&g.depth===4)return false;g.depth++;g.shop=null;startFight(g,elite);return true;}
export function deckSummary(g){return {size:g.deck.length,suits:Object.fromEntries(Object.keys(SUITS).map(s=>[s,g.deck.filter(c=>c.suit===s).length])),ranks:Object.fromEntries(Array.from({length:13},(_,i)=>[i+2,g.deck.filter(c=>c.rank===i+2).length]))};}
export function pause(g){if(!['pick','resolve'].includes(g.phase))return false;g.returnPhase=g.phase;g.phase='paused';return true;}
export function resume(g){if(g.phase!=='paused')return false;g.phase=g.returnPhase;g.returnPhase=null;return true;}
