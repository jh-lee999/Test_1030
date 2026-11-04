// Seeded, DOM-free dice roguelike. Presentation and previews never consume RNG.
import {butterReleasePoint} from './butter-original-motion.js';
export const FACES=[null,{name:'별사탕',icon:'attack',color:'#b99ce7'},{name:'베개',icon:'pillow',color:'#91bdd7'},{name:'새총',icon:'slingshot',color:'#d3ad62'},{name:'간식',icon:'snack',color:'#dca58b'},{name:'책',icon:'book-low',color:'#9bba8b'},{name:'왕별',icon:'book-high',color:'#dabf6d'}];
export const PATTERNS={free:{name:'자유 투척',hint:'어떤 주사위든 5개',chips:4,mult:1},pair:{name:'짝꿍',hint:'같은 눈 2개',chips:8,mult:2},kind:{name:'삼총사',hint:'같은 눈 3개 이상 · 4/5개면 배수 상승',chips:12,mult:3},straight:{name:'별빛 행진',hint:'1~5 또는 2~6 연속',chips:18,mult:4}};
export const RELICS={
 echo:{name:'쌍둥이 리본',icon:'projectile',tag:'재발동',text:'득점하는 같은 눈이 2개 이상이면 그 주사위들을 한 번 더 발동. 별사탕·베개 효과도 다시 발동해요.',color:'#c4a2e2'},
 candy:{name:'별사탕 주머니',icon:'snack',tag:'칩 추가',text:'1 또는 6 눈이 득점할 때마다 칩 +8. 리본으로 재발동해도 적용돼요.',color:'#e3b5cc'},
 pillow:{name:'코미의 베개',icon:'pillow',tag:'배수 추가',text:'재굴림 때 한 번 이상 지켜 둔 주사위가 득점할 때마다 배수 +0.5. 막 고정한 것만으로는 적용되지 않아요.',color:'#9cbfdc'},
 empty:{name:'빈 주머니의 배짱',icon:'bomb',tag:'모험',text:'재굴림을 두 번 모두 쓴 공격은 배수 +2. 더 굴릴지 지금 공격할지 골라요.',color:'#e5a995'},
 rubber:{name:'쫀득한 고무줄',icon:'slingshot',tag:'배수 증폭',text:'주사위와 다른 유물 계산이 끝나면 최종 배수 ×1.5.',color:'#b9c78f'},
 bell:{name:'황금 방울',icon:'key',tag:'일찍 공격',text:'공격할 때 남긴 재굴림 1회마다 칩 +12. 굴리지 않는 선택도 강해져요.',color:'#e0c176'}
};
export const ENCOUNTERS=[
 {name:'숲의 초대장',enemy:'fan',hp:180,attack:6,rule:'없음 · 조합과 유물의 연쇄를 연습해요.'},
 {name:'성급한 사수',enemy:'archer',hp:320,attack:8,rule:'3턴째부터 반격 +3. 오래 끌수록 위험해요.'},
 {name:'방패 뒤의 비밀',enemy:'guard',hp:460,attack:10,rule:'첫 공격의 피해를 30 막아요(최소 피해 1). 다음 공격부터 해제돼요.'},
 {name:'이불령의 마지막 내기',enemy:'ghost',hp:1000,attack:12,rule:'직전에 쓴 조합은 다음 턴에 사용할 수 없어요.'}
];
export function seedNumber(value){let n=2166136261;for(const c of String(value))n=Math.imul(n^c.codePointAt(0),16777619);return n>>>0;}
function random(g,stream){g[stream]=(g[stream]+0x6d2b79f5)>>>0;let t=g[stream];t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
function offer(g){const pool=Object.keys(RELICS).filter(id=>!g.relics.includes(id)),choices=[];while(choices.length<3&&pool.length)choices.push(pool.splice(Math.floor(random(g,'lootState')*pool.length),1)[0]);return choices;}
export function createGame(seed=Date.now()){
 const label=String(seed).trim().slice(0,48)||'BUTTER';
 const g={seed:label,rollState:seedNumber(label+':dice52'),lootState:seedNumber(label+':relic52'),phase:'draft',time:0,stage:0,hp:40,maxHp:40,enemyHp:ENCOUNTERS[0].hp,turn:1,dice:[1,2,3,4,5],held:Array(5).fill(false),kept:Array(5).fill(false),rerolls:2,relics:[],choices:[],rollSerial:0,changed:[],attacks:0,best:0,totalDamage:0,lastPattern:null,lastResult:null,pending:null,action:null,notice:'유물 하나로 첫 빌드를 시작해요.',returnPhase:null};
 g.choices=offer(g);return g;
}
export function patternMatch(dice,id){
 if(dice.length!==5||dice.some(v=>!Number.isInteger(v)||v<1||v>6)||!PATTERNS[id])return null;
 const groups=Array.from({length:6},(_,n)=>({value:n+1,indices:dice.flatMap((v,i)=>v===n+1?[i]:[])})).sort((a,b)=>b.indices.length-a.indices.length||b.value-a.value);
 if(id==='free')return {indices:[0,1,2,3,4],mult:1,name:PATTERNS[id].name};
 if(id==='straight'){const sorted=[...dice].sort((a,b)=>a-b);return sorted.every((v,i)=>v===sorted[0]+i)?{indices:[0,1,2,3,4],mult:4,name:PATTERNS[id].name}:null;}
 if(id==='pair'){const group=groups.filter(q=>q.indices.length>=2).sort((a,b)=>b.value-a.value)[0];return group?{indices:group.indices.slice(0,2),mult:2,name:PATTERNS[id].name}:null;}
 const q=groups[0],n=q.indices.length;return n>=3?{indices:q.indices,mult:n===5?9:n===4?5:3,name:n===5?'별 다섯! 잭팟':n===4?'네쌍둥이':PATTERNS[id].name}:null;
}
export function evaluate(g,id){
 const match=patternMatch(g.dice,id);if(!match)return null;
 let chips=PATTERNS[id].chips,mult=match.mult;const steps=[],has=key=>g.relics.includes(key),record=(label,source,die=null)=>steps.push({label,source,die,chips,mult,total:Math.floor(chips*mult)});
 record(match.name,'pattern');
 const counts=g.dice.reduce((a,v)=>(a[v]=(a[v]||0)+1,a),{});
 for(const i of match.indices){
  const v=g.dice[i],times=has('echo')&&counts[v]>=2?2:1;
  for(let repeat=0;repeat<times;repeat++){
   chips+=v*2;record((repeat?'리본 재발동 · ':'')+FACES[v].name+' +'+(v*2),repeat?'echo':'die',i);
   if(has('candy')&&(v===1||v===6)){chips+=8;record('별사탕 칩 +8','candy',i);}
   if(has('pillow')&&g.kept[i]){mult+=.5;record('지켜 둔 베개 · 배수 +0.5','pillow',i);}
  }
 }
 if(has('bell')&&g.rerolls){chips+=g.rerolls*12;record('황금 방울 · 칩 +'+g.rerolls*12,'bell');}
 if(has('empty')&&g.rerolls===0){mult+=2;record('빈 주머니 · 배수 +2','empty');}
 if(has('rubber')){mult*=1.5;record('고무줄 · 최종 배수 ×1.5','rubber');}
 const raw=Math.floor(chips*mult),guard=g.stage===2&&g.turn===1?30:0,damage=Math.max(1,raw-guard),blocked=g.stage===3&&g.lastPattern===id;
 if(guard)steps.push({label:'첫 방패 −30 피해',source:'guard',die:null,chips,mult,total:damage});
 return {id,name:match.name,indices:match.indices,chips,mult,raw,damage,steps,blocked,reason:blocked?'직전에 쓴 조합 · 이번 턴 금지':''};
}
function rollDice(g,initial=false){
 const changed=[];for(let i=0;i<5;i++){
  if(!initial&&g.held[i]){g.kept[i]=true;continue;}
  g.dice[i]=1+Math.floor(random(g,'rollState')*6);g.kept[i]=false;changed.push(i);
 }
 g.changed=changed;g.rollSerial++;g.rollTimer=.25;g.phase='rolling';
}
function startTurn(g){g.held.fill(false);g.kept.fill(false);g.rerolls=2;g.pending=null;g.action=null;rollDice(g,true);g.notice='주사위를 눌러 고정 · 지금 공격하거나 두 번 더 굴릴 수 있어요.';}
export function toggleHold(g,index){if(g.phase!=='pick'||!Number.isInteger(index)||index<0||index>4)return false;g.held[index]=!g.held[index];return true;}
export function reroll(g){if(g.phase!=='pick'||g.rerolls<=0||g.held.every(Boolean))return false;g.rerolls--;rollDice(g);return true;}
export function chooseRelic(g,id){
 if(!['draft','reward'].includes(g.phase)||!g.choices.includes(id)||g.relics.includes(id))return false;
 const next=g.phase==='reward';g.relics.push(id);g.choices=[];
 if(next){g.stage++;g.enemyHp=ENCOUNTERS[g.stage].hp;g.turn=1;g.lastPattern=null;g.hp=Math.min(g.maxHp,g.hp+12);}
 startTurn(g);return true;
}
export function incoming(g){return ENCOUNTERS[g.stage].attack+(g.stage===1&&g.turn>=3?3:0)+Math.floor((g.turn-1)/3)*2;}
export function canPass(g){return g.phase==='pick'&&g.rerolls===0&&Object.keys(PATTERNS).every(id=>{const r=evaluate(g,id);return !r||r.blocked;});}
export function attack(g,id){
 if(g.phase!=='pick')return false;const result=evaluate(g,id);if(!result||result.blocked)return false;
 const type=result.damage>=200?'high':'normal',duration=type==='high'?1.1:.75,hitAt=butterReleasePoint(type)*duration+.3;
 g.pending={result,clock:0,hitAt,endAt:Math.max(duration+.15,hitAt+.35),applied:false,returnDamage:incoming(g)};
 g.action={type,time:0,duration};g.phase='resolve';g.attacks++;g.lastPattern=id;g.lastResult=result;g.notice='주사위 → 유물 추가 → 배수 증폭';return true;
}
function counter(g,loss){g.hp=Math.max(0,g.hp-loss);if(g.hp<=0){g.phase='dead';g.notice='아공간에 남겨졌어요. 다른 조합으로 다시 도전!';}else{g.turn++;startTurn(g);g.notice='반격 −'+loss+' HP · 다음 패를 골라요.';}}
export function pass(g){if(!canPass(g))return false;g.lastPattern=null;counter(g,incoming(g));return true;}
export function pause(g){if(!['pick','rolling','resolve'].includes(g.phase))return false;g.returnPhase=g.phase;g.phase='paused';return true;}
export function resume(g){if(g.phase!=='paused')return false;g.phase=g.returnPhase;g.returnPhase=null;return true;}
export function tick(g,dt){
 if(!['pick','rolling','resolve'].includes(g.phase)||!(dt>0&&Number.isFinite(dt)))return;
 dt=Math.min(dt,1/30);g.time+=dt;
 if(g.action){g.action.time=Math.min(g.action.duration,g.action.time+dt);}
 if(g.phase==='rolling'){g.rollTimer-=dt;if(g.rollTimer<=0)g.phase='pick';return;}
 if(g.phase!=='resolve')return;const p=g.pending;p.clock+=dt;
 if(!p.applied&&p.clock>=p.hitAt){p.applied=true;g.enemyHp=Math.max(0,g.enemyHp-p.result.damage);g.best=Math.max(g.best,p.result.damage);g.totalDamage+=p.result.damage;}
 if(p.clock<p.endAt)return;
 g.action=null;
 if(g.enemyHp===0){g.pending=null;if(g.stage===3){g.phase='won';g.notice='버터, 아공간 탈출 성공!';}else{g.phase='reward';g.choices=offer(g);g.notice='유물을 하나 더 고르고 체력 12를 회복해요.';}}
 else counter(g,p.returnDamage);
}
