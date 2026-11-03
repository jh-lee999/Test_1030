import {createRunState,applyItem,rollItems,lowerPower,upperPower} from './survivor-engine.js';
import {advanceButterGait,butterMuzzleOffset,butterReleasePoint} from './butter-original-motion.js';

export const VIEW={width:1280,height:720},FLOOR=634,HERO_SIZE=92,STAGES=4;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function seededRandom(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const approach=(a,b,n)=>a<b?Math.min(a+n,b):Math.max(a-n,b);
export function heroPose(p){
  // Jump uses intact source Move poses, not a newly fabricated Jump rig.
  const gait=p.grounded?p.gait:{...p.gait,amount:1,phase:p.vy<0?1.7:4.5};
  return {size:HERO_SIZE,gait,action:p.action,time:p.gait.clock};
}
export function heroMuzzle(p){const q=butterMuzzleOffset(heroPose(p));return{x:p.x+(p.facing>0?-1:1)*q.x,y:p.y+q.y-HERO_SIZE*.28};}

export function makeRoom(index,random){
  const boss=index===STAGES-1,width=boss?1920:2720;
  const templates=[
    [[420,500,260],[900,386,260],[1350,500,300],[1830,385,270],[2210,500,240]],
    [[380,510,300],[830,420,300],[1300,330,250],[1600,500,300],[2110,420,300]],
    [[460,470,250],[880,350,260],[1240,480,300],[1730,380,270],[2120,505,300]],
  ];
  const layout=boss?[[350,480,270],[1300,480,270]]:templates[Math.floor(random()*templates.length)];
  const platforms=[{x:0,y:FLOOR,w:width,ground:true},...layout.map(([x,y,w],i)=>({x:x+(boss?0:Math.floor(random()*41)-20),y,w,id:i}))];
  const enemies=[];
  const add=(type,x,y,platform)=>{const hp=type==='ghost'?420:type==='archer'?38+index*8:48+index*9;enemies.push({id:enemies.length,type,x,y,home:platform,hp,maxHp:hp,h:type==='ghost'?148:94,w:type==='ghost'?126:44,facing:-1,vx:0,clock:random()*4,mode:'idle',timer:0,cooldown:.8+random(),flash:0,death:0,attackId:0});};
  if(boss)add('ghost',1390,FLOOR,platforms[0]);
  else{
    for(const x of [720,1310,1920,2380])add('fan',x,FLOOR,platforms[0]);
    for(const i of [0,2,4]){const p=platforms[i+1];add('archer',p.x+p.w*.55,p.y,p);}
  }
  const pickups=boss?[]:platforms.slice(1).map((p,i)=>({x:p.x+p.w*.25,y:p.y-26,kind:i===3?'heart':'coin',taken:false}));
  return{index,width,platforms,enemies,pickups,exit:{x:width-130,y:FLOOR},cleared:false,rewardTaken:false,background:index>=2?'night':'forest',title:['길을 잃은 숲','장난꾸러기의 길','뒤집힌 밤의 숲','아공간의 문지기'][index]};
}
export function createGame(seed=Date.now()){
  const random=seededRandom(seed),stats=createRunState('butter');
  const game={seed,random,stats,room:makeRoom(0,random),phase:'playing',time:0,elapsed:0,coins:0,projectiles:[],effects:[],boulders:[],camera:0,shake:0,hitStop:0,previous:{},choices:[],notice:'',noticeTime:0,roomIntro:3};
  game.player={x:150,y:FLOOR,vx:0,vy:0,w:32,h:78,facing:1,grounded:true,jumps:0,coyote:.1,jumpBuffer:0,dash:0,dashCooldown:0,invulnerable:0,skillTime:0,skillCooldown:0,attackCooldown:0,action:null,gait:{phase:0,amount:0,clock:0}};
  return game;
}
export function notifyGame(g,text){g.notice=text;g.noticeTime=2.6;}
function effect(g,type,x,y,extra={}){g.effects.push({type,x,y,time:0,duration:type==='text'?.7:.32,...extra});}
export function landBody(body,platforms,dt){
  const previous=body.y;body.y+=body.vy*dt;body.grounded=false;
  if(body.vy>=0){const candidates=platforms.filter(p=>body.x+body.w/2>p.x&&body.x-body.w/2<p.x+p.w&&previous<=p.y+.5&&body.y>=p.y).sort((a,b)=>a.y-b.y);if(candidates.length){body.y=candidates[0].y;body.vy=0;body.grounded=true;body.jumps=0;}}
}
function hitEnemy(g,e,damage,force=0){
  if(e.hp<=0)return;e.hp=Math.max(0,e.hp-damage);e.flash=.12;e.x=clamp(e.x+force,e.home.x+e.w/2,e.home.x+e.home.w-e.w/2);
  effect(g,'hit',e.x,e.y-e.h*.55);effect(g,'text',e.x,e.y-e.h,{text:String(Math.round(damage)),color:'#fff3b4'});
  if(!e.hp){e.mode='die';e.death=0;g.stats.kills++;g.coins+=e.type==='ghost'?15:2;g.shake=Math.max(g.shake,.13);}
}
export function hurtPlayer(g,damage,dir=1){
  const p=g.player;if(p.invulnerable>0||p.dash>0||p.skillTime>0||g.phase!=='playing')return false;
  g.stats.hp=Math.max(0,g.stats.hp-damage);p.invulnerable=.9;p.vx=dir*250;g.shake=.2;effect(g,'hit',p.x,p.y-45,{color:'#ff9395'});
  if(g.stats.hp===0)g.phase='dead';return true;
}
function fire(g,action){
  const p=g.player,m=heroMuzzle(p);
  if(action.type==='high'){
    const power=upperPower(g.stats);g.boulders.push({x:m.x,y:Math.min(m.y,FLOOR-48),vx:p.facing*660,vy:-160,r:45+g.stats.upperGrade*2,life:power.duration,damage:power.damage,hits:{},angle:0});g.shake=.18;effect(g,'burst',m.x,m.y);return;
  }
  const low=action.type==='low',power=lowerPower(g.stats),speed=g.stats.projectileSpeed*1.55;
  g.projectiles.push({owner:'player',x:m.x,y:m.y,vx:p.facing*speed,vy:0,r:low?9:6,life:2.4,damage:g.stats.damage*(low?1.25:1),homing:low,bounces:low?power.bounces:0,hitIds:[]});
  effect(g,'shot',m.x,m.y,{dir:p.facing,color:low?'#b9eeff':'#fff3bb'});
}
function updatePlayer(g,input,pressed,dt){
  const p=g.player,wasGrounded=p.grounded,oldX=p.x;
  for(const key of ['dashCooldown','invulnerable','skillTime','skillCooldown','attackCooldown','jumpBuffer','coyote'])p[key]=Math.max(0,p[key]-dt);
  if(p.grounded)p.coyote=.1;
  if(pressed.jump)p.jumpBuffer=.13;
  if(p.jumpBuffer>0&&(p.coyote>0||p.jumps<2)){
    if(!p.grounded&&p.coyote===0&&p.jumps===0)p.jumps=1;
    p.vy=p.jumps===0?-690:-660;p.jumps++;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.dash=0;
    effect(g,'jump',p.x,p.y,{duration:.35});
  }
  if(!input.jump&&(g.previous.jump||input.jumpReleased)&&p.vy< -260)p.vy=-260;
  const axis=(input.right?1:0)-(input.left?1:0);
  if(axis&&p.dash<=0)p.facing=axis;
  if(pressed.dash&&p.dashCooldown<=0){p.dash=.17;p.dashCooldown=.7;p.dashFacing=p.facing;effect(g,'dash',p.x,p.y-40,{duration:.25,dir:p.facing});}
  if(pressed.skill&&p.skillCooldown<=0){
    p.skillCooldown=13;p.skillTime=upperPower(g.stats).duration+1;p.action={type:'high',time:0,duration:1,fired:false};
    notifyGame(g,'왕새총! 짱돌이 구르는 동안 무적');
  }
  if((input.attack||input.attackPressed)&&p.attackCooldown<=0&&!p.action){
    const low=g.random()<lowerPower(g.stats).chance;p.action={type:low?'low':'normal',time:0,duration:Math.min(.42,g.stats.attackCooldown*.82),fired:false};p.attackCooldown=g.stats.attackCooldown;
  }
  if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.vx=p.dashFacing*850;p.vy=0;}
  else{p.vx=approach(p.vx,axis*g.stats.moveSpeed*1.4,dt*(axis?2400:3200));p.vy=Math.min(1050,p.vy+1850*dt);}
  p.x=clamp(p.x+p.vx*dt,22,g.room.width-22);landBody(p,g.room.platforms,dt);
  if(!wasGrounded&&p.grounded)effect(g,'land',p.x,p.y,{duration:.25});
  advanceButterGait(p.gait,Math.abs(p.x-oldX),p.x-oldX,0,dt);
  if(p.action){const a=p.action;a.time+=dt;if(!a.fired&&a.time/a.duration>=butterReleasePoint(a.type)){a.fired=true;fire(g,a);}if(a.time>=a.duration)p.action=null;}
}
function updateEnemies(g,dt){
  const p=g.player;
  for(const e of g.room.enemies){
    e.clock+=dt;e.flash=Math.max(0,e.flash-dt);if(e.hp<=0){e.death+=dt;continue;}
    e.cooldown=Math.max(0,e.cooldown-dt);const dx=p.x-e.x,dy=p.y-e.y;e.facing=dx>=0?1:-1;
    if(e.mode==='attack'){
      const before=e.timer;e.timer+=dt;const windup=e.type==='ghost'?.75:e.type==='archer'?.55:.46;
      if(before<windup&&e.timer>=windup){
        if(e.type==='fan'){if(Math.abs(dx)<98&&Math.abs(dy)<70)hurtPlayer(g,10,e.facing);effect(g,'slash',e.x+e.facing*40,e.y-45,{dir:e.facing});}
        else{
          const count=e.type==='ghost'?7:1,speed=e.type==='ghost'?270:290,angle=Math.atan2(p.y-42-(e.y-e.h*.6),dx);
          for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.18;g.projectiles.push({owner:'enemy',x:e.x+e.facing*25,y:e.y-e.h*.6,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:e.type==='ghost'?11:8,life:4,damage:e.type==='ghost'?12:8});}
          if(e.type==='ghost'){g.shake=.1;effect(g,'burst',e.x,e.y-50,{color:'#dfb8ff'});}
        }
      }
      if(e.timer>windup+.42){e.mode='idle';e.timer=0;e.cooldown=e.type==='ghost'?1.5:e.type==='archer'?1.3:.8;}
      continue;
    }
    const range=e.type==='ghost'?950:e.type==='archer'?650:85;
    if(Math.abs(dx)<range&&Math.abs(dy)<(e.type==='fan'?80:420)&&e.cooldown===0){e.mode='attack';e.timer=0;e.attackId++;continue;}
    const chasing=(e.type==='fan'&&Math.abs(dx)<800&&Math.abs(dx)>60)||(e.type==='ghost'&&Math.abs(dx)>480);
    e.vx=chasing?e.facing*(e.type==='ghost'?68:110):0;
    const old=e.x;e.x=clamp(e.x+e.vx*dt,e.home.x+e.w/2+12,e.home.x+e.home.w-e.w/2-12);e.mode=Math.abs(e.x-old)>.01?'walk':'idle';
    if(e.type==='ghost'&&Math.abs(dx)<100&&Math.abs(dy)<130)hurtPlayer(g,12,e.facing);
  }
}
export function segmentHitsBody(ax,ay,bx,by,body,r=0){
  let lo=0,hi=1;
  for(const [a,d,min,max]of [[ax,bx-ax,body.x-body.w/2-r,body.x+body.w/2+r],[ay,by-ay,body.y-body.h-r,body.y+r]]){
    if(Math.abs(d)<1e-8){if(a<min||a>max)return false;continue;}
    const t0=(min-a)/d,t1=(max-a)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;
  }return true;
}
function updateProjectiles(g,dt){
  const p=g.player;
  for(const b of g.projectiles){
    b.life-=dt;const oldX=b.x,oldY=b.y;
    if(b.homing){const target=g.room.enemies.filter(e=>e.hp>0&&!b.hitIds.includes(e.id)).sort((a,c)=>Math.hypot(a.x-b.x,a.y-a.h*.5-b.y)-Math.hypot(c.x-b.x,c.y-c.h*.5-b.y))[0];if(target){const angle=Math.atan2(target.y-target.h*.5-b.y,target.x-b.x),speed=Math.hypot(b.vx,b.vy),mix=1-Math.exp(-dt*7);b.vx+=(Math.cos(angle)*speed-b.vx)*mix;b.vy+=(Math.sin(angle)*speed-b.vy)*mix;}}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.owner==='player'){
      for(const e of g.room.enemies){
        if(e.hp<=0||b.hitIds.includes(e.id))continue;
        if(!segmentHitsBody(oldX,oldY,b.x,b.y,e,b.r))continue;
        hitEnemy(g,e,b.damage,Math.sign(b.vx)*8);b.hitIds.push(e.id);
        if(b.bounces>0){b.bounces--;const next=g.room.enemies.filter(c=>c.hp>0&&!b.hitIds.includes(c.id)).sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];if(next){const a=Math.atan2(next.y-next.h*.5-b.y,next.x-b.x),speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;}else b.life=0;}else b.life=0;
        break;
      }
    }else if(segmentHitsBody(oldX,oldY,b.x,b.y,p,b.r)){hurtPlayer(g,b.damage,Math.sign(b.vx));b.life=0;}
    if(b.x<0||b.x>g.room.width||b.y< -100||b.y>FLOOR+40)b.life=0;
  }
  g.projectiles=g.projectiles.filter(b=>b.life>0);
  for(const b of g.boulders){
    b.life-=dt;b.vy+=1000*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.vx*dt/b.r;
    if(b.x<b.r||b.x>g.room.width-b.r){b.x=clamp(b.x,b.r,g.room.width-b.r);b.vx*=-1;}
    if(b.y>FLOOR-b.r){b.y=FLOOR-b.r;b.vy=-Math.max(160,Math.abs(b.vy)*.6);}
    for(const e of g.room.enemies)if(e.hp>0&&Math.hypot(e.x-b.x,e.y-e.h*.5-b.y)<b.r+e.w*.5&&(!b.hits[e.id]||g.time-b.hits[e.id]>.32)){b.hits[e.id]=g.time;hitEnemy(g,e,b.damage,Math.sign(b.vx)*20);}
  }
  g.boulders=g.boulders.filter(b=>b.life>0);
}
export function chooseReward(g,id){
  if(g.phase!=='reward'||!g.choices.includes(id))return false;
  g.stats=applyItem(g.stats,id);g.room.rewardTaken=true;g.phase='playing';g.choices=[];notifyGame(g,'아이템 획득! 오른쪽 아공간 문으로 이동');return true;
}
export function enterNextRoom(g){
  if(g.phase!=='playing'||!g.room.cleared||!g.room.rewardTaken||Math.abs(g.player.x-g.room.exit.x)>100||Math.abs(g.player.y-FLOOR)>50)return false;
  if(g.room.index===STAGES-1){g.phase='won';return true;}
  g.room=makeRoom(g.room.index+1,g.random);g.player.x=120;g.player.y=FLOOR;g.player.vx=0;g.player.vy=0;g.player.action=null;g.player.grounded=true;g.player.jumps=0;g.player.dash=0;g.player.skillTime=0;g.player.invulnerable=1;g.projectiles=[];g.boulders=[];g.effects=[];g.camera=0;g.roomIntro=2.6;return true;
}
export function tick(g,input={},dt=1/120){
  if(g.phase!=='playing')return;
  dt=clamp(dt,0,1/30);g.time+=dt;g.elapsed+=dt;
  const pressed={};for(const key of ['jump','dash','skill','interact'])pressed[key]=Boolean(input[key+'Pressed']||(input[key]&&!g.previous[key]));
  updatePlayer(g,input,pressed,dt);updateEnemies(g,dt);updateProjectiles(g,dt);
  for(const item of g.room.pickups)if(!item.taken&&Math.hypot(g.player.x-item.x,g.player.y-30-item.y)<45){item.taken=true;if(item.kind==='heart'){g.stats.hp=Math.min(g.stats.maxHp,g.stats.hp+15);effect(g,'text',item.x,item.y,{text:'+15 HP',color:'#ffb6be'});}else{g.coins+=5;effect(g,'text',item.x,item.y,{text:'+5',color:'#ffe09b'});}}
  for(const e of g.effects)e.time+=dt;g.effects=g.effects.filter(e=>e.time<e.duration);
  g.noticeTime=Math.max(0,g.noticeTime-dt);g.roomIntro=Math.max(0,g.roomIntro-dt);g.shake=Math.max(0,g.shake-dt);
  const cameraGoal=clamp(g.player.x-VIEW.width*.42+g.player.facing*65,0,g.room.width-VIEW.width);g.camera+=(cameraGoal-g.camera)*(1-Math.exp(-dt*5));
  if(g.phase==='playing'&&!g.room.cleared&&g.room.enemies.every(e=>e.hp<=0)){g.room.cleared=true;g.projectiles=g.projectiles.filter(b=>b.owner==='player');g.choices=rollItems(g.random,3);g.phase='reward';}
  if(pressed.interact)enterNextRoom(g);g.previous={...input};
}
