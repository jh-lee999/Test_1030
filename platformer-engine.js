import {createRunState,applyItem,rollItems,lowerPower,upperPower} from './survivor-engine.js';
import {advanceButterGait,butterMuzzleOffset,butterReleasePoint} from './butter-original-motion.js';
import {PHYSICS,approach,landBody} from './platformer-physics.js?v=38';
import {FLOOR,STAGES,BIOMES,generateWorld,generateRoom,seedNumber,seededRandom} from './platformer-world.js?v=38';
export {FLOOR,STAGES,seededRandom,landBody};

export const VIEW={width:1280,height:720},HERO_SIZE=92;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function heroPose(p){
  // Jump uses intact source Move poses, not a newly fabricated Jump rig.
  const gait=p.grounded?p.gait:{...p.gait,amount:1,phase:p.vy<0?1.7:4.5};
  return {size:HERO_SIZE,gait,action:p.action,time:p.gait.clock};
}
export function heroMuzzle(p){const q=butterMuzzleOffset(heroPose(p));return{x:p.x+(p.facing>0?-1:1)*q.x,y:p.y+q.y-HERO_SIZE*.28};}

export function makeRoom(index,random){
  const seed=Math.floor(random()*4294967296);
  return generateRoom({id:`standalone:${index}`,depth:index,seed,biome:Object.keys(BIOMES)[seed%4],type:index===STAGES-1?'boss':'combat'});
}
export function createGame(seed=Date.now()){
  const seedLabel=String(seed).trim().slice(0,48)||'0',root=seedNumber(seedLabel),random=seededRandom(`${root}:combat`),rewardRandom=seededRandom(`${root}:loot`),stats=createRunState('butter'),world=generateWorld(root),room=generateRoom(world.nodes[0]);
  const game={seed:root,seedLabel,random,rewardRandom,world,currentNodeId:world.startId,rooms:{[world.startId]:room},stats,room,phase:'playing',time:0,elapsed:0,coins:0,shotsFired:0,projectiles:[],effects:[],boulders:[],camera:0,cameraY:0,shake:0,hitStop:0,previous:{},choices:[],notice:'',noticeTime:0,roomIntro:3};
  game.player={x:150,y:FLOOR,vx:0,vy:0,w:32,h:78,facing:1,grounded:true,jumps:0,coyote:.1,jumpBuffer:0,dash:0,dashCooldown:0,invulnerable:0,skillTime:0,skillCooldown:0,attackCooldown:0,action:null,gait:{phase:0,amount:0,clock:0}};
  game.checkpoint={...room.spawn};
  return game;
}
export function notifyGame(g,text){g.notice=text;g.noticeTime=2.6;}
function effect(g,type,x,y,extra={}){g.effects.push({type,x,y,time:0,duration:type==='text'?.7:.32,...extra});}
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
  const p=g.player,m=heroMuzzle(p);g.shotsFired++;
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
    p.vy=p.jumps===0?-PHYSICS.jump:-PHYSICS.doubleJump;p.jumps++;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.dash=0;
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
  else{p.vx=approach(p.vx,axis*g.stats.moveSpeed*1.4,dt*(axis?PHYSICS.acceleration:PHYSICS.braking));p.vy=Math.min(PHYSICS.maxFall,p.vy+PHYSICS.gravity*dt);}
  p.x=clamp(p.x+p.vx*dt,22,g.room.width-22);landBody(p,g.room.platforms,dt);
  if(p.grounded){const floor=g.room.platforms.find(q=>q.id===p.platformId);if(floor)g.checkpoint={x:clamp(p.x,floor.x+40,floor.x+floor.w-40),y:floor.y,platformId:floor.id};}
  if(p.y>FLOOR+240){hurtPlayer(g,8);Object.assign(p,{x:g.checkpoint.x,y:g.checkpoint.y,vx:0,vy:0,jumps:0,grounded:true,dash:0,action:null,invulnerable:1});notifyGame(g,'발을 헛디뎠어! 마지막 발판으로 돌아왔어.');}
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
    const previousBottom=b.y+b.r;b.life-=dt;b.vy+=1000*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.vx*dt/b.r;
    if(b.x<b.r||b.x>g.room.width-b.r){b.x=clamp(b.x,b.r,g.room.width-b.r);b.vx*=-1;}
    const floor=g.room.platforms.filter(p=>b.x+b.r>p.x&&b.x-b.r<p.x+p.w&&previousBottom<=p.y+.5&&b.y+b.r>=p.y).sort((a,c)=>a.y-c.y)[0];
    if(b.vy>0&&floor){b.y=floor.y-b.r;b.vy=-Math.max(160,Math.abs(b.vy)*.6);}
    if(b.y>FLOOR+180)b.life=0;
    for(const e of g.room.enemies)if(e.hp>0&&Math.hypot(e.x-b.x,e.y-e.h*.5-b.y)<b.r+e.w*.5&&(!b.hits[e.id]||g.time-b.hits[e.id]>.32)){b.hits[e.id]=g.time;hitEnemy(g,e,b.damage,Math.sign(b.vx)*20);}
  }
  g.boulders=g.boulders.filter(b=>b.life>0);
}
export function chooseReward(g,id){
  if(g.phase!=='reward'||!g.choices.includes(id))return false;
  g.stats=applyItem(g.stats,id);g.room.rewardTaken=true;g.world.nodes.find(n=>n.id===g.currentNodeId).completed=true;if(g.room.shrine)g.room.shrine.used=true;g.phase='playing';g.choices=[];notifyGame(g,'아이템 획득! 출구에서 다음 경로를 골라 보자.');return true;
}
export function enterNextRoom(g){
  if(g.phase!=='playing'||!g.room.cleared||!g.room.rewardTaken||!g.player.grounded||Math.abs(g.player.x-g.room.exit.x)>90||Math.abs(g.player.y-g.room.exit.y)>40)return false;
  if(g.room.type==='boss'){g.phase='won';return true;}
  g.phase='route';return true;
}
export function routeOptions(g){const node=g.world.nodes.find(n=>n.id===g.currentNodeId);return g.world.nodes.filter(n=>node.next.includes(n.id)&&!n.visited);}
export function chooseRoute(g,id){
  if(g.phase!=='route')return false;const node=routeOptions(g).find(n=>n.id===id);if(!node)return false;
  const room=g.rooms[id]??generateRoom(node);g.rooms[id]=room;g.room=room;g.currentNodeId=id;node.visited=true;
  Object.assign(g.player,{x:room.spawn.x,y:room.spawn.y,vx:0,vy:0,action:null,grounded:true,jumps:0,coyote:.1,jumpBuffer:0,dash:0,skillTime:0,invulnerable:1});
  g.checkpoint={...room.spawn};g.projectiles=[];g.boulders=[];g.effects=[];g.camera=0;g.cameraY=0;g.roomIntro=2.6;g.phase='playing';g.previous={};g.noticeTime=0;return true;
}
function offerReward(g){
  g.choices=rollItems(g.rewardRandom,3);
  if(g.room.type==='elite'){const extra=g.choices.find(id=>!['lower_book','upper_book'].includes(id));g.choices=['lower_book','upper_book',extra];}
  g.phase='reward';
}
export function interactRoom(g){
  if(g.phase!=='playing')return false;const shrine=g.room.shrine,p=g.player;
  if(shrine&&!shrine.used&&p.grounded&&Math.abs(p.x-shrine.x)<85&&Math.abs(p.y-shrine.y)<40){
    if(shrine.kind==='treasure')offerReward(g);
    else{g.stats.hp=Math.min(g.stats.maxHp,g.stats.hp+Math.ceil(g.stats.maxHp*.4));shrine.used=true;g.room.rewardTaken=true;g.world.nodes.find(n=>n.id===g.currentNodeId).completed=true;notifyGame(g,'따뜻한 쉼터 · 최대 체력의 40% 회복');}return true;
  }return enterNextRoom(g);
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
  g.cameraY+=(clamp(g.player.y-340,-230,0)-g.cameraY)*(1-Math.exp(-dt*6));
  if(g.phase==='playing'&&!g.room.cleared&&g.room.enemies.every(e=>e.hp<=0)){g.room.cleared=true;g.projectiles=g.projectiles.filter(b=>b.owner==='player');offerReward(g);}
  if(pressed.interact)interactRoom(g);g.previous={...input};
}
