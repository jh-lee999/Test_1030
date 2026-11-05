import {advanceButterGait,butterReleasePoint,butterMuzzleOffset} from './butter-original-motion.js';
import {WORLD,seedNumber,random,generateWorld,blocked,moveBody,lineBlocked,steer} from './survivor69-world.js';
import {MOVES,RELICS,FUSIONS,MAPS,LOADOUTS,moveStats,metaBonuses} from './survivor69-content.js';
export {WORLD,seedNumber,MOVES,RELICS,FUSIONS,MAPS,LOADOUTS,moveStats};
export const FINAL_AT=210,MAX_ENEMIES=150;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rand=(g,key='spawnRng')=>random(g,key),live=e=>!e.dead;
export const xpNeeded=level=>8+(level-1)*6;
export function stats(g){return {damage:1,rate:1,speed:218*g.meta.speed,maxHp:100+g.meta.hp,magnet:100+g.meta.magnet,ultimateCooldown:18};}
export function createGame(seed=Date.now(),options={}){
 const label=String(seed).trim().slice(0,48)||'BUTTER',studies=Object.fromEntries(['vitality','stride','pocket','insight'].map(k=>[k,clamp(Math.floor(options.studies?.[k]||0),0,k==='insight'?2:3)]));
 const map=Object.hasOwn(MAPS,options.map)?options.map:'forest',loadout=Object.hasOwn(LOADOUTS,options.loadout)?options.loadout:'butter';
 const g={version:69,runId:String(options.runId||label+':diagnostic').slice(0,100),seed:label,map,loadout,tier:clamp(Math.floor(options.tier||0),0,2),phase:'playing',returnPhase:null,time:0,level:1,xp:0,pendingLevels:0,pendingRewards:1,draft:true,offers:[],rerolls:1+studies.insight,
  meta:metaBonuses(studies),world:generateWorld(label,map),goal:Object.hasOwn(FUSIONS,options.goal)?options.goal:null,moves:{stone:{level:1,awake:false,timer:.1}},relics:[],fusions:[],cores:0,seals:0,bonusShards:0,kills:0,damageDealt:0,won:false,
  player:{x:1300,y:1000,hp:100+5*studies.vitality,facing:-1,invuln:0,ultCooldown:0,action:null,gait:{phase:0,amount:0,clock:0}},
  spawnRng:seedNumber(label+':spawn69'),lootRng:seedNumber(label+':loot69'),id:0,enemies:[],bullets:[],shots:[],gems:[],effects:[],numbers:[],queue:[],zones:[],pillowHits:{},pillowHeat:0,
  spawnTimer:1.5,eliteAt:50,championSpawned:false,finalSpawned:false,earlySummon:false,burstAt:35,relicState:{distance:0,pickups:0,still:0,frostAt:0,parries:0},
  telemetry:{damageTaken:0,damageBy:{},procs:{},samples:[],nextSample:30,lastHit:'없음',distance:0,firstLevelAt:null},notice:'선물을 고른 뒤, 지도에 표시된 균열 2곳을 봉인하세요.',events:[]};
 if(LOADOUTS[loadout].move)g.moves[LOADOUTS[loadout].move]={level:1,awake:false,timer:.3};offer(g);return g;
}
export function eligibleUpgrades(g){
 const out=[];
 for(const [id,d]of Object.entries(MOVES)){const m=g.moves[id];if(!m&&Object.keys(g.moves).length<4)out.push({id:'move:'+id,name:d.name,icon:d.icon,text:d.ranks[0],tag:'새 기술 · '+(Object.keys(g.moves).length+1)+'/4칸'});else if(m&&m.level<3)out.push({id:'move:'+id,name:d.name,icon:d.icon,text:d.ranks[m.level],tag:'기믹 변화 · Lv'+m.level+' → '+(m.level+1)});}
 for(const [id,r]of Object.entries(RELICS))if(!g.relics.includes(id))out.push({id:'relic:'+id,name:r.name,icon:r.icon,text:r.text,tag:'이번 판 유물'});
 for(const [id,f]of Object.entries(FUSIONS))if(g.fusions.length<2&&g.cores>0&&!g.fusions.includes(id)&&f.parts.every(k=>g.moves[k]?.level===3))out.unshift({id:'fusion:'+id,name:f.name,icon:f.icon,text:f.text,tag:'융합 · '+f.parts.map(k=>MOVES[k].name).join(' + ')+' · 핵 1개'});
 if(!out.length)out.push({id:'snack',name:'쉬어 가는 간식',icon:'♥',text:'체력 25 회복 · 모든 기믹을 완성했어요.',tag:'회복'});return out;
}
function offer(g){
 let pool=g.pendingRewards>0?eligibleUpgrades(g).filter(o=>o.id.startsWith('relic:')):eligibleUpgrades(g);
 if(g.draft)pool=pool.filter(o=>['relic:comet','relic:hoarder','relic:frost'].includes(o.id));if(!pool.length)pool=eligibleUpgrades(g);g.offers=[];
 const goalParts=g.goal?FUSIONS[g.goal].parts:[],goal=pool.filter(o=>o.id.startsWith('move:')&&goalParts.includes(o.id.split(':')[1])).sort((a,b)=>(g.moves[a.id.split(':')[1]]?.level||0)-(g.moves[b.id.split(':')[1]]?.level||0))[0];
 const guarantee=pool.find(o=>o.id==='fusion:'+g.goal)||pool.find(o=>o.id.startsWith('fusion:'))||goal||pool.find(o=>o.id.startsWith('move:')&&g.moves[o.id.split(':')[1]]);
 if(guarantee){g.offers.push(guarantee);pool=pool.filter(o=>o.id!==guarantee.id);}
 const fresh=pool.filter(o=>o.id.startsWith('move:')&&!g.moves[o.id.split(':')[1]]);if(fresh.length&&g.offers.length<2){const o=fresh[Math.floor(rand(g,'lootRng')*fresh.length)];g.offers.push(o);pool=pool.filter(q=>q.id!==o.id);}
 while(g.offers.length<3&&pool.length)g.offers.push(pool.splice(Math.floor(rand(g,'lootRng')*pool.length),1)[0]);g.phase='upgrade';
}
export function setGoal(g,id){if(!['playing','upgrade','paused'].includes(g.phase)||id!==null&&!Object.hasOwn(FUSIONS,id))return false;if(id&&FUSIONS[id].parts.filter(k=>!g.moves[k]).length>4-Object.keys(g.moves).length)return false;g.goal=id;return true;}
export function grantXp(g,amount){if(!Number.isFinite(amount)||amount<=0||!['playing','upgrade'].includes(g.phase))return false;g.xp+=amount;while(g.level<60&&g.xp>=xpNeeded(g.level)){g.xp-=xpNeeded(g.level);g.level++;g.pendingLevels++;if(g.telemetry.firstLevelAt===null)g.telemetry.firstLevelAt=g.time;}if((g.pendingLevels||g.pendingRewards)&&g.phase==='playing')offer(g);return true;}
export function chooseUpgrade(g,id){
 if(g.phase!=='upgrade'||!g.offers.some(o=>o.id===id)||!eligibleUpgrades(g).some(o=>o.id===id))return false;const [kind,key]=id.split(':');
 if(kind==='move'){if(g.moves[key])g.moves[key].level++;else g.moves[key]={level:1,awake:false,timer:.2};}if(kind==='relic')g.relics.push(key);
 if(kind==='fusion'){g.fusions.push(key);g.cores--;for(const k of FUSIONS[key].parts)g.moves[k].awake=true;proc(g,'fusion:'+key);}if(id==='snack')g.player.hp=Math.min(stats(g).maxHp,g.player.hp+25);
 if(g.pendingRewards>0)g.pendingRewards--;else g.pendingLevels--;g.draft=false;g.notice=(MOVES[key]?.name||RELICS[key]?.name||FUSIONS[key]?.name||'간식')+' 획득!';
 if(g.pendingLevels||g.pendingRewards)offer(g);else{g.offers=[];g.phase='playing';}return true;
}
export function reroll(g){if(g.phase!=='upgrade'||g.rerolls<1||g.draft)return false;g.rerolls--;offer(g);return true;}
export function pause(g){if(!['playing','upgrade'].includes(g.phase))return false;g.returnPhase=g.phase;g.phase='paused';return true;}
export function resume(g){if(g.phase!=='paused')return false;g.phase=g.returnPhase||'playing';g.returnPhase=null;return true;}
export function useUltimate(g){const p=g.player;if(g.phase!=='playing'||p.ultCooldown>0)return false;p.ultCooldown=18;p.invuln=Math.max(p.invuln,1.1);p.action={type:'high',duration:1.1,time:0,facing:p.facing};g.queue.push({kind:'ultimate',at:g.time+butterReleasePoint('high')*1.1,facing:p.facing});if(g.relics.includes('echo'))zone(g,{kind:'decoy',x:p.x,y:p.y,life:2,radius:115,damage:65});g.events.push('charge');return true;}
const ROLES={fan:{hp:21,speed:72,damage:10,xp:2,radius:17},rusher:{hp:36,speed:83,damage:13,xp:3,radius:18},archer:{hp:33,speed:61,damage:11,xp:3,radius:16},caster:{hp:48,speed:54,damage:13,xp:4,radius:19},ghost:{hp:600,speed:70,damage:17,xp:50,radius:38}};
export function spawnEnemy(g,role='fan',options={}){
 if(!ROLES[role])return null;if(g.enemies.filter(live).length>=MAX_ENEMIES){if(role==='ghost'||options.elite||options.treasure){const i=g.enemies.findIndex(e=>!e.boss&&!e.elite&&!e.treasure);if(i<0)return null;delete g.pillowHits[g.enemies[i].id];g.enemies.splice(i,1);}else return null;}
 const d=ROLES[role],a=rand(g)*Math.PI*2,r=options.distance||540+rand(g)*80,p=g.player;let x=options.x,y=options.y;
 if(x==null||y==null){for(let i=0;i<24;i++){const angle=a+i*Math.PI/12;x=clamp(p.x+Math.cos(angle)*r,65,WORLD.width-65);y=clamp(p.y+Math.sin(angle)*r,65,WORLD.height-65);if(dist({x,y},p)>=r*.65&&!blocked(g.world,x,y,d.radius))break;}}
 if(blocked(g.world,x,y,d.radius)){const spot=g.world.points.find(q=>dist(q,p)>260);if(!spot)return null;x=spot.x;y=spot.y;}
 const elite=Boolean(options.elite),final=Boolean(options.final),hp=(final?3000:d.hp*(1+g.time/210)*(elite?3.2:1))*(1+.32*g.tier);
 const e={id:++g.id,role,x,y,hp,maxHp:hp,speed:d.speed*(elite?.95:1)*(final?1.2:1),damage:d.damage*(1+.12*g.tier),xp:d.xp*(elite?5:1),radius:d.radius*(elite?1.25:1)*(final?1.25:1),elite,final,boss:role==='ghost',treasure:Boolean(options.treasure),expires:options.treasure?g.time+45:0,state:'move',timer:.8+rand(g),animation:rand(g),vx:0,vy:0,stun:0,flash:0,dead:false,slowUntil:0,chargedUntil:0,burnUntil:0,bowlingUntil:0,bowlingHits:[],attackCount:0};
 if(e.treasure){e.hp=e.maxHp=90;e.speed=135;e.xp=30;}g.enemies.push(e);return e;
}
function nearest(g,x,y,range=700,exclude=null,cover=false){let best=null,distance=range;for(const e of g.enemies){if(e.dead||e.id===exclude)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<distance&&(!cover||!lineBlocked(g.world,{x,y},e))){best=e;distance=d;}}return best;}
function proc(g,id){g.telemetry.procs[id]=(g.telemetry.procs[id]||0)+1;}
function effect(g,e){if(g.effects.length>=140)g.effects.shift();g.effects.push({age:0,...e});}
function zone(g,z){const nearby=g.zones.find(q=>q.kind===z.kind&&['fire','ice','cloud'].includes(z.kind)&&dist(q,z)<35);if(nearby){nearby.life=Math.max(nearby.life,z.life);return;}if(g.zones.length>=48)g.zones.shift();g.zones.push({id:++g.id,age:0,timer:0,...z});}
function bullet(g,b){if(g.bullets.length<120)g.bullets.push({id:++g.id,life:2.2,radius:7,hits:{},last:null,lock:0,age:0,child:false,...b});}
function hurtPlayer(g,amount,source='접촉'){const p=g.player;if(g.phase!=='playing'||p.invuln>0)return;const damage=Math.min(p.hp,amount);p.hp=Math.max(0,p.hp-amount);p.invuln=.75;g.telemetry.damageTaken+=damage;g.telemetry.lastHit=source;g.events.push('hurt');if(!p.hp){g.phase='dead';g.notice='기억 조각을 가지고 돌아가요. 다른 융합도 실험해 보세요.';}}
function area(g,x,y,radius,damage,source='blast'){for(const e of g.enemies)if(!e.dead&&Math.hypot(e.x-x,e.y-y)<radius+e.radius)hit(g,e,damage,source,0,0,false);effect(g,{kind:'blast',x,y,radius,life:.35});}
function discharge(g,e,damage){e.chargedUntil=0;proc(g,'discharge');area(g,e.x,e.y,85,damage*.65,'discharge');}
function hit(g,e,amount,source='stone',dx=0,dy=0,canProc=true){
 if(e.dead)return;const damage=Math.max(1,Math.round(amount)),actual=Math.min(damage,e.hp);e.hp-=damage;e.flash=.1;e.vx+=dx;e.vy+=dy;g.damageDealt+=actual;g.telemetry.damageBy[source]=(g.telemetry.damageBy[source]||0)+actual;if(g.numbers.length<70)g.numbers.push({x:e.x,y:e.y-32,value:damage,age:0});
 if(e.hp<=0){e.dead=true;g.kills++;delete g.pillowHits[e.id];g.gems.push({id:++g.id,x:e.x,y:e.y,value:e.xp});effect(g,{kind:'defeat',x:e.x,y:e.y,life:.4});
  if(e.elite||e.boss){g.cores++;g.bonusShards++;g.player.hp=Math.min(stats(g).maxHp,g.player.hp+12);g.events.push('kill');g.notice='융합 핵 획득! 두 기술 Lv3을 모아 융합하세요.';if(g.relics.includes('harvest')){for(const b of g.shots)g.gems.push({id:++g.id,x:b.x,y:b.y,value:1});g.shots=[];proc(g,'harvest');}}
  if(e.treasure){g.bonusShards+=3;g.cores++;g.notice='보물 도둑 처치! 기억 조각 +3 · 융합 핵 +1';}
  if(g.moves.bomb?.level>=3&&e.burnUntil>g.time&&source!=='spread'){zone(g,{kind:'fire',x:e.x,y:e.y,radius:70,damage:10,life:2.5,spread:true});proc(g,'wildfire');}if(e.final){g.phase='won';g.won=true;g.notice='탈출 성공! 다음 균열 난이도와 다른 지도가 기다려요.';}return;
 }if(canProc&&e.chargedUntil>g.time&&(source==='chain'||source==='pillow'&&g.fusions.includes('tempest')))discharge(g,e,damage);
}
export function hazardPhase(g,h){const t=(g.time+h.offset)%8;return t<1.2?'warning':t<2.7?'active':'rest';}
export function interaction(g){if(g.phase!=='playing')return null;
 if(g.seals===2&&g.time>=120&&g.time<165&&!g.finalSpawned){const seal=g.world.points.find(q=>q.type==='rift'&&q.state==='done'&&dist(q,g.player)<105);if(seal)return {id:seal.id,type:'summon',label:'수호자 조기 소환 · 처치 성공 시 조각 +3',disabled:false};}
 const p=g.world.points.filter(q=>q.state==='ready'&&dist(q,g.player)<105).sort((a,b)=>dist(a,g.player)-dist(b,g.player))[0];if(!p)return null;const labels={rift:'균열 봉인 시작 · 18초 버티기',chest:'유물 상자 열기 · 하나 선택',spring:'샘물 마시기 · 체력 30 회복',nest:'보물 도둑 깨우기 · 45초 추격',shrine:'체력 20 지불 · 융합 핵 획득'};return {id:p.id,type:p.type,label:labels[p.type],disabled:p.type==='spring'&&g.player.hp>=stats(g).maxHp||p.type==='shrine'&&g.player.hp<=25};}
