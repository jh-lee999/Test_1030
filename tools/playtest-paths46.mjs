// Input-only balancing probe. Never grants health, items, position or kills.
// This is a diagnostic opponent, NOT evidence that humans will find the game fun.
import {createGame,tick,chooseReward,routeOptions,chooseRoute,interactRoom,buyShopHealing,buyShopItem} from '../platformer-engine.js';
import {findJump} from '../platformer-world.js';
import {PHYSICS} from '../platformer-physics.js';
import {PATHS,skillCost} from '../platformer-paths.js';
import {ITEMS} from '../platformer-build.js';

export function createPilot(){
  let roomId,edges=[],flight=null,charge=false,venting=false;
  return g=>{
    const p=g.player,room=g.room,input={};
    if(roomId!==room.nodeId){roomId=room.nodeId;flight=null;edges=[];for(const a of room.platforms)for(const b of room.platforms){const edge=findJump(a,b,room.platforms);if(edge)edges.push(edge);}}
    if(g.phase==='reward'){
      const wanted={ricochet:'echo',barrage:'overload',boulder:'predator'}[g.stats.style];
      const rank=id=>ITEMS[id].tags.reduce((n,t)=>n+Number(PATHS[g.stats.style].tags.includes(t)),0);
      chooseReward(g,g.rewardMode==='awakening'?wanted:[...g.choices].sort((a,b)=>rank(b)-rank(a))[0]);return {};
    }
    if(g.phase==='route'){
      const rank=n=>n.type==='elite'&&!g.stats.awakening?10:n.type==='rest'&&g.stats.hp<g.stats.maxHp*.65?12:n.type==='treasure'?8:n.type==='shop'&&g.coins>35?6:1;
      chooseRoute(g,routeOptions(g).sort((a,b)=>rank(b)-rank(a))[0].id);return {};
    }
    if(g.phase==='shop'){buyShopHealing(g);for(let i=0;i<3;i++)buyShopItem(g,i);g.phase='playing';return {};}
    if(g.phase!=='playing')return {};
    const enemies=room.enemies.filter(e=>e.hp>0),e=enemies.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    const dest=e?{x:e.x,y:e.y,platformId:e.type==='drone'?e.home.id:e.platformId||e.home.id}:room.shrine&&!room.shrine.used?room.shrine:room.exit;
    const current=p.platformId||room.platforms.find(f=>Math.abs(p.y-f.y)<2&&p.x>=f.x&&p.x<=f.x+f.w)?.id;
    let aim=p.x;
    if(flight){aim=flight.aimX;input.jump=true;if(p.grounded&&g.time-flight.started>.1)flight=null;}
    else if(current&&dest.platformId!==current){
      const queue=[{id:current,path:[]}],seen=new Set([current]);let path;
      while(queue.length){const n=queue.shift();if(n.id===dest.platformId){path=n.path;break;}for(const edge of edges.filter(v=>v.from===n.id))if(!seen.has(edge.to)){seen.add(edge.to);queue.push({id:edge.to,path:[...n.path,edge]});}}
      if(path?.length){const next=path[0];aim=next.startX;if(Math.abs(p.x-aim)<6&&Math.abs(p.vx)<40){flight={...next,started:g.time};aim=flight.aimX;input.jump=true;}}
    }else{aim=e?(Math.abs(e.x-p.x)>220?e.x-Math.sign(e.x-p.x)*190:p.x):dest.x;}
    const dx=aim-p.x,brake=p.vx*p.vx/(2*PHYSICS.braking),axis=Math.abs(dx)>brake+3?Math.sign(dx):0;
    input.left=axis<0;input.right=axis>0;
    if(e){
      const aligned=Math.abs(p.y-e.y)<100,near=Math.abs(p.x-e.x)<g.stats.projectileRange;
      if(!axis&&!flight&&p.facing!==Math.sign(e.x-p.x)){input.left=e.x<p.x;input.right=e.x>p.x;}
      if(g.stats.style==='boulder'){charge=aligned&&near&&(!p.charging||p.chargeTime<.82);input.attack=charge;if(p.charging&&!charge){input.left=e.x<p.x;input.right=e.x>p.x;}}else input.attack=aligned&&near;
      if(g.stats.style==='barrage'){if(p.heat>=72)venting=true;if(p.heat<22)venting=false;if(venting)input.attack=false;}
      if(aligned&&Math.abs(p.x-e.x)<500&&p.focus>=skillCost(g.stats)&&p.skillCooldown<=0&&!p.action)input.skill=true;
      const danger=room.marks?.some(m=>m.delay-m.time<.25&&Math.abs(m.x-p.x)<m.r)||g.projectiles.some(b=>b.owner==='enemy'&&Math.hypot(b.x-p.x,b.y-p.y+40)<95)||enemies.some(q=>q.mode==='attack'&&q.timer>.35&&q.timer<.65&&Math.abs(q.x-p.x)<130);
      if(danger&&!flight){const support=room.platforms.some(f=>f.y===p.y&&p.x+p.facing*160>f.x+20&&p.x+p.facing*160<f.x+f.w-20);if(p.dashCooldown<=0&&support)input.dash=true;else if(p.grounded)input.jump=true;}
    }else if(p.grounded&&Math.abs(p.x-dest.x)<45&&Math.abs(p.y-dest.y)<30)interactRoom(g);
    return input;
  };
}

export function probe(style,seed,{seconds=240,policy='pilot'}={}){
  const g=createGame(seed,style),pilot=createPilot(),rooms=[];let lastRoom=g.currentNodeId,lastTime=0,lastHp=g.stats.hp,heatLocks=0,heated=false;
  for(let i=0;i<seconds*120&&!['dead','won'].includes(g.phase);i++){
    tick(g,policy==='hold'?{attack:true}:pilot(g));
    if(g.player.overheated&&!heated)heatLocks++;heated=g.player.overheated;
    if(lastRoom!==g.currentNodeId){rooms.push({room:lastRoom,seconds:+(g.time-lastTime).toFixed(1),hpLost:+(lastHp-g.stats.hp).toFixed(1)});lastRoom=g.currentNodeId;lastTime=g.time;lastHp=g.stats.hp;}
  }
  return {style,seed,policy,phase:g.phase,room:g.room.index,kills:g.stats.kills,hp:+g.stats.hp.toFixed(1),seconds:+g.time.toFixed(1),shots:g.basicShots||0,skills:g.skillCasts||0,awakening:g.stats.awakening,heatLocks,rooms};
}
if(typeof process!=='undefined'&&import.meta.url===`file://${process.argv[1]}`)for(const style of Object.keys(PATHS))for(const seed of ['1793682210169','46'])for(const policy of ['hold','pilot'])console.log(JSON.stringify(probe(style,seed,{policy})));
