// v55: a six-encounter run. Classic v54 engine/art stay intact in dice54.html.
import * as Classic from './dice-engine.js?v=53.1';
import {butterReleasePoint} from './butter-original-motion.js';
export const {FACES,PATTERNS,RELICS,toggleHold,pause,resume}=Classic;
export const RUN_LENGTH=6,TRAIN_CAP=3,MAX_RELICS=4,NUDGES_PER_FIGHT=2;
const floor=n=>Math.floor(Number(n.toFixed(8)));
function random(g,key){g[key]=(g[key]+0x6d2b79f5)>>>0;let t=g[key];t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
const PROFILES=[{enemy:'fan',name:'숲의 추종자',stage:0},{enemy:'archer',name:'성급한 사수',stage:1},{enemy:'guard',name:'문지기',stage:2},{enemy:'ghost',name:'이불령',stage:3}];
export function makeFoe(depth,role,elite=false){const p=PROFILES[role],boss=depth===RUN_LENGTH-1;return {...p,name:boss?'이불령의 마지막 내기':(elite?'정예 ':'')+p.name,maxHp:Math.round([210,300,430,560,740,1800][depth]*(elite?1.6:1)),elite,boss,depth};}
function offer(g){const pool=Object.keys(RELICS).filter(id=>!g.relics.includes(id)),out=[];for(const sourced of [true,true,false]){const suitable=pool.filter(id=>Boolean(RELICS[id].sourceId)===sourced),list=suitable.length?suitable:pool;if(!list.length)break;const id=list[Math.floor(random(g,'lootState')*list.length)];out.push(id);pool.splice(pool.indexOf(id),1);}return out;}
export function createGame(seed=Date.now()){
 const g=Classic.createGame(seed);Object.assign(g,{hp:48,maxHp:48,depth:0,foe:makeFoe(0,0),rollState:Classic.seedNumber(g.seed+':dice55'),lootState:Classic.seedNumber(g.seed+':loot55'),routeState:Classic.seedNumber(g.seed+':route55'),training:{free:0,pair:0,kind:0,straight:0},campPoints:0,campLog:[],routes:[],history:[],turnGuard:0,armorBroken:false,nudges:NUDGES_PER_FIGHT,nudgesUsed:0,lastNudge:null});g.enemyHp=g.foe.maxHp;g.choices=offer(g);return g;
}
function roll(g,initial=false){g.changed=[];for(let i=0;i<5;i++){if(!initial&&g.held[i]){g.kept[i]=true;continue;}g.dice[i]=1+Math.floor(random(g,'rollState')*6);g.kept[i]=false;g.changed.push(i);}g.rollSerial++;g.rollTimer=.25;g.phase='rolling';}
function startTurn(g){g.held.fill(false);g.kept.fill(false);g.rerolls=2;g.turnGuard=0;g.pending=null;g.action=null;roll(g,true);}
export function reroll(g){if(g.phase!=='pick'||g.rerolls<=0||g.held.every(Boolean))return false;g.rerolls--;roll(g);g.notice='한 번 더 욕심냈어요 · 이번 턴 적의 반격 +1';return true;}
export function nudgeDie(g,index,delta){
 if(g.phase!=='pick'||g.nudges<=0||!Number.isInteger(index)||index<0||index>4||![1,-1].includes(delta)||g.dice[index]+delta<1||g.dice[index]+delta>6)return false;
 const from=g.dice[index];g.dice[index]+=delta;g.kept[index]=false;g.held[index]=true;g.nudges--;g.nudgesUsed++;g.lastNudge={index,from,to:g.dice[index],at:g.time};g.notice=(index+1)+'번 주사위 '+from+' → '+g.dice[index]+' · 손보기 '+g.nudges+'회 남음 (이번 전투)';return true;
}
export function nudgeSuggestions(g){
 if(g.phase!=='pick'||g.nudges<=0)return [];if(Object.keys(PATTERNS).some(id=>{const r=evaluate(g,id);return r&&!r.blocked&&r.damage>=g.enemyHp;}))return [];const suggestions=[];
 for(let index=0;index<5;index++)for(const delta of [-1,1]){
  const value=g.dice[index]+delta;if(value<1||value>6)continue;
  const next={...g,dice:g.dice.map((v,i)=>i===index?value:v),kept:g.kept.map((v,i)=>i===index?false:v)};
  for(const id of ['pair','kind','straight']){const before=evaluate(g,id),after=evaluate(next,id);if(!after||after.blocked)continue;if(before&&!before.blocked&&after.indices.length<=before.indices.length)continue;suggestions.push({index,delta,id,name:after.name,damage:after.damage,guard:after.guard});}
 }
 return suggestions.sort((a,b)=>b.damage-a.damage||b.guard-a.guard||a.index-b.index||a.delta-b.delta).filter((s,i,all)=>all.findIndex(q=>q.id===s.id&&q.damage===s.damage)===i).slice(0,2);
}
export function synergyHints(g,candidate=null){
 const owned=new Set(g.relics),hints=[];if(candidate)owned.add(candidate);
 for(const [a,b,text]of [['echo','weather','리본 재발동도 번개를 충전해요'],['echo','candy','재발동마다 별사탕 칩을 한 번 더 얻어요'],['pillow','rubber','지킨 주사위의 배수를 고무줄로 증폭해요']])if(owned.has(a)&&owned.has(b)&&(!candidate||candidate===a||candidate===b))hints.push(text);
 if(owned.has('bell')&&(!candidate||candidate==='bell'))hints.push('손보기로 패를 고치면 황금 방울의 재굴림 보너스를 지켜요');return hints;
}
export function chooseRelic(g,id,replace=null){
 if(!['draft','reward'].includes(g.phase)||!g.choices.includes(id)||g.relics.includes(id))return false;
 const reward=g.phase==='reward';if(reward&&g.campPoints<=0)return false;
 if(g.relics.length>=MAX_RELICS){const slot=g.relics.indexOf(replace);if(!reward||slot<0)return false;g.relics.splice(slot,1,id);if(replace==='yellow')g.rage=0;if(replace==='weather')g.strikes=0;if(replace==='mace')g.maceHits=0;if(replace==='belt')g.shield=0;}else g.relics.push(id);g.choices=[];
 if(reward){g.campPoints--;g.campLog.push('유물: '+RELICS[id].name);g.campOffer=[];g.phase='camp';return true;}
 g.shield=g.relics.includes('belt')?8:0;startTurn(g);g.notice='작은 조합은 남은 주사위로 방어해요. 적의 다음 행동을 보고 골라요.';return true;
}
export function enemyIntent(g,turn=g.turn){
 const n=(turn-1)%3,role=g.foe.enemy;
 const patterns=role==='archer'?[['조준',3,0],['저격',14,0],['재장전',2,0]]:role==='guard'?[['방패 전진',7,28],['밀어붙이기',10,28],['숨 고르기',4,0]]:role==='ghost'?[['봉인',10,0],['악몽 강타',18,0],['악몽의 빈틈',5,0]]:[['견제',6,0],['힘 모으기',2,0],['내려치기',12,0]];
 const [name,base,armor]=patterns[n],enraged=g.foe.boss&&g.enemyHp>0&&g.enemyHp<=g.foe.maxHp*.5,exposed=enraged||(role==='fan'?n===1:n===2),extra=turn===g.turn?2-g.rerolls:0;
 return {name:enraged?'광폭 · '+name:name,attack:base+(g.foe.elite?4:0)+(enraged?3:0)+Math.floor((turn-1)/3)*2+extra,armor:g.armorBroken?0:armor,exposed,pressure:extra,enraged};
}
export const incoming=g=>enemyIntent(g).attack;
export function evaluate(g,id){
 // Reuse verified artifact scoring, but apply this run's enemy HP/armor rules.
 const r=Classic.evaluate({...g,stage:g.foe.boss?3:0,relics:g.relics.filter(key=>key!=='scythe')},id);if(!r)return null;
 const level=g.training[id],intent=enemyIntent(g),steps=[...r.steps];let chips=r.chips+level*8,mult=r.mult+level*.75;
 if(level)steps.push({label:PATTERNS[id].name+' Lv'+level+' · 칩 +'+level*8+' / 배수 +'+level*.75,source:'training',die:null,chips,mult,total:floor(chips*mult)});
 if(intent.exposed){mult*=1.35;steps.push({label:'적의 빈틈 · 피해 ×1.35',source:'exposed',die:null,chips,mult,total:floor(chips*mult)});}
 const raw=floor(chips*mult),breakArmor=id==='pair'&&intent.armor>0,armor=breakArmor?0:intent.armor;let damage=Math.max(1,raw-armor);
 if(armor)steps.push({label:'적 방패 −'+armor+' 피해 · 짝꿍으로 파괴 가능',source:'guard',die:null,chips,mult,total:damage});
 if(breakArmor)steps.push({label:'짝꿍 · 이번 전투 방패 파괴',source:'break',die:null,chips,mult,total:damage});
 const remain=g.enemyHp-damage,execute=g.relics.includes('scythe')&&['free','pair'].includes(id)&&!g.foe.boss&&remain>0&&remain<=g.foe.maxHp*.18;
 if(execute){damage=g.enemyHp;steps.push({label:'림의 낫 · 남은 체력 '+remain+' 처형',source:'scythe',die:null,chips,mult,total:damage});}
 const heal=g.relics.includes('lucky')&&['free','pair'].includes(id)?Math.min(4,floor(Math.min(g.enemyHp,damage)*.05),g.maxHp-g.hp):0;
 return {...r,chips,mult,raw,damage,steps,execute,heal,breakArmor,guard:(5-r.indices.length)*2};
}
export function counterPreview(g,result=null){const resolving=g.phase==='resolve'||g.phase==='paused'&&g.returnPhase==='resolve',raw=resolving&&g.pending?g.pending.returnDamage:incoming(g),stun=Boolean(result?.stun),ward=stun?0:Math.min(raw,result?.guard??g.turnGuard),shieldSpent=stun?0:Math.min(g.shield,raw-ward);return {raw,stun,ward,shieldSpent,blocked:ward+shieldSpent,loss:stun?0:raw-ward-shieldSpent};}
export function attack(g,id){
 if(g.phase!=='pick')return false;const result=evaluate(g,id);if(!result||result.blocked)return false;
 const type=result.damage>=200?'high':'normal',duration=type==='high'?1.1:.75,hitAt=butterReleasePoint(type)*duration+.3;
 const intent=enemyIntent(g);g.pending={result,clock:0,hitAt,endAt:Math.max(duration+.15,hitAt+.35),applied:false,returnDamage:intent.attack,intent};g.action={type,time:0,duration};g.phase='resolve';g.attacks++;g.lastPattern=id;g.lastResult=result;g.notice='공격 '+result.damage+' · 남은 주사위 방어 '+result.guard;return true;
}
function counter(g,stun=false){
 const p=counterPreview(g,stun?{stun:true}:null);g.shield-=p.shieldSpent;g.turnGuard=0;g.hp=Math.max(0,g.hp-p.loss);let heal=0;
 if(p.loss>0){if(g.relics.includes('yellow'))g.rage=Math.min(3,g.rage+1);if(g.relics.includes('mace'))g.maceHits=Math.min(3,g.maceHits+1);}
 if(g.hp>0&&g.hp<=g.maxHp*.3&&g.relics.includes('komi')&&!g.komiUsed){heal=Math.min(8,g.maxHp-g.hp);g.hp+=heal;g.komiUsed=true;}
 g.lastCounter={...p,heal};if(g.hp<=0){g.phase='dead';g.notice='다음 판에는 회복과 방어를 남겨 볼까요?';return;}
 g.turn++;startTurn(g);g.notice=(stun?'기절 · 반격 취소':'반격 −'+p.loss+' HP · 방어 '+p.ward+(p.shieldSpent?' / 보호막 '+p.shieldSpent:''))+(heal?' · 베개 +'+heal+' HP':'');
}
export function canPass(g){return g.phase==='pick'&&g.rerolls===0&&Object.keys(PATTERNS).every(id=>{const r=evaluate(g,id);return !r||r.blocked;});}
export function pass(g){if(!canPass(g))return false;g.lastPattern=null;g.turnGuard=0;counter(g);return true;}
function routeOffers(g){const depth=g.depth+1;if(depth===RUN_LENGTH-1)return [{id:'boss',...makeFoe(depth,3)}];const role=Math.floor(random(g,'routeState')*3),alternate=(role+1+Math.floor(random(g,'routeState')*2))%3;return [{id:'safe',...makeFoe(depth,role)},{id:'elite',...makeFoe(depth,alternate,true)}];}
function clearFight(g){
 g.history.push({depth:g.depth,name:g.foe.name,elite:g.foe.elite,turns:g.turn,hp:g.hp});g.pending=null;g.action=null;g.turnGuard=0;
 if(g.foe.boss){g.phase='won';g.notice='버터, 선택한 빌드로 아공간을 탈출했어요!';return;}
 g.campPoints=g.foe.elite?2:1;g.campLog=[];g.campOffer=[];g.routes=routeOffers(g);g.phase='camp';g.notice='회복 / 조합 훈련 / 유물 중 '+g.campPoints+'개를 골라요. 자동 회복은 없어요.';
}
export function camp(g,kind,id){
 if(g.phase!=='camp'||g.campPoints<=0)return false;
 if(kind==='rest'){if(g.hp>=g.maxHp)return false;const heal=Math.min(16,g.maxHp-g.hp);g.hp+=heal;g.campPoints--;g.campLog.push('휴식: +'+heal+' HP');return true;}
 if(kind==='train'){if(!PATTERNS[id]||g.training[id]>=TRAIN_CAP)return false;g.training[id]++;g.campPoints--;g.campLog.push(PATTERNS[id].name+' Lv'+g.training[id]);return true;}
 if(kind==='relic'){if(!g.campOffer?.length)g.campOffer=offer(g);g.choices=[...g.campOffer];if(!g.choices.length)return false;g.phase='reward';return true;}
 return false;
}
export function cancelReward(g){if(g.phase!=='reward')return false;g.phase='camp';g.choices=[];return true;}
export function leaveCamp(g){if(g.phase!=='camp'||g.campPoints>0)return false;g.history.at(-1).camp=[...g.campLog];g.phase='route';return true;}
export function travelFromCamp(g,id){if(g.phase!=='camp'||g.campPoints!==0||!g.routes.some(r=>r.id===id))return false;leaveCamp(g);return chooseRoute(g,id);}
export function chooseRoute(g,id){
 if(g.phase!=='route')return false;const foe=g.routes.find(r=>r.id===id);if(!foe)return false;
 g.depth++;g.foe={...foe};g.stage=foe.stage;g.enemyHp=foe.maxHp;g.turn=1;g.lastPattern=null;g.lastCounter=null;g.armorBroken=false;g.komiUsed=false;g.shield=g.relics.includes('belt')?8:0;g.nudges=NUDGES_PER_FIGHT;g.lastNudge=null;g.routes=[];startTurn(g);g.notice=foe.boss?'보스는 직전 조합을 봉인해요. 절반 체력부터 광폭: 반격 +3 / 항상 빈틈 ×1.35':foe.elite?'정예전 · 적 체력 ×1.6 / 반격 +4 / 캠프 활동 2회':'일반전 · 캠프 활동 1회';return true;
}
export function tick(g,dt){
 if(!['pick','rolling','resolve'].includes(g.phase)||!(dt>0&&Number.isFinite(dt)))return;dt=Math.min(dt,1/30);g.time+=dt;if(g.action)g.action.time=Math.min(g.action.duration,g.action.time+dt);
 if(g.phase==='rolling'){g.rollTimer-=dt;if(g.rollTimer<=0)g.phase='pick';return;}
 if(g.phase!=='resolve')return;const p=g.pending;p.clock+=dt;
 if(!p.applied&&p.clock>=p.hitAt){p.applied=true;g.enemyHp=Math.max(0,g.enemyHp-p.result.damage);g.best=Math.max(g.best,p.result.damage);g.totalDamage+=p.result.damage;g.strikes=p.result.strikes;if(p.result.rageSpent)g.rage=0;if(p.result.stun)g.maceHits=0;g.hp=Math.min(g.maxHp,g.hp+p.result.heal);g.turnGuard=p.result.guard;if(p.result.breakArmor)g.armorBroken=true;}
 if(p.clock<p.endAt)return;g.action=null;if(g.enemyHp===0)clearFight(g);else counter(g,p.result.stun);
}
