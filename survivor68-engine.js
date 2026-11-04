// A fresh real-time survivor. Card/turn rules intentionally stay in cards67.html.
import {advanceButterGait,butterReleasePoint,butterMuzzleOffset} from './butter-original-motion.js';
export const WORLD={width:2600,height:2000},FINAL_AT=240,MAX_ENEMIES=170;
export const MOVES={
 stone:{name:'버터의 새총',icon:'◈',color:'#e6bd75',hint:'가까운 적을 자동 사격. 강화하면 여러 발과 관통이 생겨요.',awake:'난사 새총',awakeHint:'세 갈래 관통 사격으로 변화'},
 chain:{name:'말썽 유도탄',icon:'✦',color:'#a5d4bb',hint:'적 사이를 추적하며 튕겨요. 직전에 맞은 적만 제외해 재타격 가능.',awake:'끝없는 말썽',awakeHint:'더 먼 적까지 8회 추적·재타격'},
 pillow:{name:'베개 호위',icon:'☁',color:'#e3a9c2',hint:'주위를 도는 베개가 가까운 적을 밀쳐요.',awake:'잠꾸러기의 영역',awakeHint:'베개 4개와 넓은 호위 반경'},
 storm:{name:'날씨는 맑음',icon:'ϟ',color:'#a9c9eb',hint:'주변 적에게 번개를 내려 짧게 기절시켜요.',awake:'쏟아지는 번개',awakeHint:'한 번에 6개 표적을 강타'},
 bomb:{name:'별사탕 폭탄',icon:'✺',color:'#e7a689',hint:'적 무리에 폭탄을 던져 범위 피해를 줘요.',awake:'와르르 별사탕',awakeHint:'폭발 범위 증가·연쇄 폭발'}
};
export const PASSIVES={
 power:{name:'달콤한 간식',icon:'◆',hint:'모든 공격력 +15%',max:5},
 haste:{name:'새 고무줄',icon:'↗',hint:'모든 자동 공격 속도 +12%',max:5},
 speed:{name:'씽씽 실내화',icon:'»',hint:'이동 속도 +8%',max:5},
 heart:{name:'급식 우유',icon:'♥',hint:'최대 체력 +20 · 체력 20 회복',max:5},
 magnet:{name:'커다란 주머니',icon:'◎',hint:'경험치 흡수 반경 +35',max:5},
 lower:{name:'저학년 참고서',icon:'Ⅰ',hint:'유도탄 튕김 +1 · 유도탄이 없다면 먼저 습득해요',max:5},
 upper:{name:'고학년 참고서',icon:'Ⅱ',hint:'왕새총 피해 +30% · 재사용 시간 감소',max:5}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function seedNumber(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rand(g,key='spawnRng'){let t=g[key]+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);g[key]>>>=0;return ((t^t>>>14)>>>0)/4294967296;}
export const xpNeeded=level=>8+(level-1)*5+Math.floor((level-1)**1.18);
export function stats(g){const p=g.passives;return {damage:1+.15*p.power,rate:1+.12*p.haste,speed:218*(1+.08*p.speed),maxHp:100+20*p.heart,magnet:95+35*p.magnet,ultimateCooldown:Math.max(8,18-1.7*p.upper)};}
export function createGame(seed=Date.now()){
 const label=String(seed).trim().slice(0,48)||'BUTTER';return {version:68,seed:label,phase:'playing',returnPhase:null,time:0,level:1,xp:0,pendingLevels:0,offers:[],kills:0,damageDealt:0,cores:0,won:false,spawnRng:seedNumber(label+':spawn'),lootRng:seedNumber(label+':loot'),id:0,
 player:{x:1300,y:1000,hp:100,facing:-1,invuln:0,ultCooldown:0,action:null,gait:{phase:0,amount:0,clock:0}},
 moves:{stone:{level:1,awake:false,timer:.1}},passives:Object.fromEntries(Object.keys(PASSIVES).map(k=>[k,0])),enemies:[],bullets:[],shots:[],gems:[],effects:[],numbers:[],queue:[],pillowHits:{},spawnTimer:1,eliteAt:45,championSpawned:false,finalSpawned:false,notice:'이동만 하면 새총은 자동! 경험치를 주워 기술을 키워요.',events:[]};
}
export function moveStats(id,level=1,awake=false){return {
 stone:{damage:14+8*(level-1),cooldown:.68-.035*(level-1),count:awake?3:level>=3?2:1,pierce:awake?3:level>=4?1:0,speed:600},
 chain:{damage:17+7*(level-1),cooldown:2.2-.15*(level-1),bounces:(awake?8:2+level),speed:480},
 pillow:{damage:10+5*(level-1),cooldown:.55,count:awake?4:level>=3?2:1,radius:awake?117:85+4*level},
 storm:{damage:25+13*(level-1),cooldown:3.3-.2*(level-1),count:awake?6:1+Math.floor(level/2)},
 bomb:{damage:25+14*(level-1),cooldown:3-.15*(level-1),radius:awake?150:85+8*level}
}[id];}
export function eligibleUpgrades(g){
 const out=[];for(const [id,d]of Object.entries(MOVES)){const owned=g.moves[id];if(!owned&&Object.keys(g.moves).length<4)out.push({id:'move:'+id,name:d.name,icon:d.icon,text:d.hint,tag:'새 기술 · '+(Object.keys(g.moves).length+1)+'/4칸'});else if(owned?.level<5)out.push({id:'move:'+id,name:d.name,icon:d.icon,text:moveUpgradeText(id,owned),tag:'Lv'+owned.level+' → '+(owned.level+1)});else if(owned&&!owned.awake&&g.cores>0)out.push({id:'awake:'+id,name:d.awake,icon:d.icon,text:d.awakeHint,tag:'각성 · 핵 1개 사용'});}
 for(const [id,d]of Object.entries(PASSIVES))if(g.passives[id]<d.max&&!(id==='lower'&&!g.moves.chain&&Object.keys(g.moves).length>=4))out.push({id:'passive:'+id,name:d.name,icon:d.icon,text:d.hint,tag:'성장 '+g.passives[id]+' → '+(g.passives[id]+1)});
 if(!out.length)out.push({id:'snack',name:'따뜻한 간식',icon:'♥',text:'체력 25 회복',tag:'완성된 빌드'});
 return out;
}
function moveUpgradeText(id,owned){const a=moveStats(id,owned.level,owned.awake),b=moveStats(id,owned.level+1,owned.awake);return '피해 '+a.damage+' → '+b.damage+(b.count>a.count?' · 발사/호위 수 '+a.count+' → '+b.count:'')+(b.pierce>a.pierce?' · 관통 +1':'')+(id==='chain'?' · 튕김 '+a.bounces+' → '+b.bounces:'')+(id==='bomb'?' · 폭발 반경 '+a.radius+' → '+b.radius:'');}
function offer(g){const pool=eligibleUpgrades(g),existing=pool.filter(o=>o.id.startsWith('awake:')||o.id.startsWith('move:')&&g.moves[o.id.split(':')[1]]);g.offers=[];if(existing.length){const next=existing[Math.floor(rand(g,'lootRng')*existing.length)];g.offers.push(next);pool.splice(pool.indexOf(next),1);}while(g.offers.length<3&&pool.length)g.offers.push(pool.splice(Math.floor(rand(g,'lootRng')*pool.length),1)[0]);g.phase='upgrade';}
export function grantXp(g,amount){if(!Number.isFinite(amount)||amount<=0||!['playing','upgrade'].includes(g.phase))return false;g.xp+=amount;while(g.level<80&&g.xp>=xpNeeded(g.level)){g.xp-=xpNeeded(g.level);g.level++;g.pendingLevels++;}if(g.pendingLevels&&g.phase==='playing')offer(g);return true;}
export function chooseUpgrade(g,id){
 if(g.phase!=='upgrade'||!g.offers.some(o=>o.id===id)||!eligibleUpgrades(g).some(o=>o.id===id))return false;
 const [kind,key]=id.split(':');if(kind==='move'){if(g.moves[key])g.moves[key].level++;else g.moves[key]={level:1,awake:false,timer:.2};}
 if(kind==='awake'){g.moves[key].awake=true;g.cores--;}
 if(kind==='passive'){g.passives[key]++;if(key==='heart')g.player.hp=Math.min(stats(g).maxHp,g.player.hp+20);if(key==='lower'&&!g.moves.chain)g.moves.chain={level:1,awake:false,timer:.2};}
 if(id==='snack')g.player.hp=Math.min(stats(g).maxHp,g.player.hp+25);
 g.pendingLevels--;g.notice=(MOVES[key]?.name||PASSIVES[key]?.name||'간식')+' 성장!';if(g.pendingLevels>0)offer(g);else{g.offers=[];g.phase='playing';}return true;
}
export function pause(g){if(!['playing','upgrade'].includes(g.phase))return false;g.returnPhase=g.phase;g.phase='paused';return true;}
export function resume(g){if(g.phase!=='paused')return false;g.phase=g.returnPhase||'playing';g.returnPhase=null;return true;}
export function useUltimate(g){if(g.phase!=='playing'||g.player.ultCooldown>0)return false;const p=g.player;p.ultCooldown=stats(g).ultimateCooldown;p.invuln=Math.max(p.invuln,1.1);p.action={type:'high',duration:1.1,time:0,facing:p.facing};g.queue.push({kind:'ultimate',at:g.time+butterReleasePoint('high')*1.1,facing:p.facing});g.events.push('boulder');return true;}
const ROLES={fan:{hp:18,speed:62,damage:9,xp:2,radius:17},rusher:{hp:32,speed:78,damage:12,xp:3,radius:18},archer:{hp:27,speed:58,damage:10,xp:3,radius:16},caster:{hp:45,speed:49,damage:12,xp:4,radius:19},ghost:{hp:480,speed:46,damage:16,xp:45,radius:38}};
export function spawnEnemy(g,role='fan',options={}){
 if(!ROLES[role])return null;if(g.enemies.length>=MAX_ENEMIES){if(role==='ghost'||options.elite){const index=g.enemies.findIndex(e=>!e.boss&&!e.elite);if(index<0)return null;delete g.pillowHits[g.enemies[index].id];g.enemies.splice(index,1);}else return null;}const d=ROLES[role],a=rand(g)*Math.PI*2,r=options.distance||520+rand(g)*100,p=g.player,elite=Boolean(options.elite),final=Boolean(options.final);
 let sx=clamp(options.x??p.x+Math.cos(a)*r,55,WORLD.width-55),sy=clamp(options.y??p.y+Math.sin(a)*r,55,WORLD.height-55);
 // Clamping an outside ring onto a corner must never spawn a mob on the player.
 // Rotate deterministically, without consuming extra spawn/loot randomness.
 if(options.x==null&&options.y==null&&Math.hypot(sx-p.x,sy-p.y)<r*.7){for(let i=1;i<=12;i++){const angle=a+i*Math.PI/6;sx=clamp(p.x+Math.cos(angle)*r,55,WORLD.width-55);sy=clamp(p.y+Math.sin(angle)*r,55,WORLD.height-55);if(Math.hypot(sx-p.x,sy-p.y)>=r*.7)break;}}
 const e={id:++g.id,role,x:sx,y:sy,hp:d.hp*(1+g.time/180)*(elite?4:1)*(final?5:1),maxHp:0,speed:d.speed*(elite?.85:1),damage:d.damage,xp:d.xp*(elite?6:1),radius:d.radius*(elite?1.3:1)*(final?1.3:1),elite,final,boss:role==='ghost',state:'move',timer:1+rand(g),animation:rand(g),vx:0,vy:0,stun:0,flash:0,dead:false};e.maxHp=e.hp;g.enemies.push(e);return e;
}
function nearest(g,x,y,range=700,exclude=null){let best=null,distance=range;for(const e of g.enemies){if(e.dead||e.id===exclude)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<distance){best=e;distance=d;}}return best;}
function effect(g,e){if(g.effects.length>=140)g.effects.shift();g.effects.push({age:0,...e});}
function hurtPlayer(g,damage){const p=g.player;if(g.phase!=='playing'||p.invuln>0)return;p.hp=Math.max(0,p.hp-damage);p.invuln=.75;g.events.push('hurt');if(!p.hp){g.phase='dead';g.notice='이번 탐사는 여기까지. 다음에는 다른 기술 조합으로!';}}
function hit(g,e,amount,dx=0,dy=0){if(e.dead)return;const damage=Math.round(amount);e.hp-=damage;e.flash=.12;e.vx+=dx;e.vy+=dy;g.damageDealt+=Math.min(damage,e.hp+damage);if(g.numbers.length<90)g.numbers.push({x:e.x,y:e.y-32,value:damage,age:0});
 if(e.hp<=0){e.dead=true;g.kills++;delete g.pillowHits[e.id];g.gems.push({id:++g.id,x:e.x,y:e.y,value:e.xp});effect(g,{kind:'defeat',x:e.x,y:e.y,role:e.role,life:.4});if(e.elite||e.boss){g.cores++;g.notice='각성 핵 획득! Lv5 기술을 레벨업 선택에서 각성할 수 있어요.';g.events.push('kill');g.player.hp=Math.min(stats(g).maxHp,g.player.hp+15);}if(e.final){g.phase='won';g.won=true;g.notice='이불령을 물리치고 아공간 탈출!';}}
}
function bullet(g,data){if(g.bullets.length<100)g.bullets.push({id:++g.id,life:2.2,radius:7,hits:{},last:null,lock:0,...data});}
function releaseShot(g,q){const p=g.player,s=stats(g),owned=g.moves[q.kind],target=nearest(g,p.x,p.y);
 if(target&&Math.abs(target.x-p.x)>18){q.facing=target.x>p.x?-1:1;p.facing=q.facing;if(p.action?.type===(q.kind==='ultimate'?'high':'normal'))p.action.facing=q.facing;}
 const m=butterMuzzleOffset({size:80,action:{type:q.kind==='ultimate'?'high':'normal',time:q.kind==='ultimate'?butterReleasePoint('high')*1.1:butterReleasePoint('normal')*q.duration,duration:q.kind==='ultimate'?1.1:q.duration}}),x=p.x+m.x*q.facing,y=p.y+m.y-22.4;
 const angle=target?Math.atan2(target.y-y,target.x-x):q.facing===-1?0:Math.PI;
 if(q.kind==='ultimate'){bullet(g,{kind:'boulder',x,y,vx:Math.cos(angle)*370,vy:Math.sin(angle)*370,radius:32,life:6,damage:65*s.damage*(1+.3*g.passives.upper)});effect(g,{kind:'muzzle',x,y,life:.2});return;}
 if(!owned)return;const d=moveStats(q.kind,owned.level,owned.awake);
 for(let i=0;i<d.count;i++){const a=angle+(i-(d.count-1)/2)*.15;bullet(g,{kind:'stone',x,y,vx:Math.cos(a)*d.speed,vy:Math.sin(a)*d.speed,damage:d.damage*s.damage,pierce:d.pierce});}effect(g,{kind:'muzzle',x,y,life:.13});g.events.push('shot');
}
function weapons(g,dt){const p=g.player,s=stats(g),target=nearest(g,p.x,p.y);if(!p.action&&target&&Math.abs(target.x-p.x)>18)p.facing=target.x>p.x?-1:1;
 for(const [id,w]of Object.entries(g.moves)){const d=moveStats(id,w.level,w.awake);w.timer-=dt*s.rate;if(id==='pillow'){for(let i=0;i<d.count;i++){const a=g.time*2.1+i*Math.PI*2/d.count,x=p.x+Math.cos(a)*d.radius,y=p.y+Math.sin(a)*d.radius;for(const e of g.enemies)if(!e.dead&&(g.pillowHits[e.id]||0)<=g.time&&Math.hypot(e.x-x,e.y-y)<e.radius+25){g.pillowHits[e.id]=g.time+d.cooldown;const angle=Math.atan2(e.y-p.y,e.x-p.x);hit(g,e,d.damage*s.damage,Math.cos(angle)*180,Math.sin(angle)*180);}}continue;}
  if(w.timer>0||!target)continue;w.timer=d.cooldown;
  if(id==='stone'){const duration=Math.min(.48,d.cooldown/s.rate);if(!p.action)p.action={type:'normal',time:0,duration,facing:p.facing};g.queue.push({kind:id,at:g.time+butterReleasePoint('normal')*duration,duration,facing:p.action?.facing??p.facing});}
  if(id==='chain'){const a=Math.atan2(target.y-p.y,target.x-p.x);bullet(g,{kind:'chain',x:p.x,y:p.y-20,vx:Math.cos(a)*d.speed,vy:Math.sin(a)*d.speed,damage:d.damage*s.damage,bounces:d.bounces+g.passives.lower,life:5,speed:d.speed,range:w.awake?460:300,target:target.id});}
  if(id==='storm'){const targets=g.enemies.filter(e=>!e.dead&&dist(e,p)<650).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,d.count);for(const e of targets){hit(g,e,d.damage*s.damage);e.stun=.3;effect(g,{kind:'bolt',x:e.x,y:e.y,life:.3});}}
  if(id==='bomb'){bullet(g,{kind:'bomb',x:p.x,y:p.y-20,tx:target.x,ty:target.y,vx:0,vy:0,life:.7,age:0,radius:d.radius,damage:d.damage*s.damage,awake:w.awake});}
 }
}
function enemies(g,dt){const p=g.player;for(const e of g.enemies){if(e.dead)continue;e.animation+=dt;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun)continue;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;e.timer-=dt;
  if(e.state==='windup'){
   if(e.timer<=0){if(e.role==='rusher'){e.state='charge';e.timer=.42;}
    else if(e.role==='archer'){if(g.shots.length<80){const a=Math.atan2(e.aimY-e.y,e.aimX-e.x);g.shots.push({x:e.x,y:e.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,life:4,damage:e.damage,radius:8});}e.state='recover';e.timer=.75;}
    else if(e.role==='caster'){effect(g,{kind:'blast',x:e.aimX,y:e.aimY,radius:72,life:.3});if(Math.hypot(p.x-e.aimX,p.y-e.aimY)<72)hurtPlayer(g,e.damage);e.state='recover';e.timer=1;}
    else if(e.role==='ghost'){for(let i=0;i<10;i++){const a=i*Math.PI/5;if(g.shots.length<80)g.shots.push({x:e.x,y:e.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,life:4,damage:e.damage,radius:9});}e.state='recover';e.timer=1.3;}}
  }else if(e.state==='charge'){e.x+=e.aimX*330*dt;e.y+=e.aimY*330*dt;if(e.timer<=0){e.state='recover';e.timer=.7;}}
  else if(e.state==='recover'){if(e.timer<=0){e.state='move';e.timer=.8;}}
  else{
   if(e.role==='archer'&&d<440&&e.timer<=0||e.role==='caster'&&d<470&&e.timer<=0||e.role==='ghost'&&e.timer<=0||e.role==='rusher'&&d<310&&e.timer<=0){e.state='windup';e.timer=e.role==='rusher'?.7:e.role==='caster'?1:.85;e.aimX=e.role==='rusher'?dx/d:p.x;e.aimY=e.role==='rusher'?dy/d:p.y;}
   else {const direction=e.role==='archer'&&d<230?-1:1;e.x+=dx/d*e.speed*dt*direction;e.y+=dy/d*e.speed*dt*direction;}
  }
  e.x=clamp(e.x+e.vx*dt,25,WORLD.width-25);e.y=clamp(e.y+e.vy*dt,25,WORLD.height-25);e.vx*=Math.exp(-9*dt);e.vy*=Math.exp(-9*dt);if(Math.hypot(p.x-e.x,p.y-e.y)<e.radius+13)hurtPlayer(g,e.damage);
 }
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
function projectiles(g,dt){for(const b of g.bullets){b.life-=dt;b.lock=Math.max(0,b.lock-dt);const old={x:b.x,y:b.y};
 if(b.kind==='bomb'){b.age+=dt;const f=clamp(b.age/.7,0,1);b.x+=(b.tx-b.x)*Math.min(1,dt*10);b.y+=(b.ty-b.y)*Math.min(1,dt*10);if(b.life<=0){for(const e of g.enemies)if(!e.dead&&dist(e,b)<b.radius+e.radius)hit(g,e,b.damage);effect(g,{kind:'blast',x:b.x,y:b.y,radius:b.radius,life:.45});if(b.awake)for(let i=0;i<4;i++){const a=i*Math.PI/2,x=b.x+Math.cos(a)*90,y=b.y+Math.sin(a)*90;for(const e of g.enemies)if(!e.dead&&Math.hypot(e.x-x,e.y-y)<70)hit(g,e,b.damage*.35);effect(g,{kind:'blast',x,y,radius:65,life:.35});}}continue;}
 if(b.kind==='chain'){const target=g.enemies.find(e=>!e.dead&&e.id===b.target);if(target){const a=Math.atan2(target.y-b.y,target.x-b.x);b.vx=Math.cos(a)*b.speed;b.vy=Math.sin(a)*b.speed;}}
 b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.kind==='boulder'){if(b.x<35||b.x>WORLD.width-35){b.vx*=-1;b.x=clamp(b.x,35,WORLD.width-35);}if(b.y<35||b.y>WORLD.height-35){b.vy*=-1;b.y=clamp(b.y,35,WORLD.height-35);}}
 else if(b.x<0||b.x>WORLD.width||b.y<0||b.y>WORLD.height)b.life=0;
 for(const e of g.enemies){if(e.dead||b.life<=0||b.lock>0)continue;if(b.kind==='chain'&&e.id===b.last)continue;if(b.kind!=='chain'&&(b.hits[e.id]||0)>g.time)continue;if(segmentDistance(e.x,e.y,old,b)>e.radius+b.radius)continue;
  const a=Math.atan2(b.vy,b.vx);hit(g,e,b.damage,Math.cos(a)*60,Math.sin(a)*60);effect(g,{kind:'hit',x:e.x,y:e.y,life:.18});
  if(b.kind==='chain'){b.last=e.id;b.bounces--;const next=nearest(g,e.x,e.y,b.range,e.id);if(b.bounces<=0||!next){b.life=0;break;}b.target=next.id;b.lock=.085;b.x=e.x;b.y=e.y;break;}
  if(b.kind==='boulder')b.hits[e.id]=g.time+.45;else{b.hits[e.id]=1e9;if(b.pierce>0)b.pierce--;else b.life=0;}
 }
 }
 g.bullets=g.bullets.filter(b=>b.life>0);for(const b of g.shots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(dist(b,g.player)<b.radius+13){hurtPlayer(g,b.damage);b.life=0;}}g.shots=g.shots.filter(b=>b.life>0);
}
function pickups(g,dt){const radius=stats(g).magnet;for(const gem of g.gems){const d=dist(gem,g.player);if(d<radius){const f=Math.min(1,dt*650/(d||1));gem.x+=(g.player.x-gem.x)*f;gem.y+=(g.player.y-gem.y)*f;}if(dist(gem,g.player)<19){grantXp(g,gem.value);gem.taken=true;}}g.gems=g.gems.filter(gem=>!gem.taken);if(g.gems.length>350){const spill=g.gems.splice(0,g.gems.length-300),value=spill.reduce((s,e)=>s+e.value,0);g.gems.push({id:++g.id,x:spill[0].x,y:spill[0].y,value});}}
function step(g,dt,input){
 const p=g.player,s=stats(g);g.time+=dt;p.invuln=Math.max(0,p.invuln-dt);p.ultCooldown=Math.max(0,p.ultCooldown-dt);if(p.action){p.action.time+=dt;if(p.action.time>=p.action.duration)p.action=null;}
 let dx=Number.isFinite(input.x)?clamp(input.x,-1,1):0,dy=Number.isFinite(input.y)?clamp(input.y,-1,1):0,l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}const old={x:p.x,y:p.y};p.x=clamp(p.x+dx*s.speed*dt,70,WORLD.width-70);p.y=clamp(p.y+dy*s.speed*dt,70,WORLD.height-70);advanceButterGait(p.gait,dist(old,p),dx,dy,dt);
 if(!nearest(g,p.x,p.y)&&Math.abs(dx)>.1&&!p.action)p.facing=dx>0?-1:1;
 g.spawnTimer-=dt;if(g.spawnTimer<=0){g.spawnTimer=Math.max(.24,.72-g.time/500);const roll=rand(g),role=g.time>100&&roll>.84?'caster':g.time>40&&roll>.66?'archer':roll>.43?'rusher':'fan';spawnEnemy(g,role);}
 if(g.time>=g.eliteAt&&g.eliteAt<FINAL_AT){spawnEnemy(g,'rusher',{elite:true});g.eliteAt+=65;g.notice='정예 출현! 쓰러뜨리면 각성 핵과 회복을 얻어요.';}
 if(!g.championSpawned&&g.time>=90){spawnEnemy(g,'ghost',{distance:430});g.championSpawned=true;g.notice='중간 수호자 출현! 붉은 예고를 피해요.';}
 if(!g.finalSpawned&&g.time>=FINAL_AT){spawnEnemy(g,'ghost',{final:true,distance:400});g.finalSpawned=true;g.notice='마지막 이불령을 처치하면 탈출!';}
 enemies(g,dt);if(g.phase!=='playing')return;weapons(g,dt);for(const q of g.queue)if(q.at<=g.time){releaseShot(g,q);q.done=true;}g.queue=g.queue.filter(q=>!q.done);projectiles(g,dt);g.enemies=g.enemies.filter(e=>!e.dead);if(g.phase==='playing')pickups(g,dt);
 for(const e of g.effects)e.age+=dt;g.effects=g.effects.filter(e=>e.age<e.life);for(const n of g.numbers)n.age+=dt;g.numbers=g.numbers.filter(n=>n.age<.6);
}
export function tick(g,dt,input={}){if(g.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;g.events=[];const total=Math.min(dt,.15),steps=Math.ceil(total/(1/90));for(let i=0;i<steps&&g.phase==='playing';i++)step(g,total/steps,input);}