export function interact(g){
 const info=interaction(g);if(!info||info.disabled)return false;const p=g.world.points.find(q=>q.id===info.id);
 if(info.type==='summon'){const e=spawnEnemy(g,'ghost',{final:true,distance:420});if(!e)return false;g.finalSpawned=true;g.earlySummon=true;g.notice='조기 소환! 덜 완성된 빌드로 처치하면 기억 조각 +3.';return true;}
 if(p.type==='rift'){p.state='active';for(let i=0;i<3;i++)spawnEnemy(g,i===2?'archer':'rusher',{distance:380});g.notice='원 안에서 18초 버티면 봉인! 밖으로 나가면 진행만 멈춰요.';return true;}
 if(p.type==='spring')g.player.hp=Math.min(stats(g).maxHp,g.player.hp+30);if(p.type==='shrine'){g.player.hp-=20;g.telemetry.damageTaken+=20;g.cores++;g.notice='체력을 대가로 융합 핵 획득.';}if(p.type==='chest'){g.pendingRewards++;offer(g);}
 if(p.type==='nest'){const e=spawnEnemy(g,'rusher',{x:p.x+70,y:p.y,treasure:true});if(!e)return false;p.treasureId=e.id;g.notice='보물 도둑이 달아나요! 잡으면 기억 조각과 융합 핵.';}p.state='done';return true;
}
function worldTick(g,dt){for(const p of g.world.points)if(p.type==='rift'&&p.state==='active'&&dist(p,g.player)<p.radius){p.progress=Math.min(18,p.progress+dt);if(p.progress>=18){p.state='done';g.seals++;g.cores++;g.player.hp=Math.min(stats(g).maxHp,g.player.hp+12);g.notice='균열 '+g.seals+'/2 봉인! 융합 핵 · 경험치 획득';grantXp(g,24);}}for(const h of g.world.hazards)if(hazardPhase(g,h)==='active'&&dist(h,g.player)<h.radius&&g.map!=='night')hurtPlayer(g,8,'지형 위험');}
function onReturn(g,b){proc(g,'returnCatch');g.player.ultCooldown=Math.max(0,g.player.ultCooldown-.25);if(g.fusions.includes('firefly')&&!b.child){const target=nearest(g,g.player.x,g.player.y,450);if(target){const a=Math.atan2(target.y-g.player.y,target.x-g.player.x);bullet(g,{kind:'chain',source:'firefly',x:g.player.x,y:g.player.y-20,vx:Math.cos(a)*490,vy:Math.sin(a)*490,speed:490,range:320,target:target.id,bounces:3,damage:22,life:3,child:true});proc(g,'fusion:firefly:trigger');}}}
function releaseShot(g,q){
 const p=g.player,target=nearest(g,p.x,p.y,700,null,true);if(target&&Math.abs(target.x-p.x)>18){q.facing=target.x>p.x?-1:1;p.facing=q.facing;if(p.action?.type===(q.kind==='ultimate'?'high':'normal'))p.action.facing=q.facing;}
 const type=q.kind==='ultimate'?'high':'normal',duration=q.duration||1.1,m=butterMuzzleOffset({size:80,action:{type,time:butterReleasePoint(type)*duration,duration}}),x=p.x+m.x*q.facing,y=p.y+m.y-22.4,angle=target?Math.atan2(target.y-y,target.x-x):q.facing===-1?0:Math.PI;
 if(q.kind==='ultimate'){bullet(g,{kind:'boulder',x,y,vx:Math.cos(angle)*390,vy:Math.sin(angle)*390,radius:32,life:6,damage:75});effect(g,{kind:'muzzle',x,y,life:.2});return;}
 const w=g.moves.stone,d=moveStats('stone',w.level);bullet(g,{kind:'stone',x,y,vx:Math.cos(angle)*d.speed,vy:Math.sin(angle)*d.speed,damage:d.damage,pierce:d.pierce,returning:w.level>=2,mode:'out',turnAt:.48,wallBounces:w.level>=3?2:0,life:w.level>=2?2.8:1.5});effect(g,{kind:'muzzle',x,y,life:.13});g.events.push('shot');
}
function parry(g,b,x,y){b.life=0;b.parried=true;proc(g,'parry');g.relicState.parries++;const target=nearest(g,x,y,650),a=target?Math.atan2(target.y-y,target.x-x):Math.atan2(-b.vy,-b.vx),lightning=g.fusions.includes('tempest');bullet(g,{kind:lightning?'chain':'stone',source:lightning?'tempest':'parry',x,y,vx:Math.cos(a)*490,vy:Math.sin(a)*490,life:3,damage:26,pierce:0,child:true,speed:490,range:350,bounces:3,target:target?.id||-1,explosive:g.fusions.includes('dreamoven')});if(lightning)proc(g,'fusion:tempest:trigger');if(g.relics.includes('mirror')&&g.relicState.parries%3===0)g.player.ultCooldown=Math.max(0,g.player.ultCooldown-4);}
function procOnce(g,id,interval){const key='at:'+id;if((g.telemetry.procs[key]||0)>g.time)return;g.telemetry.procs[key]=g.time+interval;proc(g,id);}
function weapons(g,dt){
 const p=g.player,target=nearest(g,p.x,p.y,700,null,true);if(!p.action&&target&&Math.abs(target.x-p.x)>18)p.facing=target.x>p.x?-1:1;
 for(const [id,w]of Object.entries(g.moves)){
  const d=moveStats(id,w.level);w.timer-=dt;
  if(id==='pillow'){for(let i=0;i<d.count;i++){const a=g.time*2.1+i*Math.PI*2/d.count,x=p.x+Math.cos(a)*d.radius,y=p.y+Math.sin(a)*d.radius;
    if(g.fusions.includes('dreamoven')&&g.zones.some(z=>z.kind==='fire'&&Math.hypot(z.x-x,z.y-y)<z.radius)){g.pillowHeat=g.time+6;procOnce(g,'fusion:dreamoven:trigger',2);}if(g.pillowHeat>g.time&&w.timer<=0)zone(g,{kind:'fire',x,y,radius:32,damage:12,life:1.1});
    if(w.level>=2)for(const b of g.shots)if(!b.parried&&b.life>0&&Math.hypot(b.x-x,b.y-y)<29)parry(g,b,x,y);
    for(const e of g.enemies)if(!e.dead&&(g.pillowHits[e.id]||0)<=g.time&&Math.hypot(e.x-x,e.y-y)<e.radius+25){g.pillowHits[e.id]=g.time+d.cooldown;const angle=Math.atan2(e.y-p.y,e.x-p.x);hit(g,e,d.damage,'pillow',Math.cos(angle)*210,Math.sin(angle)*210);if(g.pillowHeat>g.time){e.burnUntil=g.time+2;area(g,e.x,e.y,60,12,'ovenTouch');proc(g,'ovenTouch');}if(w.level>=3){e.bowlingUntil=g.time+.8;e.bowlingHits=[];}}
   }if(w.timer<=0)w.timer=.3;continue;}
  if(w.timer>0||!target)continue;w.timer=d.cooldown;
  if(id==='stone'){if(p.action?.type==='high'){w.timer=.15;continue;}const duration=.48;p.action={type:'normal',time:0,duration,facing:p.facing};g.queue.push({kind:id,at:g.time+butterReleasePoint('normal')*duration,duration,facing:p.facing});}
  if(id==='chain'){const a=Math.atan2(target.y-p.y,target.x-p.x);bullet(g,{kind:'chain',x:p.x,y:p.y-20,vx:Math.cos(a)*d.speed,vy:Math.sin(a)*d.speed,damage:d.damage,bounces:d.bounces,life:5,speed:d.speed,range:330,target:target.id});}
  if(id==='storm'){const targets=g.enemies.filter(e=>!e.dead&&dist(e,p)<600).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,d.count);for(const e of targets){hit(g,e,d.damage,'storm');e.stun=.3;if(w.level>=2)e.chargedUntil=g.time+3;if(w.level>=3)zone(g,{kind:'cloud',x:e.x,y:e.y,radius:53,damage:12,life:2.2});effect(g,{kind:'bolt',x:e.x,y:e.y,life:.3});}}
  if(id==='bomb')bullet(g,{kind:'bomb',x:p.x,y:p.y-20,tx:target.x,ty:target.y,vx:0,vy:0,life:.7,age:0,radius:d.radius,damage:d.damage});
 }
}
function enemyShot(g,x,y,a,speed,damage){if(g.shots.length<80)g.shots.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:4,damage,radius:8,parried:false});}
function enemyTick(g,dt){
 const p=g.player,decoy=g.zones.find(z=>z.kind==='decoy');for(const e of g.enemies){if(e.dead)continue;e.animation+=dt;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun)continue;e.timer-=dt;
  if(e.treasure){if(g.time>=e.expires){e.dead=true;g.notice='보물 도둑이 달아났어요.';continue;}const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;steer(g.world,e,{x:e.x+dx/d*100,y:e.y+dy/d*100},dt,e.speed);continue;}
  const target=decoy||p,dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1;
  if(e.state==='windup'&&e.timer<=0){if(e.role==='rusher'){e.state='charge';e.timer=.4;}else{
    if(e.role==='archer')enemyShot(g,e.x,e.y,Math.atan2(e.aimY-e.y,e.aimX-e.x),245,e.damage);
    if(e.role==='caster')zone(g,{kind:'danger',x:e.aimX,y:e.aimY,radius:70,life:.15,damage:e.damage});
    if(e.role==='ghost'){e.attackCount++;const aimed=e.final&&e.hp<e.maxHp*.5&&e.attackCount%2===0,a=Math.atan2(e.aimY-e.y,e.aimX-e.x);for(let i=0;i<(aimed?5:10);i++)enemyShot(g,e.x,e.y,aimed?a+(i-2)*.21:i*Math.PI/5+e.attackCount*.19,aimed?235:165,e.damage);if(e.final)zone(g,{kind:'warning',x:e.aimX,y:e.aimY,radius:80,life:1,damage:e.damage});}e.state='recover';e.timer=e.boss?1:.7;
   }}else if(e.state==='charge'){moveBody(g.world,e,e.aimX*340*dt,e.aimY*340*dt,e.radius*.7);if(e.timer<=0){e.state='recover';e.timer=.8;}}
  else if(e.state==='recover'){if(e.timer<=0){e.state='move';e.timer=e.boss?1.6:.9;}}
  else if(e.state!=='windup'){const canTell=(e.role==='archer'&&d<460||e.role==='caster'&&d<470||e.role==='ghost'||e.role==='rusher'&&d<310)&&e.timer<=0&&!lineBlocked(g.world,e,target,2);if(canTell){e.state='windup';e.timer=e.role==='caster'?1:e.role==='rusher'?.7:.9;e.aimX=e.role==='rusher'?dx/d:target.x;e.aimY=e.role==='rusher'?dy/d:target.y;}else{let speed=e.speed*(e.slowUntil>g.time?(e.boss?.75:.5):1);if(g.map==='night'&&g.world.hazards.some(h=>hazardPhase(g,h)==='active'&&dist(h,e)<h.radius))speed*=.6;steer(g.world,e,e.role==='archer'&&d<200?{x:e.x-dx,y:e.y-dy}:target,dt,speed);}}
  moveBody(g.world,e,e.vx*dt,e.vy*dt,e.radius*.65);e.vx*=Math.exp(-8*dt);e.vy*=Math.exp(-8*dt);
  if(e.bowlingUntil>g.time)for(const other of g.enemies)if(other!==e&&!other.dead&&!e.bowlingHits.includes(other.id)&&dist(e,other)<e.radius+other.radius){e.bowlingHits.push(other.id);hit(g,other,20,'bowling',e.vx*.4,e.vy*.4,false);proc(g,'bowling');if(e.bowlingHits.length>=3)break;}
  if(dist(p,e)<e.radius+13)hurtPlayer(g,e.damage,e.role+' 접촉');
 }
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
function turnHome(g,b){b.mode='back';b.hits={};b.lock=.06;}
function projectiles(g,dt){
 for(let bi=0;bi<g.bullets.length;bi++){
  const b=g.bullets[bi];b.life-=dt;b.age+=dt;b.lock=Math.max(0,b.lock-dt);const old={x:b.x,y:b.y};
  if(b.kind==='bomb'){b.x+=(b.tx-b.x)*Math.min(1,dt*10);b.y+=(b.ty-b.y)*Math.min(1,dt*10);if(b.life<=0){area(g,b.x,b.y,b.radius,b.damage,'bomb');if(g.moves.bomb?.level>=2)zone(g,{kind:'fire',x:b.x,y:b.y,radius:70,damage:12,life:3.2});}continue;}
  if(b.returning){if(b.mode==='out'&&b.age>b.turnAt)turnHome(g,b);if(b.mode==='back'){const catcher={x:g.player.x,y:g.player.y-50},d=dist(b,catcher);if(d<20){b.life=0;onReturn(g,b);continue;}b.vx=(catcher.x-b.x)/d*570;b.vy=(catcher.y-b.y)/d*570;}}
  if(b.kind==='chain'){const target=g.enemies.find(e=>!e.dead&&e.id===b.target);if(target){const a=Math.atan2(target.y-b.y,target.x-b.x);b.vx=Math.cos(a)*b.speed;b.vy=Math.sin(a)*b.speed;}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;if(blocked(g.world,b.x,b.y,b.radius)&&!blocked(g.world,old.x,old.y,b.radius)){if(b.kind==='boulder'||b.wallBounces>0){if(blocked(g.world,b.x,old.y,b.radius))b.vx*=-1;else b.vy*=-1;b.x=old.x;b.y=old.y;if(b.kind!=='boulder')b.wallBounces--;}else if(b.returning&&b.mode==='out'){b.x=old.x;b.y=old.y;turnHome(g,b);}else b.life=0;}if(b.x<0||b.x>WORLD.width||b.y<0||b.y>WORLD.height)b.life=0;
  if(b.returning&&g.fusions.includes('popcorn'))for(const z of g.zones)if(z.kind==='fire'&&dist(z,b)<z.radius&&!b.ignited){b.ignited=true;proc(g,'fusion:popcorn:ignite');}
  for(const e of g.enemies){
   if(e.dead||b.life<=0||b.lock>0||b.kind==='chain'&&e.id===b.last||b.kind!=='chain'&&(b.hits[e.id]||0)>g.time||segmentDistance(e.x,e.y,old,b)>e.radius+b.radius)continue;
   const source=b.source||b.kind,a=Math.atan2(b.vy,b.vx);hit(g,e,b.damage,source,Math.cos(a)*55,Math.sin(a)*55);effect(g,{kind:'hit',x:e.x,y:e.y,life:.18});if(b.ignited||b.explosive){b.ignited=false;b.explosive=false;area(g,e.x,e.y,88,28,'fusionBlast');proc(g,'fusion:explosion');}
   if(b.kind==='chain'){
    if(g.moves.chain?.level>=2)e.slowUntil=g.time+2;
    if(g.fusions.includes('thunderweb')&&b.lastPoint){zone(g,{kind:'web',x:b.lastPoint.x,y:b.lastPoint.y,x2:e.x,y2:e.y,radius:16,damage:17,life:1.5});proc(g,'fusion:thunderweb:trigger');}
    if(e.dead&&g.moves.chain?.level>=3&&!b.child){const target=nearest(g,e.x,e.y,330,e.id);if(target){const angle=Math.atan2(target.y-e.y,target.x-e.x);bullet(g,{kind:'chain',source:'seed',x:e.x,y:e.y,vx:Math.cos(angle)*490,vy:Math.sin(angle)*490,speed:490,range:330,target:target.id,bounces:2,damage:18,life:2,child:true});proc(g,'chainSeed');}}
    b.last=e.id;b.lastPoint={x:e.x,y:e.y};b.bounces--;const next=nearest(g,e.x,e.y,b.range,e.id,true);if(b.bounces<=0||!next){b.life=0;break;}b.target=next.id;b.lock=.085;b.x=e.x;b.y=e.y;break;
   }
   b.hits[e.id]=b.kind==='boulder'?g.time+.45:1e9;
   if(b.kind==='stone'&&!b.child&&g.moves.stone.level>=3&&!b.fragmented){b.fragmented=true;for(const offset of [-.65,.65])bullet(g,{kind:'stone',source:'fragment',x:e.x,y:e.y,vx:Math.cos(a+offset)*440,vy:Math.sin(a+offset)*440,damage:10,pierce:0,life:.5,child:true,hits:{[e.id]:1e9}});if(g.fusions.includes('popcorn'))zone(g,{kind:'fire',x:e.x,y:e.y,radius:40,damage:9,life:1.8});proc(g,'fracture');}
   if(b.kind==='boulder'||b.returning)continue;if(b.pierce>0)b.pierce--;else b.life=0;
  }
 }
 g.bullets=g.bullets.filter(b=>b.life>0);
 for(const b of g.shots){if(b.life<=0)continue;const old={x:b.x,y:b.y};b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(blocked(g.world,b.x,b.y,3)&&!blocked(g.world,old.x,old.y,3))b.life=0;if(b.life>0&&segmentDistance(g.player.x,g.player.y,old,b)<b.radius+13){hurtPlayer(g,b.damage,'적 탄환');b.life=0;}}g.shots=g.shots.filter(b=>b.life>0&&!b.parried);
}
function zonesTick(g,dt){
 const expired=[];for(const z of g.zones){z.age+=dt;z.life-=dt;z.timer-=dt;
  if(z.kind==='warning'){if(z.life<=0)expired.push({...z,kind:'danger',life:.15});continue;}if(z.kind==='danger'){if(dist(z,g.player)<z.radius)hurtPlayer(g,z.damage,'예고 폭발');continue;}
  if(z.kind==='decoy'){if(z.life<=0)area(g,z.x,z.y,z.radius,z.damage,'decoy');continue;}
  if(z.kind==='mine'){if(z.age>1&&g.enemies.some(e=>!e.dead&&dist(e,z)<45)){area(g,z.x,z.y,85,33,'mine');z.life=0;proc(g,'mine');}continue;}
  if(z.kind==='vortex'){for(const e of g.enemies)if(!e.dead&&dist(e,z)<150){const d=dist(e,z)||1;moveBody(g.world,e,(z.x-e.x)/d*130*dt,(z.y-e.y)/d*130*dt,e.radius*.7);}if(z.life<=0)area(g,z.x,z.y,150,34,'vortex');continue;}
  if(z.kind==='ice'){for(const e of g.enemies)if(!e.dead&&dist(e,z)<z.radius)e.slowUntil=g.time+.3;continue;}
  if(z.timer<=0){z.timer=.5;for(const e of g.enemies){if(e.dead)continue;const inside=z.kind==='web'?segmentDistance(e.x,e.y,z,{x:z.x2,y:z.y2})<z.radius+e.radius:dist(e,z)<z.radius+e.radius;if(!inside)continue;if(z.kind==='fire'){e.burnUntil=g.time+1;e.slowUntil=g.time+.6;}if(z.kind==='web')e.stun=.15;hit(g,e,z.damage,z.spread?'spread':z.kind,0,0,false);}}
 }g.zones=g.zones.filter(z=>z.life>0);for(const z of expired)zone(g,z);
}
function pickups(g,dt){
 for(const gem of g.gems){const d=dist(gem,g.player);if(d<stats(g).magnet){const f=Math.min(1,dt*650/(d||1));gem.x+=(g.player.x-gem.x)*f;gem.y+=(g.player.y-gem.y)*f;}if(dist(gem,g.player)<19){grantXp(g,gem.value);gem.taken=true;g.relicState.pickups++;if(g.relics.includes('hoarder')&&g.relicState.pickups%10===0){zone(g,{kind:'vortex',x:g.player.x,y:g.player.y,radius:150,damage:34,life:1.3});proc(g,'hoarder');}}}
 g.gems=g.gems.filter(j=>!j.taken);if(g.gems.length>350){const spill=g.gems.splice(0,g.gems.length-300);g.gems.push({id:++g.id,x:spill[0].x,y:spill[0].y,value:spill.reduce((s,j)=>s+j.value,0)});}
}
function director(g,dt){
 g.spawnTimer-=dt;if(g.spawnTimer<=0){g.spawnTimer=g.finalSpawned?.85:Math.max(.29,.88-g.time/340)/(1+.1*g.tier);const roll=rand(g),role=g.time>70&&roll>.82?'caster':g.time>30&&roll>.62?'archer':roll>.48?'rusher':'fan';spawnEnemy(g,role);}
 if(g.time>=g.burstAt&&!g.finalSpawned){for(let i=0;i<3+g.tier;i++)spawnEnemy(g,i%2?'rusher':'fan',{distance:480});g.burstAt+=35;g.notice='포위 무리 접근! 빈 방향으로 빠져나가세요.';}
 if(g.time>=g.eliteAt&&g.eliteAt<FINAL_AT){spawnEnemy(g,'rusher',{elite:true});g.eliteAt+=65;g.notice='정예 출현 · 융합 핵을 노릴 기회!';}
 if(!g.championSpawned&&g.time>=100){spawnEnemy(g,'ghost',{distance:450});g.championSpawned=true;}if(!g.finalSpawned&&g.time>=FINAL_AT&&g.seals>=2){const e=spawnEnemy(g,'ghost',{final:true,distance:420});if(e){g.finalSpawned=true;g.notice='두 균열이 닫혔어요. 최종 수호자를 쓰러뜨리고 탈출!';}}
}
function sample(g){g.telemetry.samples.push({time:Math.round(g.time),level:g.level,hp:Math.round(g.player.hp),kills:g.kills,damageTaken:Math.round(g.telemetry.damageTaken),enemies:g.enemies.filter(live).length,seals:g.seals,fusions:[...g.fusions]});if(g.telemetry.samples.length>30)g.telemetry.samples.shift();g.telemetry.nextSample+=30;}
function step(g,dt,input){
 const p=g.player,s=stats(g);g.time+=dt;p.invuln=Math.max(0,p.invuln-dt);p.ultCooldown=Math.max(0,p.ultCooldown-dt);if(p.action){p.action.time+=dt;if(p.action.time>=p.action.duration)p.action=null;}
 let dx=Number.isFinite(input.x)?clamp(input.x,-1,1):0,dy=Number.isFinite(input.y)?clamp(input.y,-1,1):0,l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}const old={x:p.x,y:p.y};let speed=s.speed;if(g.map==='night'&&g.world.hazards.some(h=>hazardPhase(g,h)==='active'&&dist(h,p)<h.radius))speed*=.65;
 moveBody(g.world,p,dx*speed*dt,dy*speed*dt,14);const moved=dist(old,p);advanceButterGait(p.gait,moved,dx,dy,dt);g.telemetry.distance+=moved;g.relicState.distance+=moved;g.relicState.still=moved<.01?g.relicState.still+dt:0;
 if(!nearest(g,p.x,p.y)&&Math.abs(dx)>.1&&!p.action)p.facing=dx>0?-1:1;
 if(g.relics.includes('comet')&&g.relicState.distance>=150){g.relicState.distance-=150;zone(g,{kind:'mine',x:p.x,y:p.y,radius:45,damage:33,life:4});}if(g.relics.includes('frost')&&g.relicState.still>=.7&&g.relicState.frostAt<=g.time){zone(g,{kind:'ice',x:p.x,y:p.y,radius:100,damage:0,life:2.5});g.relicState.frostAt=g.time+3;proc(g,'frost');}
 director(g,dt);worldTick(g,dt);if(g.phase!=='playing')return;enemyTick(g,dt);if(g.phase!=='playing')return;weapons(g,dt);for(const q of g.queue)if(q.at<=g.time){releaseShot(g,q);q.done=true;}g.queue=g.queue.filter(q=>!q.done);projectiles(g,dt);zonesTick(g,dt);g.enemies=g.enemies.filter(live);if(g.phase==='playing')pickups(g,dt);
 for(const e of g.effects)e.age+=dt;g.effects=g.effects.filter(e=>e.age<e.life);for(const n of g.numbers)n.age+=dt;g.numbers=g.numbers.filter(n=>n.age<.6);if(g.time>=g.telemetry.nextSample)sample(g);
}
export function tick(g,dt,input={}){if(g.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;g.events=[];const total=Math.min(dt,.15),steps=Math.ceil(total/(1/90));for(let i=0;i<steps&&g.phase==='playing';i++)step(g,total/steps,input);}
