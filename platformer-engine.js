import {createBuildState,applyBuildItem,removeBuildItem,rewardChoices,lowerPower,upperPower,ITEMS,itemChanges,LOWER_CHAIN_RANGE} from './platformer-build.js?v=43';
import {CONTRACTS,HEAL_PRICE,BAG_PRICE,createEconomy,createMarket,marketStock,offerPrice,salePrice,shopRerollCost,rollSealedBag} from './platformer-economy.js?v=43';
import {advanceButterGait,butterMuzzleOffset,butterReleasePoint} from './butter-original-motion.js';
import {PHYSICS,approach,landBody} from './platformer-physics.js?v=38';
import {FLOOR,STAGES,BIOMES,generateWorld,generateRoom,seedNumber,seededRandom} from './platformer-world.js?v=43';
export {FLOOR,STAGES,seededRandom,landBody};

export const VIEW={width:1280,height:720},HERO_SIZE=92;
export const CHAIN_HIT_INTERVAL=.08;
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
  const seedLabel=String(seed).trim().slice(0,48)||'0',root=seedNumber(seedLabel),random=seededRandom(`${root}:combat`),rewardRandom=seededRandom(`${root}:loot`),shopRandom=seededRandom(`${root}:shop`),stats=createBuildState(),world=generateWorld(root),room=generateRoom(world.nodes[0]);
  const game={seed:root,seedLabel,random,rewardRandom,shopRandom,world,currentNodeId:world.startId,rooms:{[world.startId]:room},stats,room,phase:'playing',time:0,elapsed:0,coins:0,shotsFired:0,lowerProcs:0,buildRevision:0,lastPickup:'',projectiles:[],effects:[],boulders:[],camera:0,cameraY:0,shake:0,hitStop:0,previous:{},choices:[],notice:'',noticeTime:0,roomIntro:3};
  game.player={x:150,y:FLOOR,vx:0,vy:0,w:32,h:78,facing:1,grounded:true,jumps:0,coyote:.1,jumpBuffer:0,dash:0,dashCooldown:0,dashHits:[],shield:0,lowerDryShots:0,invulnerable:0,skillTime:0,skillCooldown:0,attackCooldown:0,action:null,gait:{phase:0,amount:0,clock:0}};
  game.checkpoint={...room.spawn};
  game.economy=createEconomy();game.contract=null;game.lastTransaction='';
  return game;
}
export function notifyGame(g,text){g.notice=text;g.noticeTime=2.6;}
function effect(g,type,x,y,extra={}){g.effects.push({type,x,y,time:0,duration:type==='text'?.7:.32,...extra});}
export function hitEnemy(g,e,damage,force=0,{critical=false,direct=true,guardBreak=false}={}){
  if(e.type==='guard'&&e.mode!=='attack'&&force*e.facing<0&&direct&&!guardBreak){damage*=.25;effect(g,'text',e.x,e.y-e.h-20,{text:'방어',color:'#a4e5ff'});force*=.15;}
  if(e.hp<=0)return;const dealt=Math.min(e.hp,damage);e.hp=Math.max(0,e.hp-damage);e.flash=.12;e.x=clamp(e.x+force,e.home.x+e.w/2,e.home.x+e.home.w-e.w/2);
  effect(g,'hit',e.x,e.y-e.h*.55);effect(g,'text',e.x,e.y-e.h,{text:String(Math.round(damage))+(critical?'!':''),color:critical?'#ffce66':direct?'#fff3b4':'#ffa995'});
  if(direct&&g.stats.lifeSteal>0)g.stats.hp=Math.min(g.stats.maxHp,g.stats.hp+dealt*g.stats.lifeSteal);
  if(direct&&g.stats.burnPower>0){e.burnTime=2;e.burnDPS=g.stats.damage*g.stats.burnPower;e.burnTick=e.burnTick??.5;}
  if(!e.hp){
    e.mode='die';e.death=0;g.stats.kills++;g.coins+=e.type==='ghost'?15:2;g.shake=Math.max(g.shake,.13);g.stats.hp=Math.min(g.stats.maxHp,g.stats.hp+g.stats.killHeal);
    if(g.stats.killExplosion>0){effect(g,'burst',e.x,e.y-e.h*.5,{color:'#ffbb86',duration:.5});for(const other of g.room.enemies)if(other.hp>0&&Math.hypot(other.x-e.x,(other.y-other.h*.5)-(e.y-e.h*.5))<100)hitEnemy(g,other,g.stats.damage*g.stats.killExplosion,0,{direct:false});}
  }
}
export function hurtPlayer(g,damage,dir=1){
  const p=g.player;if(p.invulnerable>0||p.dash>0||p.skillTime>0||g.phase!=='playing')return false;
  const frenzy=g.contract?.status==='active'&&g.contract.nodeId===g.currentNodeId&&g.contract.id==='frenzy';
  const reduced=damage*(frenzy?1.2:1)*(1-g.stats.damageReduction),absorbed=Math.min(p.shield,reduced),loss=reduced-absorbed;p.shield-=absorbed;
  g.stats.hp=Math.max(0,g.stats.hp-loss);g.room.hpDamage=(g.room.hpDamage||0)+loss;p.invulnerable=.9;p.vx=dir*250;g.shake=.2;effect(g,'hit',p.x,p.y-45,{color:absorbed?'#b7e9fa':'#ff9395'});
  if(g.stats.hp===0){g.phase='dead';settleContract(g,true);}return true;
}
function fire(g,action){
  const p=g.player,m=heroMuzzle(p);g.shotsFired++;
  if(action.type==='high'){
    const power=upperPower(g.stats);for(let i=0;i<power.count;i++){const critical=g.random()<g.stats.critChance;g.boulders.push({x:m.x,y:Math.min(m.y,FLOOR-48),vx:p.facing*(i?-1:1)*660,vy:-160,r:power.radius,life:power.duration,damage:power.damage*(i?.65:1)*(critical?g.stats.critDamage:1),critical,hits:{},angle:0});}g.shake=.18;effect(g,'burst',m.x,m.y);return;
  }
  const low=action.type==='low',power=lowerPower(g.stats),speed=g.stats.projectileSpeed*1.55;
  p.lowerDryShots=low?0:p.lowerDryShots+1;if(low)g.lowerProcs++;
  const count=1+g.stats.extraProjectiles+(low?power.extraProjectiles:0);
  for(let i=0;i<count;i++){
    const angle=i===0?0:Math.ceil(i/2)*.11*(i%2?1:-1),critical=g.random()<g.stats.critChance,damage=(low?power.damage:g.stats.damage)*(i?.55:1)*(critical?g.stats.critDamage:1);
    g.projectiles.push({owner:'player',x:m.x,y:m.y,vx:p.facing*Math.cos(angle)*speed,vy:Math.sin(angle)*speed,speed,r:low?9:6,life:g.stats.projectileLifetime,damage,critical,homing:low,homingStrength:power.homing,bounces:low?power.bounces:0,chainRange:power.chainRange,pierce:low?0:g.stats.pierce,hitIds:[]});
  }
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
  if(pressed.dash&&p.dashCooldown<=0){p.dash=.17;p.dashCooldown=g.stats.dashCooldown;p.dashFacing=p.facing;p.dashHits=[];effect(g,'dash',p.x,p.y-40,{duration:.25,dir:p.facing});}
  if(pressed.skill&&p.skillCooldown<=0){
    p.skillCooldown=g.stats.skillCooldown;p.skillTime=1.1;p.action={type:'high',time:0,duration:1,fired:false};
    notifyGame(g,'왕새총! 시전 1.1초 무적 · 왕짱돌은 방패를 관통해요');
  }
  if((input.attack||input.attackPressed)&&p.attackCooldown<=0&&!p.action){
    const power=lowerPower(g.stats),low=p.lowerDryShots+1>=power.pity||g.random()<power.chance;p.action={type:low?'low':'normal',time:0,duration:Math.min(.42,g.stats.attackCooldown*.82),fired:false};p.attackCooldown=g.stats.attackCooldown;
  }
  if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.vx=p.dashFacing*850;p.vy=0;}
  else{p.vx=approach(p.vx,axis*g.stats.moveSpeed*1.4,dt*(axis?PHYSICS.acceleration:PHYSICS.braking));p.vy=Math.min(PHYSICS.maxFall,p.vy+PHYSICS.gravity*dt);}
  p.x=clamp(p.x+p.vx*dt,22,g.room.width-22);landBody(p,g.room.platforms,dt);
  if(p.dash>0&&g.stats.dashDamage>0)for(const e of g.room.enemies)if(e.hp>0&&!p.dashHits.includes(e.id)&&segmentHitsBody(oldX,p.y-40,p.x,p.y-40,e,18)){p.dashHits.push(e.id);hitEnemy(g,e,g.stats.damage*g.stats.dashDamage,p.facing*15,{guardBreak:true});}
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
    if(e.burnTime>0){e.burnTime=Math.max(0,e.burnTime-dt);e.burnTick-=dt;if(e.burnTick<=0){e.burnTick+=.5;hitEnemy(g,e,e.burnDPS*.5,0,{direct:false});if(e.hp<=0)continue;}}
    e.cooldown=Math.max(0,e.cooldown-dt);const dx=p.x-e.x,dy=p.y-e.y;
    if(e.type!=='guard'||(e.mode!=='attack'&&!(e.turnCooldown>0))){e.facing=dx>=0?1:-1;if(e.type==='guard')e.turnCooldown=.8;}
    e.turnCooldown=Math.max(0,(e.turnCooldown||0)-dt);
    if(e.boss){updateGuardian(g,e,dx,dy,dt);continue;}
    if(['rusher','guard','caster','drone'].includes(e.type)){updateSpecialEnemy(g,e,dx,dy,dt);continue;}
    if(e.mode==='attack'){
      const before=e.timer;e.timer+=dt;const windup=e.type==='ghost'?.75:e.type==='archer'?.55:.46;
      if(before<windup&&e.timer>=windup){
        if(e.type==='fan'){if(Math.abs(dx)<98&&Math.abs(dy)<70)hurtPlayer(g,10,e.facing);effect(g,'slash',e.x+e.facing*40,e.y-45,{dir:e.facing});}
        else{
          const count=e.type==='ghost'?7:e.veteran?3:1,speed=e.type==='ghost'?270:290,angle=Math.atan2(p.y-42-(e.y-e.h*.6),dx);
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
    e.vx=chasing?e.facing*(e.type==='ghost'?68:110+(e.act===0?20:0)+(e.veteran?35:0)):0;
    const old=e.x;e.x=clamp(e.x+e.vx*dt,e.home.x+e.w/2+12,e.home.x+e.home.w-e.w/2-12);e.mode=Math.abs(e.x-old)>.01?'walk':'idle';
    if(e.type==='ghost'&&Math.abs(dx)<100&&Math.abs(dy)<130)hurtPlayer(g,12,e.facing);
  }
}
function enemyShot(g,e,angle,speed=280){g.projectiles.push({owner:'enemy',x:e.x,y:e.y-e.h*.55,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:9,life:5,damage:10+(e.act||0)*2});}
function updateSpecialEnemy(g,e,dx,dy,dt){
  const p=g.player;
  if(e.type==='rusher'&&e.mode==='attack'&&e.timer>=.55&&e.chargeFacing)e.facing=e.chargeFacing;
  if(e.type==='drone'){
    const desiredY=p.y-100+Math.sin(e.clock*2+e.id)*25;
    e.x=clamp(e.x+clamp(p.x-e.facing*240-e.x,-160*dt,160*dt),30,g.room.width-30);e.y+=clamp(desiredY-e.y,-110*dt,110*dt);
  }
  if(e.mode==='attack'){
    const old=e.timer;e.timer+=dt;
    if(e.type==='rusher'){
      if(old<.55&&e.timer>=.55){e.chargeFacing=e.facing;e.vx=e.facing*440;e.vy=-390;e.grounded=false;}
      if(e.timer>=.55&&(!e.grounded||e.timer<1.25)){
        const oldX=e.x;e.x=clamp(e.x+e.vx*dt,25,g.room.width-25);e.vy=Math.min(900,(e.vy||0)+PHYSICS.gravity*dt);landBody(e,g.room.platforms,dt);
        if(e.grounded)e.home=g.room.platforms.find(v=>v.id===e.platformId)||e.home;
        if(segmentHitsBody(oldX,e.y-45,e.x,e.y-45,p,24))hurtPlayer(g,16+(e.act||0)*2,e.chargeFacing);
      }
      if(e.y>FLOOR+220){e.x=e.home.x+e.home.w/2;e.y=e.home.y;e.vy=0;}
    }else if(e.type==='guard'&&old<.65&&e.timer>=.65){if(Math.abs(dx)<130&&Math.abs(dy)<90)hurtPlayer(g,18,e.facing);effect(g,'slash',e.x+e.facing*55,e.y-35,{dir:e.facing});}
    else if(e.type==='drone'&&old<.7&&e.timer>=.7){const aim=e.aimAngle;for(const spread of [-.12,.12])enemyShot(g,e,aim+spread,340);}
    const recovery=e.type==='rusher'?1.7:e.type==='caster'?1.15:1.05;
    if(e.timer>=recovery){e.mode='idle';e.timer=0;e.cooldown=e.type==='caster'?1.6:e.type==='rusher'?.8:.8;}
    return;
  }
  const range=e.type==='rusher'?650:e.type==='guard'?115:e.type==='caster'?1000:780;
  if(Math.abs(dx)<range&&Math.abs(dy)<(e.type==='guard'?100:380)&&e.cooldown<=0){
    e.mode='attack';e.timer=0;e.attackId++;e.aimAngle=Math.atan2(p.y-40-(e.y-e.h*.55),dx);
    if(e.type==='caster'){g.room.marks??=[];g.room.marks.push({owner:e.id,x:p.x,y:p.y,time:0,delay:1,r:70,damage:15+(e.act||0)*2});}
    return;
  }
  if(e.type!=='drone'){
    const moving=e.type==='guard'?Math.abs(dx)>90&&Math.abs(dx)<900:e.type==='rusher'?Math.abs(dx)>350:false;
    const old=e.x;if(moving)e.x=clamp(e.x+e.facing*(e.type==='guard'?85:165)*dt,e.home.x+e.w/2+10,e.home.x+e.home.w-e.w/2-10);e.mode=old===e.x?'idle':'walk';
  }else e.mode='walk';
}
function updateMarks(g,dt){
  for(const m of g.room.marks||[]){
    if(g.room.cleared||!g.room.enemies.some(e=>e.id===m.owner&&e.hp>0)){m.done=true;continue;}
    m.time+=dt;if(m.time>=m.delay){if(Math.abs(g.player.x-m.x)<m.r&&Math.abs(g.player.y-m.y)<40)hurtPlayer(g,m.damage);effect(g,'burst',m.x,m.y-25,{color:'#e1a6ff'});m.done=true;}
  }g.room.marks=(g.room.marks||[]).filter(m=>!m.done);
}
function updateGuardian(g,e,dx,dy,dt){
  const enraged=e.hp<e.maxHp*.5,windup=e.windup??(enraged?.65:.95);
  if(e.mode==='attack'){
    const old=e.timer;e.timer+=dt;
    if(old<windup&&e.timer>=windup){
      const aim=Math.atan2(dy-40+e.h*.55,dx);
      if(e.act===0){
        // Two ground-hugging shockwaves: jumping is useful, not just DPS.
        for(const dir of [-1,1])g.projectiles.push({owner:'enemy',x:e.x,y:e.y-15,vx:dir*(enraged?410:310),vy:0,r:15,life:5,damage:12});
        if(Math.abs(dx)<130&&Math.abs(dy)<95)hurtPlayer(g,14,e.facing);
      }else if(e.act===1){
        for(let i=-2;i<=2;i++)enemyShot(g,e,aim+i*.16,enraged?390:320);
        if(enraged)for(const h of [-170,0,170])g.projectiles.push({owner:'enemy',x:clamp(g.player.x+h,30,g.room.width-30),y:g.player.y-300,vx:0,vy:240,r:10,life:3,damage:10});
      }else{
        const count=enraged?14:10;for(let i=0;i<count;i++)enemyShot(g,e,aim+i*Math.PI*2/count,240);
        for(let i=-1;i<=1;i++)enemyShot(g,e,aim+i*.12,360);
      }
      effect(g,'burst',e.x,e.y-35,{color:'#edb2f2'});g.shake=.15;
    }
    if(e.timer>=windup+.5){e.mode='idle';e.timer=0;e.cooldown=enraged?.7:1.2;}
  }else if(e.cooldown<=0){e.mode='attack';e.timer=0;e.windup=enraged?.65:.95;e.attackId++;}
  else{
    const chase=e.act===0?Math.abs(dx)>125:e.act===2&&Math.abs(dx)>380;
    const old=e.x;if(chase)e.x=clamp(e.x+e.facing*(enraged?155:95)*dt,e.home.x+80,e.home.x+e.home.w-80);
    e.mode=Math.abs(old-e.x)>.01?'walk':'idle';
  }
}
function updateHazards(g,dt){
  if(g.room.cleared)return;
  for(const h of g.room.hazards||[]){
    h.clock+=dt;const phase=(h.clock+h.offset)%h.period;
    if(phase>=h.period-.4&&Math.abs(g.player.x-h.x)<h.w/2+g.player.w/2&&Math.abs(g.player.y-h.y)<30)hurtPlayer(g,8+(g.room.act||0)*2);
  }
}
function segmentBodyEntry(ax,ay,bx,by,body,r=0){
  let lo=0,hi=1;
  for(const [a,d,min,max]of [[ax,bx-ax,body.x-body.w/2-r,body.x+body.w/2+r],[ay,by-ay,body.y-body.h-r,body.y+r]]){
    if(Math.abs(d)<1e-8){if(a<min||a>max)return null;continue;}
    const t0=(min-a)/d,t1=(max-a)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return null;
  }return lo;
}
export const segmentHitsBody=(...args)=>segmentBodyEntry(...args)!==null;
const enemyCenter=e=>({x:e.x,y:e.y-e.h*.5});
const distanceTo=(a,e)=>Math.hypot(e.x-a.x,e.y-e.h*.5-a.y);
function nearestChainTarget(g,b,origin=b,range=Infinity){
  // A -> B -> A is legal. Only the immediately previous victim is excluded.
  return g.room.enemies.filter(e=>e.hp>0&&e.id!==b.lastHitId&&distanceTo(origin,e)<=range).sort((a,c)=>distanceTo(origin,a)-distanceTo(origin,c))[0];
}
function redirectChain(g,b,victim){
  b.lastHitId=victim.id;
  if(b.bounces<=0){b.life=0;return;}
  const origin=enemyCenter(victim),target=nearestChainTarget(g,b,origin,b.chainRange??LOWER_CHAIN_RANGE);
  if(!target){b.life=0;return;}
  b.bounces--;b.chainOrigin=origin;b.targetId=target.id;b.hitDelay=CHAIN_HIT_INTERVAL;
  const destination=enemyCenter(target),angle=Math.atan2(destination.y-b.y,destination.x-b.x),speed=b.speed||Math.hypot(b.vx,b.vy);
  b.speed=speed;b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;
  b.life=Math.max(b.life,1.3,distanceTo(b,target)/Math.max(1,speed)+CHAIN_HIT_INTERVAL+.1);
  effect(g,'chain',origin.x,origin.y,{duration:.25});
}
function updateProjectiles(g,dt){
  const p=g.player;
  for(const b of g.projectiles){
    b.life-=dt;b.hitDelay=Math.max(0,(b.hitDelay||0)-dt);const oldX=b.x,oldY=b.y;let destination;
    if(b.homing){
      const target=g.room.enemies.find(e=>e.id===b.targetId&&e.hp>0&&e.id!==b.lastHitId)||nearestChainTarget(g,b,b.chainOrigin||b,b.chainOrigin?(b.chainRange??LOWER_CHAIN_RANGE):Infinity);
      if(target){
        const angle=Math.atan2(target.y-target.h*.5-b.y,target.x-b.x),speed=b.speed||Math.hypot(b.vx,b.vy);
        if(b.chainOrigin&&b.targetId!==target.id)b.life=Math.max(b.life,distanceTo(b,target)/Math.max(1,speed)+b.hitDelay+.1);
        b.targetId=target.id;
        if(b.chainOrigin){destination=enemyCenter(target);b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;}
        else{const mix=1-Math.exp(-dt*(b.homingStrength||7));b.vx+=(Math.cos(angle)*speed-b.vx)*mix;b.vy+=(Math.sin(angle)*speed-b.vy)*mix;const actual=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/actual*speed;b.vy=b.vy/actual*speed;}
      }else if(b.chainOrigin){b.life=0;continue;}
    }
    if(destination){
      // Close/overlapping targets still take >=80ms per hop. Stop at the target
      // while the short lockout expires instead of overshooting and circling.
      const dx=destination.x-b.x,dy=destination.y-b.y,distance=Math.hypot(dx,dy),travel=Math.min(distance,Math.hypot(b.vx,b.vy)*dt);
      if(distance>0){b.x+=dx/distance*travel;b.y+=dy/distance*travel;}
    }else{b.x+=b.vx*dt;b.y+=b.vy*dt;}
    if(b.owner==='player'&&b.hitDelay<=0){
      const contacts=g.room.enemies.filter(e=>e.hp>0&&(b.homing?e.id!==b.lastHitId:!b.hitIds.includes(e.id))).map(e=>({e,at:segmentBodyEntry(oldX,oldY,b.x,b.y,e,b.r)})).filter(c=>c.at!==null).sort((a,c)=>a.at-c.at);
      for(const {e,at}of contacts){
        if(e.hp<=0)continue;
        hitEnemy(g,e,b.damage,Math.sign(b.vx)*8,{critical:b.critical});b.hitIds.push(e.id);
        if(b.homing){b.x=oldX+(b.x-oldX)*at;b.y=oldY+(b.y-oldY)*at;redirectChain(g,b,e);}
        else if(b.pierce>0){b.pierce--;continue;}else b.life=0;
        break;
      }
    }else if(b.owner==='enemy'&&segmentHitsBody(oldX,oldY,b.x,b.y,p,b.r)){hurtPlayer(g,b.damage,Math.sign(b.vx));b.life=0;}
    if(b.x<0||b.x>g.room.width||b.y< -100||b.y>FLOOR+40)b.life=0;
  }
  g.projectiles=g.projectiles.filter(b=>b.life>0);
  for(const b of g.boulders){
    const previousBottom=b.y+b.r;b.life-=dt;b.vy+=1000*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.vx*dt/b.r;
    if(b.x<b.r||b.x>g.room.width-b.r){b.x=clamp(b.x,b.r,g.room.width-b.r);b.vx*=-1;}
    const floor=g.room.platforms.filter(p=>b.x+b.r>p.x&&b.x-b.r<p.x+p.w&&previousBottom<=p.y+.5&&b.y+b.r>=p.y).sort((a,c)=>a.y-c.y)[0];
    if(b.vy>0&&floor){b.y=floor.y-b.r;b.vy=-Math.max(160,Math.abs(b.vy)*.6);}
    if(b.y>FLOOR+180)b.life=0;
    for(const e of g.room.enemies)if(e.hp>0&&Math.hypot(clamp(b.x,e.x-e.w/2,e.x+e.w/2)-b.x,clamp(b.y,e.y-e.h,e.y)-b.y)<=b.r&&(b.hits[e.id]===undefined||g.time-b.hits[e.id]>.32)){b.hits[e.id]=g.time;hitEnemy(g,e,b.damage,Math.sign(b.vx)*20,{critical:b.critical,guardBreak:true});}
  }
  g.boulders=g.boulders.filter(b=>b.life>0);
}
export function chooseReward(g,id){
  if(g.phase!=='reward'||!g.choices.includes(id))return false;
  grantItem(g,id);g.room.rewardTaken=true;g.world.nodes.find(n=>n.id===g.currentNodeId).completed=true;if(g.room.shrine)g.room.shrine.used=true;g.phase='playing';g.choices=[];notifyGame(g,g.lastPickup);return true;
}
export function grantItem(g,id){
  if(!ITEMS[id])return false;const before=g.stats,changes=itemChanges(before,id);g.stats=applyBuildItem(before,id);g.buildRevision++;
  syncBuildResources(g,before);
  g.lastPickup=`${ITEMS[id].name} ×${g.stats.inventory[id]} · ${changes.slice(0,2).join(' / ')}`;return true;
}
function syncBuildResources(g,before){
  g.player.shield=Math.min(g.stats.shieldMax,g.player.shield+Math.max(0,g.stats.shieldMax-before.shieldMax));
  for(const key of ['skillCooldown','attackCooldown','dashCooldown'])g.player[key]*=g.stats[key]/before[key];
}
export const rewardRerollCost=g=>8+(g.room.rewardRerolls||0)*6;
export function rerollReward(g){if(g.phase!=='reward'||(g.room.rewardRerolls||0)>=2||g.coins<rewardRerollCost(g))return false;g.coins-=rewardRerollCost(g);g.room.rewardRerolls=(g.room.rewardRerolls||0)+1;g.choices=rewardChoices(g.rewardRandom,g.stats,g.room,g.choices);return true;}
export function canOpenShop(g){
  const m=g.room.merchant,p=g.player;
  return Boolean(['playing','build'].includes(g.phase)&&g.room.cleared&&g.room.rewardTaken&&m&&p.grounded&&Math.abs(p.x-m.x)<=100&&Math.abs(p.y-m.y)<=40);
}
export function openShop(g){
  if(!canOpenShop(g))return false;
  g.room.shop??=createMarket(g);if(!g.economy.visitedShops.includes(g.currentNodeId))g.economy.visitedShops.push(g.currentNodeId);
  g.phase='shop';return true;
}
function spend(g,amount){g.coins-=amount;g.economy.coinsSpent+=amount;}
function receipt(g,message){g.lastTransaction=message;notifyGame(g,message);return true;}
export function buyShopItem(g,index){
  const offer=g.room.shop?.stock[index];if(g.phase!=='shop'||!offer||offer.sold)return false;
  const price=offerPrice(g,offer);if(g.coins<price)return false;
  spend(g,price);offer.sold=true;if(g.economy.coupons>0)g.economy.coupons--;
  grantItem(g,offer.id);g.economy.purchases++;g.economy.stamps++;
  const earned=g.economy.stamps>=3;if(earned){g.economy.stamps-=3;g.economy.coupons++;}
  return receipt(g,`${ITEMS[offer.id].name} 구매 −${price} G · 보유 ×${g.stats.inventory[offer.id]}${earned?' · 20% 할인권 획득!':''}`);
}
export function rerollShop(g){
  const shop=g.room.shop,price=shopRerollCost(g);if(g.phase!=='shop'||!shop||shop.rerolls>=3||g.coins<price)return false;
  spend(g,price);shop.rerolls++;shop.stock=marketStock(g.shopRandom,g.stats,g.room.index,shop.stock.map(o=>o.id));
  return receipt(g,`진열 교체 −${price} G · 할인 상품도 새로 입고됐어요.`);
}
export function sellShopItem(g,id){
  if(g.phase!=='shop'||!g.room.shop||!ITEMS[id]||!(g.stats.inventory[id]>0))return false;
  const before=g.stats,price=salePrice(id);g.stats=removeBuildItem(before,id);syncBuildResources(g,before);g.buildRevision++;
  g.coins+=price;g.economy.sales++;g.economy.salesEarned+=price;
  return receipt(g,`${ITEMS[id].name} 1개 판매 +${price} G · 남은 수량 ${g.stats.inventory[id]||0}개`);
}
export function buyShopHealing(g){
  const shop=g.room.shop;if(g.phase!=='shop'||!shop||shop.healed||g.coins<HEAL_PRICE||g.stats.hp>=g.stats.maxHp)return false;
  spend(g,HEAL_PRICE);shop.healed=true;const amount=Math.min(g.stats.maxHp-g.stats.hp,Math.ceil(g.stats.maxHp*.3));g.stats.hp+=amount;
  return receipt(g,`따뜻한 간식 −${HEAL_PRICE} G · 체력 ${Math.round(amount)} 회복`);
}
export function buySealedBag(g){
  const shop=g.room.shop;if(g.phase!=='shop'||!shop||shop.bagOpened||g.coins<BAG_PRICE)return false;
  spend(g,BAG_PRICE);shop.bagOpened=true;g.economy.bags++;const id=rollSealedBag(g.shopRandom);grantItem(g,id);
  return receipt(g,`봉인 주머니 −${BAG_PRICE} G → ${ITEMS[id].name} · 보유 ×${g.stats.inventory[id]}`);
}
export function acceptContract(g,id){
  if(g.phase!=='shop'||!g.room.shop||!CONTRACTS[id]||['pending','active'].includes(g.contract?.status))return false;
  g.contract={id,status:'pending',acceptedNodeId:g.currentNodeId,elapsed:0};
  return receipt(g,`${CONTRACTS[id].name} 수락 · 다음 전투 한 번에 적용돼요. 휴식·보물·상점에서는 대기해요.`);
}
function activateContract(g){
  const c=g.contract;if(c?.status!=='pending'||g.room.cleared||!g.room.enemies.length)return;
  c.status='active';c.nodeId=g.currentNodeId;c.elapsed=0;
  if(c.id==='frenzy')for(const e of g.room.enemies){e.maxHp=Math.ceil(e.maxHp*1.35);e.hp=e.maxHp;}
}
function settleContract(g,dead=false){
  const c=g.contract;if(!c||!['pending','active'].includes(c.status)||(!dead&&(c.status!=='active'||c.nodeId!==g.currentNodeId)))return;
  const success=!dead&&(c.id==='frenzy'||(c.id==='haste'&&c.elapsed<=60+1e-8)||(c.id==='flawless'&&!(g.room.hpDamage>0)));
  c.status=success?'completed':'failed';g.economy[success?'contractsWon':'contractsLost']++;
  if(success){g.coins+=CONTRACTS[c.id].coins;if(c.id==='flawless')g.economy.coupons++;}
  g.room.contractResult=`${CONTRACTS[c.id].name} ${success?`성공! +${CONTRACTS[c.id].coins} G${c.id==='flawless'?' · 할인권 +1':''}`:'실패 · 추가 페널티 없음'}`;
}
export function enterNextRoom(g){
  if(g.phase!=='playing'||!g.room.cleared||!g.room.rewardTaken||!g.player.grounded||Math.abs(g.player.x-g.room.exit.x)>90||Math.abs(g.player.y-g.room.exit.y)>40)return false;
  g.world.nodes.find(n=>n.id===g.currentNodeId).completed=true;
  if(g.room.index===STAGES-1){g.phase='won';return true;}
  g.phase='route';return true;
}
export function routeOptions(g){const node=g.world.nodes.find(n=>n.id===g.currentNodeId);return g.world.nodes.filter(n=>node.next.includes(n.id)&&!n.visited);}
export function chooseRoute(g,id){
  if(g.phase!=='route')return false;const node=routeOptions(g).find(n=>n.id===id);if(!node)return false;
  const room=g.rooms[id]??generateRoom(node);g.rooms[id]=room;g.room=room;g.currentNodeId=id;node.visited=true;
  activateContract(g);
  Object.assign(g.player,{x:room.spawn.x,y:room.spawn.y,vx:0,vy:0,action:null,grounded:true,jumps:0,coyote:.1,jumpBuffer:0,dash:0,dashHits:[],shield:g.stats.shieldMax,skillTime:0,invulnerable:1});
  g.checkpoint={...room.spawn};g.projectiles=[];g.boulders=[];g.effects=[];g.camera=0;g.cameraY=0;g.roomIntro=2.6;g.phase='playing';g.previous={};g.noticeTime=0;return true;
}
function offerReward(g){
  g.choices=rewardChoices(g.rewardRandom,g.stats,g.room);
  g.phase='reward';
}
export const cashReward=g=>(g.room.rewardKind==='gold'?28:14)+(g.room.act||0)*8;
export function chooseGoldReward(g){
  if(g.phase!=='reward'||g.room.type==='boss'||g.room.type==='treasure')return false;
  const amount=cashReward(g);g.coins+=amount;g.room.rewardTaken=true;g.world.nodes.find(n=>n.id===g.currentNodeId).completed=true;g.choices=[];g.phase='playing';notifyGame(g,`아이템 대신 상점 자금 +${amount} G`);return true;
}
export function interactRoom(g){
  if(g.phase!=='playing')return false;const shrine=g.room.shrine,p=g.player;
  if(shrine&&!shrine.used&&p.grounded&&Math.abs(p.x-shrine.x)<85&&Math.abs(p.y-shrine.y)<40){
    if(shrine.kind==='treasure')offerReward(g);
    else{g.stats.hp=Math.min(g.stats.maxHp,g.stats.hp+Math.ceil(g.stats.maxHp*.4));shrine.used=true;g.room.rewardTaken=true;g.world.nodes.find(n=>n.id===g.currentNodeId).completed=true;notifyGame(g,'따뜻한 쉼터 · 최대 체력의 40% 회복');}return true;
  }
  if(canOpenShop(g)&&Math.abs(p.x-g.room.merchant.x)<Math.abs(p.x-g.room.exit.x))return openShop(g);
  return enterNextRoom(g);
}
export function tick(g,input={},dt=1/120){
  if(g.phase!=='playing')return;
  dt=clamp(dt,0,1/30);g.time+=dt;g.elapsed+=dt;
  if(g.contract?.status==='active'&&g.contract.nodeId===g.currentNodeId&&!g.room.cleared)g.contract.elapsed+=dt;
  const pressed={};for(const key of ['jump','dash','skill','interact'])pressed[key]=Boolean(input[key+'Pressed']||(input[key]&&!g.previous[key]));
  updatePlayer(g,input,pressed,dt);updateEnemies(g,dt);updateProjectiles(g,dt);updateHazards(g,dt);updateMarks(g,dt);
  for(const item of g.room.pickups)if(!item.taken&&Math.hypot(g.player.x-item.x,g.player.y-30-item.y)<g.stats.pickupRadius){item.taken=true;if(item.kind==='heart'){g.stats.hp=Math.min(g.stats.maxHp,g.stats.hp+15);effect(g,'text',item.x,item.y,{text:'+15 HP',color:'#ffb6be'});}else{g.coins+=5;effect(g,'text',item.x,item.y,{text:'+5',color:'#ffe09b'});}}
  for(const e of g.effects)e.time+=dt;g.effects=g.effects.filter(e=>e.time<e.duration);
  g.noticeTime=Math.max(0,g.noticeTime-dt);g.roomIntro=Math.max(0,g.roomIntro-dt);g.shake=Math.max(0,g.shake-dt);
  const cameraGoal=clamp(g.player.x-VIEW.width*.42+g.player.facing*65,0,g.room.width-VIEW.width);g.camera+=(cameraGoal-g.camera)*(1-Math.exp(-dt*5));
  g.cameraY+=(clamp(g.player.y-340,-230,0)-g.cameraY)*(1-Math.exp(-dt*6));
  if(g.phase==='playing'&&!g.room.cleared&&g.room.enemies.every(e=>e.hp<=0)){g.room.cleared=true;g.projectiles=g.projectiles.filter(b=>b.owner==='player');if(!(g.room.hpDamage>0)){g.room.cleanBonus=8;g.coins+=8;g.player.skillCooldown=Math.max(0,g.player.skillCooldown-3);}settleContract(g);offerReward(g);}
  if(pressed.interact)interactRoom(g);g.previous={...input};
}
