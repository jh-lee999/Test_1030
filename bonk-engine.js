// A small deterministic, turn-based slingshot game. No DOM, audio or art mutation.
import {butterReleasePoint} from './butter-original-motion.js';
export const BOARD={w:800,h:960,left:48,right:752,top:112,danger:778,bottom:864,launch:{x:400,y:856}};
export const UPGRADES={
  split:{name:'별사탕 분열',icon:'✦',color:'#f6c78e',max:3,description:'탄환이 세 번 충돌하면 작은 탄환으로 분열. 파편은 다시 분열하지 않아요.'},
  mark:{name:'꾹 찍은 표식',icon:'◎',color:'#e8a6bf',max:3,description:'한 번 맞혀 표식, 다시 맞히면 주변까지 폭발. 레벨마다 폭발 피해와 범위 증가.'},
  lower:{name:'저학년 · 추적 도탄',icon:'↝',color:'#9ddde2',max:3,description:'매 세 번째 탄환이 적 사이를 추적. 레벨마다 추가 도약 +1. A → B → A 가능.'},
  upper:{name:'고학년 · 왕새총',icon:'◆',color:'#e6bd7a',max:3,description:'왕짱돌의 피해·크기 증가. 적중할 때 모이는 왕새총 게이지도 증가.'},
  pouch:{name:'두 칸짜리 주머니',icon:'⠿',color:'#c4dba3',max:3,description:'한 번에 발사하는 탄환 +1. 분열·표식·도탄과 함께 작동해요.'},
  rubber:{name:'쫀득한 고무줄',icon:'⌁',color:'#bcabe5',max:3,description:'벽·범퍼에 튕길 때마다 피해 +12% × 레벨. 탄환당 최대 다섯 번 누적.'},
  bomb:{name:'주머니 속 폭죽',icon:'✹',color:'#f0a38e',max:3,description:'적을 처치하면 주변까지 폭발. 폭발로 처치한 적도 연쇄 폭발해요.'},
  snack:{name:'비상 간식',icon:'♥',color:'#b7d5a4',max:3,description:'최대 체력 +15, 즉시 15 회복. 이후 전투를 마칠 때마다 체력 4 회복.'},
};
export const FUSIONS=[{id:'fireworks',name:'별사탕 폭죽',needs:{split:2,mark:2},description:'분열 파편도 표식을 새겨요. 표식 폭발 범위 +30.'},{id:'meteor',name:'별비 왕짱돌',needs:{lower:2,upper:2},description:'왕짱돌이 적을 맞힐 때 추적 별탄 두 발을 추가 발사.'}];
export const FOES={fan:{name:'돌진 팬',hp:22,xp:16,advance:76,damage:8},archer:{name:'사수 팬',hp:28,xp:20,advance:35,damage:5},guard:{name:'방패병',hp:38,xp:24,advance:52,damage:10},ghost:{name:'아공간 이불령',hp:245,xp:100,advance:28,damage:16}};
export function seedNumber(value){let n=2166136261;for(const c of String(value))n=Math.imul(n^c.codePointAt(0),16777619);return n>>>0;}
function random(seed){let n=seedNumber(seed);return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const level=(g,id)=>g.inventory[id]||0;
export const hasFusion=(g,id)=>{const f=FUSIONS.find(f=>f.id===id);return Boolean(f&&Object.entries(f.needs).every(([id,n])=>level(g,id)>=n));};
export const xpNeeded=level=>30+(level-1)*12;
export function createGame(seed=Date.now()){
  const label=String(seed).trim().slice(0,48)||'0',g={seed:label,rng:random(label+':board'),lootRng:random(label+':loot'),phase:'aim',stage:0,time:0,turn:1,hp:60,maxHp:60,xp:0,level:1,pending:0,inventory:{},charge:0,useKing:false,aim:{x:400,y:150},balls:[],queue:[],effects:[],enemies:[],pegs:[],nextId:1,combo:0,bestCombo:0,turnDamage:0,kills:0,shots:0,choices:[],notice:'조준하고 한 발. 적의 다음 행동은 머리 위에 보여요.',afterReward:null,launchX:400,returnX:400,action:null};
  buildStage(g);return g;
}
function addEnemy(g,type,x,y){const p=FOES[type],factor=1+g.stage*.16;g.enemies.push({id:g.nextId++,type,x,y,fromY:y,r:type==='ghost'?56:32,hp:Math.ceil(p.hp*factor),maxHp:Math.ceil(p.hp*factor),mark:false,flash:0,death:0,anim:0,dead:false});}
function buildStage(g){
  g.enemies=[];g.pegs=[];g.balls=[];g.queue=[];g.effects=[];g.action=null;g.combo=0;g.turnDamage=0;g.turn=1;g.useKing=false;g.launchX=400;g.returnX=400;
  const offset=Math.floor(g.rng()*3)*38;
  for(const [x,y]of [[170,430],[390,350],[620,470],[300,610],[570,635]])g.pegs.push({id:g.nextId++,x:clamp(x+(g.rng()-.5)*80,110,690),y:y+offset-38,r:17,flash:0});
  if(g.stage===3){addEnemy(g,'ghost',400,225);addEnemy(g,'guard',220,350);addEnemy(g,'archer',590,350);}
  else{const types=[['fan','archer','fan'],['guard','fan','archer','fan'],['guard','archer','fan','guard','archer']][g.stage];for(let i=0;i<types.length;i++)addEnemy(g,types[i],150+(i%3)*245+(g.rng()-.5)*45,205+Math.floor(i/3)*115+(i%2)*35);}
}
export function aimAt(g,x,y){if(g.phase!=='aim')return false;g.aim={x:clamp(x,BOARD.left,BOARD.right),y:clamp(y,BOARD.top,BOARD.danger-55)};return true;}
export function toggleKing(g){if(g.phase!=='aim'||g.charge<100)return false;g.useKing=!g.useKing;return true;}
function makeBall(g,angle,{king=false,child=false,x=BOARD.launch.x,y=BOARD.launch.y,damage=8,target=null}={}){
  return {id:g.nextId++,x,y,vx:Math.cos(angle)*(king?840:1080),vy:Math.sin(angle)*(king?840:1080),r:king?27+level(g,'upper')*6:child?5:8,king,child,damage:king?27+level(g,'upper')*9:damage,life:king?4.8:4.5,age:0,hits:{},contacts:0,wallBounces:0,split:false,low:target!==null,bounces:target!==null?1+level(g,'lower'):0,targetId:target,lastId:null,trail:[],meteorHits:{}};
}
export function fire(g){
  if(g.phase!=='aim')return false;
  const angle=Math.atan2(g.aim.y-BOARD.launch.y,g.aim.x-g.launchX);
  if(!Number.isFinite(angle)||Math.sin(angle)>-.15)return false;
  g.phase='flight';g.flightTime=0;g.combo=0;g.turnDamage=0;g.shots++;g.returnX=g.launchX;g.returnSet=false;
  const king=g.useKing&&g.charge>=100;g.action={type:king?'high':'normal',time:0,duration:king?.8:.45};const release=butterReleasePoint(g.action.type)*g.action.duration;
  g.queue=[];const count=3+level(g,'pouch');
  for(let i=0;i<count;i++){const b=makeBall(g,angle+(i?Math.ceil(i/2)*.012*(i%2?1:-1):0),{x:g.launchX});b.low=(i+1)%3===0;b.bounces=b.low?1+level(g,'lower'):0;g.queue.push({wait:release+i*.09,ball:b});}
  if(king){g.queue.push({wait:release,ball:makeBall(g,angle,{king:true,x:g.launchX})});g.charge=0;}
  g.useKing=false;g.notice='';return true;
}
function fx(g,type,x,y,extra={}){g.effects.push({type,x,y,time:0,life:type==='text'?.7:.45,...extra});}
export function gainXP(g,amount){if(!(amount>0&&Number.isFinite(amount)))return;g.xp+=amount;while(g.xp>=xpNeeded(g.level)){g.xp-=xpNeeded(g.level);g.level++;g.pending++;}}
function explosion(g,x,y,r,damage,color){fx(g,'blast',x,y,{r,color});for(const e of g.enemies)if(!e.dead&&Math.hypot(e.x-x,e.y-y)<=r+e.r)damageEnemy(g,e,damage,{secondary:true});}
export function damageEnemy(g,e,damage,{secondary=false}={}){
  if(e.dead||!(damage>0))return false;const dealt=Math.min(e.hp,damage);e.hp=Math.max(0,e.hp-damage);e.flash=.1;g.turnDamage+=dealt;
  fx(g,'text',e.x+Math.sin(e.id*13+g.combo)*9,e.y-28,{text:String(Math.ceil(dealt)),color:secondary?'#ffc18e':'#fff6cc'});
  if(e.hp===0){e.dead=true;e.death=0;g.kills++;gainXP(g,FOES[e.type].xp);fx(g,'burst',e.x,e.y,{color:'#f9d999'});
    if(level(g,'bomb'))explosion(g,e.x,e.y,110,6+level(g,'bomb')*5,'#ffb79a');
  }return true;
}
function hitEnemy(g,b,e){
  const last=b.hits[e.id];if(last!==undefined&&b.age-last<.16)return;b.hits[e.id]=b.age;
  const marked=e.mark;b.targetId=null;
  let damage=b.damage*(1+Math.min(5,b.wallBounces)*.12*level(g,'rubber'));
  if(e.type==='guard'&&g.turn%2===1&&!b.king&&!b.low&&b.wallBounces===0)damage*=.5;
  damageEnemy(g,e,damage);g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);g.charge=Math.min(100,g.charge+(b.child?3:8+level(g,'upper')*2));
  if(level(g,'mark')&&(!b.child||hasFusion(g,'fireworks'))){if(marked){e.mark=false;explosion(g,e.x,e.y,85+level(g,'mark')*15+(hasFusion(g,'fireworks')?30:0),5+level(g,'mark')*4,'#efb6d6');}else if(!e.dead)e.mark=true;}
  if(b.king&&hasFusion(g,'meteor')&&!b.meteorHits[e.id]){b.meteorHits[e.id]=true;const targets=g.enemies.filter(q=>!q.dead&&q.id!==e.id).slice(0,2);for(const target of targets)if(g.balls.length<64)g.balls.push(makeBall(g,Math.atan2(target.y-e.y,target.x-e.x),{x:e.x,y:e.y,damage:10,child:true,target:target.id}));}
  if(b.low&&b.bounces>0){const next=g.enemies.filter(q=>!q.dead&&q.id!==e.id&&Math.hypot(q.x-e.x,q.y-e.y)<330).sort((a,c)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(c.x-e.x,c.y-e.y))[0];if(next){b.bounces--;b.targetId=next.id;b.lastId=e.id;const a=Math.atan2(next.y-b.y,next.x-b.x),speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;}}
}
function splitBall(g,b){
  if(!level(g,'split')||b.child||b.king||b.split||b.contacts<3)return;b.split=true;fx(g,'burst',b.x,b.y,{color:'#ffe2a8'});
  const a=Math.atan2(b.vy,b.vx),n=1+level(g,'split');for(let i=0;i<n&&g.balls.length<64;i++)g.balls.push(makeBall(g,a+(i-(n-1)/2)*.38,{x:b.x,y:b.y,damage:b.damage*.55,child:true}));
}
function collideCircle(b,c){const dx=b.x-c.x,dy=b.y-c.y,d=Math.hypot(dx,dy),r=b.r+c.r;if(d>=r)return false;const nx=d>1e-8?dx/d:0,ny=d>1e-8?dy/d:1,v=b.vx*nx+b.vy*ny;if(v>=0)return false;b.x=c.x+nx*(r+.1);b.y=c.y+ny*(r+.1);b.vx-=2*v*nx;b.vy-=2*v*ny;return true;}
function stepBalls(g,dt){
  for(const q of g.queue){q.wait-=dt;if(q.wait<=0){g.balls.push(q.ball);q.done=true;fx(g,'shot',q.ball.x,q.ball.y,{color:q.ball.king?'#ffd27f':'#fff1b7'});}}g.queue=g.queue.filter(q=>!q.done);
  for(const b of g.balls){
    b.age+=dt;b.life-=dt;b.trail.push({x:b.x,y:b.y});if(b.trail.length>10)b.trail.shift();b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.low&&b.targetId!==null){const target=g.enemies.find(e=>!e.dead&&e.id===b.targetId);if(target){const speed=Math.hypot(b.vx,b.vy),a=Math.atan2(target.y-b.y,target.x-b.x);b.vx+=(Math.cos(a)*speed-b.vx)*Math.min(1,dt*12);b.vy+=(Math.sin(a)*speed-b.vy)*Math.min(1,dt*12);const n=Math.hypot(b.vx,b.vy)||1;b.vx*=speed/n;b.vy*=speed/n;}}
    if(b.x-b.r<BOARD.left||b.x+b.r>BOARD.right){b.x=clamp(b.x,BOARD.left+b.r,BOARD.right-b.r);b.vx*=-1;b.wallBounces++;b.contacts++;fx(g,'spark',b.x,b.y);}
    if(b.y-b.r<BOARD.top){b.y=BOARD.top+b.r;b.vy=Math.abs(b.vy);b.wallBounces++;b.contacts++;fx(g,'spark',b.x,b.y);}
    for(const peg of g.pegs)if(!b.king&&collideCircle(b,peg)){peg.flash=.15;b.wallBounces++;b.contacts++;fx(g,'spark',peg.x,peg.y,{color:'#bceac7'});}
    for(const e of g.enemies){if(e.dead)continue;
      if(b.king){if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r)hitEnemy(g,b,e);}
      else if(collideCircle(b,e)){b.contacts++;hitEnemy(g,b,e);}
    }
    splitBall(g,b);if(b.y>BOARD.bottom+b.r&&b.vy>0){b.life=0;if(!g.returnSet){g.returnX=clamp(b.x,80,720);g.returnSet=true;}}
    if(b.contacts>45)b.life=0;
  }g.balls=g.balls.filter(b=>b.life>0);
}
function rewardChoices(g){
  const pool=Object.keys(UPGRADES).filter(id=>level(g,id)<UPGRADES[id].max),result=[];
  // Show an attainable missing fusion piece when the player already invested.
  const needed=FUSIONS.flatMap(f=>Object.entries(f.needs).filter(([id,n])=>level(g,id)<n&&Object.keys(f.needs).some(other=>other!==id&&level(g,other)>0)).map(([id])=>id));
  if(needed.length)result.push(needed[Math.floor(g.lootRng()*needed.length)]);
  while(result.length<3){const available=pool.filter(id=>!result.includes(id));if(!available.length)break;result.push(available[Math.floor(g.lootRng()*available.length)]);}
  return result;
}
function openReward(g){g.choices=rewardChoices(g);if(!g.choices.length){g.pending=0;continueAfterReward(g);return;}g.phase='reward';}
function beginEnemyTurn(g){g.phase='enemy';g.enemyClock=0;g.enemyResolved=false;for(const e of g.enemies)if(!e.dead)e.fromY=e.y;g.notice='적의 반격! 다음 한 발을 준비하세요.';}
function continueAfterReward(g){if(g.afterReward==='next'){g.phase='next';g.notice='다음 전투 전에 조합을 확인하세요.';}else beginEnemyTurn(g);}
function finishVolley(g){
  const clear=g.enemies.every(e=>e.dead);
  if(clear&&g.stage===3){g.phase='won';g.notice='아공간 탈출 성공!';return;}
  if(clear){g.hp=Math.min(g.maxHp,g.hp+level(g,'snack')*4);g.afterReward='next';if(!g.pending)g.pending=1;}
  else g.afterReward='enemy';
  if(g.pending)openReward(g);else continueAfterReward(g);
}
export function chooseUpgrade(g,id){
  if(g.phase!=='reward'||!g.choices.includes(id)||level(g,id)>=UPGRADES[id].max)return false;
  const before=FUSIONS.filter(f=>hasFusion(g,f.id)).map(f=>f.id);g.inventory[id]=level(g,id)+1;g.pending--;
  if(id==='snack'){g.maxHp+=15;g.hp=Math.min(g.maxHp,g.hp+15);}
  const unlocked=FUSIONS.find(f=>!before.includes(f.id)&&hasFusion(g,f.id));g.notice=UPGRADES[id].name+' Lv.'+level(g,id);if(unlocked){g.unlockMessage='조합 완성! '+unlocked.name;g.unlockUntil=g.time+4;}g.choices=[];
  if(g.pending>0)openReward(g);else continueAfterReward(g);return true;
}
export function nextStage(g){if(g.phase!=='next')return false;g.stage++;buildStage(g);g.phase='aim';g.notice=g.stage===3?'이불령: 두 턴마다 졸개를 불러요.':'새 배치! 벽과 범퍼를 함께 이용해요.';return true;}
export function recall(g){if(g.phase!=='flight'||g.flightTime<.6)return false;g.balls=[];g.queue=[];finishVolley(g);return true;}
export function tick(g,dt){
  if(!['flight','aim','enemy'].includes(g.phase)||!(dt>0))return;dt=Math.min(dt,1/30);g.time+=dt;
  if(g.action){g.action.time+=dt;if(g.action.time>=g.action.duration)g.action=null;}
  for(const e of g.enemies){e.flash=Math.max(0,e.flash-dt);e.anim+=dt;if(e.dead)e.death+=dt;}
  for(const p of g.pegs)p.flash=Math.max(0,p.flash-dt);for(const e of g.effects)e.time+=dt;g.effects=g.effects.filter(e=>e.time<e.life);
  if(g.phase==='flight'){
    g.flightTime+=dt;const steps=Math.ceil(dt/(1/240));for(let i=0;i<steps;i++)stepBalls(g,dt/steps);
    if(g.flightTime>=6){g.balls=[];g.queue=[];}
    if(!g.balls.length&&!g.queue.length)finishVolley(g);
  }else if(g.phase==='enemy'){
    g.enemyClock+=dt;
    if(g.enemyClock<.65){for(const e of g.enemies)if(!e.dead)e.y=e.fromY+FOES[e.type].advance*Math.min(1,g.enemyClock/.65);}
    else if(!g.enemyResolved){
      g.enemyResolved=true;let loss=0;
      for(const e of g.enemies)if(!e.dead){if((e.type==='archer'||e.type==='ghost')&&g.turn%2===0){loss+=FOES[e.type].damage;fx(g,'beam',e.x,e.y,{color:'#edb1b8'});}if(e.y+e.r>=BOARD.danger){loss+=FOES[e.type].damage;e.y=BOARD.danger-e.r-80;fx(g,'burst',e.x,e.y,{color:'#ff9f94'});}}
      if(loss){g.hp=Math.max(0,g.hp-loss);fx(g,'text',BOARD.launch.x,820,{text:'−'+loss+' HP',color:'#ffaf9e'});}if(g.hp<=0){g.phase='dead';g.notice='다른 조합과 각도로 다시 도전해 봐요.';return;}
      const boss=g.enemies.find(e=>!e.dead&&e.type==='ghost'),living=g.enemies.filter(e=>!e.dead).length;if(boss&&g.turn%2===0)for(let i=0;i<Math.min(2,7-living);i++)addEnemy(g,'fan',boss.x+(i?95:-95),boss.y+90);
    }
    if(g.enemyClock>=1.05){g.turn++;g.launchX=g.returnX;g.phase='aim';g.notice='처음 돌아온 탄환의 위치가 다음 발사점이에요.';}
  }
}
// Reflection-only preview uses the SAME circle contacts and wall equations.
export function preview(g){
  const a=Math.atan2(g.aim.y-BOARD.launch.y,g.aim.x-g.launchX),b={x:g.launchX,y:BOARD.launch.y,vx:Math.cos(a)*1080,vy:Math.sin(a)*1080,r:8},points=[{x:b.x,y:b.y}];let contacts=0;
  for(let i=0;i<600;i++){b.x+=b.vx/240;b.y+=b.vy/240;let hit=false;if(b.x-b.r<BOARD.left||b.x+b.r>BOARD.right){b.x=clamp(b.x,BOARD.left+b.r,BOARD.right-b.r);b.vx*=-1;hit=true;}if(b.y-b.r<BOARD.top){b.y=BOARD.top+b.r;b.vy=Math.abs(b.vy);hit=true;}for(const p of g.pegs)if(collideCircle(b,p))hit=true;for(const e of g.enemies)if(!e.dead&&collideCircle(b,e))hit=true;if(hit){points.push({x:b.x,y:b.y});if(++contacts>=3)break;}if(i%10===0)points.push({x:b.x,y:b.y});if(b.y>BOARD.bottom&&b.vy>0)break;}
  return points;
}
