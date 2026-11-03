import {PHYSICS,approach,landBody} from './platformer-physics.js?v=38';

export const WORLD_VERSION=41,STAGES=7,FLOOR=634;
export const ROOM_TYPES={
  combat:{name:'전투',symbol:'⚔',color:'#e9c989',reward:'아이템 1개'},
  elite:{name:'정예',symbol:'◆',color:'#f2a39a',reward:'학년 아이템 선택지 보장'},
  treasure:{name:'보물',symbol:'✦',color:'#f5dc8f',reward:'적 없이 아이템 1개'},
  rest:{name:'휴식',symbol:'♥',color:'#a8d9b0',reward:'최대 체력의 40% 회복'},
  shop:{name:'상점',symbol:'¤',color:'#f3cf83',reward:'상품 · 판매 · 회복 · 계약 (이용 선택)'},
  boss:{name:'보스',symbol:'♛',color:'#d3b0f2',reward:'아공간 탈출'},
};
export const BIOMES={
  grove:{name:'햇살 숲길',background:'forest',material:'wood',top:'#a7be67',edge:'#384f2b',body:'#5c452e',grain:'#84623d',fog:'#486027',prop:'flower',minY:500,maxY:634,length:[6,9],width:[230,360]},
  canopy:{name:'나무 위 샛길',background:'forest',material:'wood',top:'#bed596',edge:'#42705a',body:'#64523b',grain:'#91734b',fog:'#244f4e',prop:'lantern',minY:410,maxY:570,length:[8,11],width:[160,240]},
  ruins:{name:'무너진 회랑',background:'night',material:'stone',top:'#aeb7c7',edge:'#465266',body:'#596070',grain:'#7f889a',fog:'#282b4b',prop:'pillar',minY:440,maxY:634,length:[7,10],width:[210,330]},
  hollow:{name:'반딧불 골짜기',background:'night',material:'wood',top:'#b4a9cf',edge:'#55516b',body:'#63506b',grain:'#917997',fog:'#352c52',prop:'mushroom',minY:450,maxY:610,length:[6,9],width:[250,370]},
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const integer=(rng,a,b)=>a+Math.floor(rng()*(b-a+1));
const choose=(rng,values)=>values[Math.floor(rng()*values.length)];
export function seedNumber(value){
  if(typeof value==='number'&&Number.isFinite(value))return value>>>0;
  const text=String(value).trim();if(/^\d+$/.test(text)&&Number(text)<=4294967295)return Number(text)>>>0;
  let hash=2166136261;for(const c of text)hash=Math.imul(hash^c.codePointAt(0),16777619);return hash>>>0;
}
export function seededRandom(seed){let n=seedNumber(seed);return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

// A layered directed graph: every node is reachable, every route reaches the
// boss, and adjacent layers can branch AND merge. Independent RNG streams keep
// combat timing / item rolls from changing future geometry.
export function generateWorld(seed){
  const root=seedNumber(seed),rng=seededRandom(`${root}:graph:v${WORLD_VERSION}`),nodes=[],layers=[];
  const types=[['combat'],['treasure','combat','shop'],['combat','elite','combat'],['rest','shop'],['combat','elite','combat'],['rest','elite','shop'],['boss']];
  for(let depth=0;depth<STAGES;depth++){
    const count=depth===0||depth===STAGES-1?1:depth===3?2:[1,5].includes(depth)?3:integer(rng,2,3),layer=[];
    const pool=[...types[depth]];if(rng()>.5)pool.reverse();
    for(let lane=0;lane<count;lane++){
      const id=`${depth}:${lane}`,node={id,depth,lane,type:pool[lane],biome:choose(rng,Object.keys(BIOMES)),seed:seedNumber(`${root}:room:${id}`),next:[],visited:false,completed:false};nodes.push(node);layer.push(node);
    }layers.push(layer);
  }
  // Preserve useful alternatives even when a layer has only two nodes.
  layers[1][0].type='treasure';layers[1][1].type='combat';layers[1][2].type='shop';layers[2][0].type='elite';layers[3][0].type='rest';layers[3][1].type='shop';layers[5][0].type='rest';layers[5][1].type='elite';layers[5][2].type='shop';
  for(let depth=0;depth<STAGES-1;depth++){
    const from=layers[depth],to=layers[depth+1],link=(a,b)=>{if(!a.next.includes(b.id))a.next.push(b.id);};
    for(const a of from){const center=Math.round(a.lane/Math.max(1,from.length-1)*(to.length-1));link(a,to[center]);if(to.length>1)link(a,to[clamp(center+(center===to.length-1?-1:1),0,to.length-1)]);}
    for(const b of to)if(!from.some(a=>a.next.includes(b.id)))link(from[Math.round(b.lane/Math.max(1,to.length-1)*(from.length-1))],b);
    for(const b of to){const parentBiomes=from.filter(a=>a.next.includes(b.id)).map(a=>a.biome),allowed=Object.keys(BIOMES).filter(id=>!parentBiomes.includes(id));b.biome=choose(rng,allowed.length?allowed:Object.keys(BIOMES));}
  }
  nodes[0].visited=true;
  return{version:WORLD_VERSION,seed:root,nodes,startId:nodes[0].id,bossId:layers.at(-1)[0].id};
}

// Returns an executable single-jump witness, not just a distance heuristic.
// Full-height jumps from rest must work with the starting (unupgraded) speed.
// Landing checks include every platform, so intervening floors are respected.
export function findJump(from,to,platforms){
  if(from.id===to.id||from.y-to.y>115)return null;
  const gap=Math.max(0,to.x-from.x-from.w,from.x-to.x-to.w);
  if(gap>135)return null;
  const overlap=Math.min(from.x+from.w,to.x+to.w)-Math.max(from.x,to.x);
  const preferred=overlap>50?clamp(to.x+to.w/2,from.x+28,from.x+from.w-28):to.x>from.x?from.x+from.w-28:from.x+28;
  const starts=[...new Set([preferred,from.x+28,from.x+from.w-28])],aims=[clamp(preferred,to.x+30,to.x+to.w-30),to.x+to.w/2,to.x+30,to.x+to.w-30];
  for(const startX of starts)for(const aimX of aims){
    const body={x:startX,y:from.y,vx:0,vy:-PHYSICS.jump,w:PHYSICS.bodyWidth,jumps:1};
    for(let frame=0;frame<180;frame++){
      const dx=aimX-body.x,brake=body.vx*body.vx/(2*PHYSICS.braking),axis=Math.abs(dx)>brake+2?Math.sign(dx):0;
      body.vx=approach(body.vx,axis*PHYSICS.baseSpeed,PHYSICS.step*(axis?PHYSICS.acceleration:PHYSICS.braking));
      body.vy=Math.min(PHYSICS.maxFall,body.vy+PHYSICS.gravity*PHYSICS.step);body.x+=body.vx*PHYSICS.step;landBody(body,platforms,PHYSICS.step);
      if(body.grounded){if(body.platformId===to.id&&body.x>=to.x+18&&body.x<=to.x+to.w-18)return{from:from.id,to:to.id,startX,aimX,frames:frame+1};break;}
    }
  }return null;
}

export function validateRoom(room){
  const errors=[],platforms=room.platforms,byId=new Map(platforms.map(p=>[p.id,p]));
  const contains=(p,x,y,margin=0)=>p&&x>=p.x+margin&&x<=p.x+p.w-margin&&y===p.y;
  if(!contains(byId.get(room.spawn.platformId),room.spawn.x,room.spawn.y,32))errors.push('unsafe spawn');
  if(!contains(byId.get(room.exit.platformId),room.exit.x,room.exit.y,50))errors.push('unsupported exit');
  for(const p of platforms)if(p.w<120||p.x<0||p.x+p.w>room.width||p.y<290||p.y>FLOOR)errors.push(`invalid platform ${p.id}`);
  const reachable=new Set([room.spawn.platformId]),witnesses=[],queue=[byId.get(room.spawn.platformId)],cache=new Map();
  const edge=(from,to)=>{const key=from.id+':'+to.id;if(!cache.has(key))cache.set(key,findJump(from,to,platforms));return cache.get(key);};
  while(queue.length){const from=queue.shift();if(!from)break;for(const to of platforms){if(reachable.has(to.id))continue;const witness=edge(from,to);if(witness){reachable.add(to.id);queue.push(to);witnesses.push(witness);}}}
  const exitReachable=new Set([room.exit.platformId]),back=[byId.get(room.exit.platformId)],returnWitnesses=[];
  while(back.length){const to=back.shift();if(!to)break;for(const from of platforms){if(exitReachable.has(from.id))continue;const witness=edge(from,to);if(witness){exitReachable.add(from.id);back.push(from);returnWitnesses.push(witness);}}}
  for(const p of platforms)if(!reachable.has(p.id))errors.push(`unreachable platform ${p.id}`);
  for(const p of platforms)if(!exitReachable.has(p.id))errors.push(`no exit path from ${p.id}`);
  if(!reachable.has(room.exit.platformId))errors.push('unreachable exit');
  for(const e of room.enemies){if(!reachable.has(e.home.id)||!contains(e.home,e.x,e.y,e.w/2+8))errors.push(`unreachable enemy ${e.id}`);if(Math.abs(e.x-room.spawn.x)<340)errors.push('spawn ambush');}
  for(const item of room.pickups)if(!reachable.has(item.platformId)||!contains(byId.get(item.platformId),item.x,item.y+26,20))errors.push('unreachable pickup');
  if(room.shrine&&(!reachable.has(room.shrine.platformId)||!contains(byId.get(room.shrine.platformId),room.shrine.x,room.shrine.y,30)))errors.push('unreachable shrine');
  if(room.merchant&&(!reachable.has(room.merchant.platformId)||!contains(byId.get(room.merchant.platformId),room.merchant.x,room.merchant.y,60)))errors.push('unreachable merchant');
  return{valid:errors.length===0,errors,reachable:[...reachable],exitReachable:[...exitReachable],witnesses,returnWitnesses};
}

function buildRoom(node,attempt=0,simple=false){
  const rng=seededRandom(`${node.seed}:layout:${attempt}`),profile=BIOMES[node.biome],event=['rest','treasure','shop'].includes(node.type),boss=node.type==='boss';
  const platforms=[],add=(x,y,w,ground=false,optional=false)=>{const p={id:`p${platforms.length}`,x:Math.round(x),y:Math.round(y),w:Math.round(w),ground,optional,material:profile.material};platforms.push(p);return p;};
  const first=add(0,FLOOR,480,true),main=[first];
  if(boss){first.w=integer(rng,1850,2250);main.push(first);add(360,530,240);add(first.w-650,530,250);add(430,430,220);}
  else{
    const count=event?3:integer(rng,...profile.length);
    for(let i=0;i<count;i++){
      const previous=main.at(-1),rise=simple?0:choose(rng,[-90,-70,-40,0,40,70,90]),y=event?FLOOR:clamp(previous.y+rise,profile.minY,profile.maxY),gap=simple?45:y<previous.y?integer(rng,35,65):integer(rng,45,100);
      main.push(add(previous.x+previous.w+gap,y,event?integer(rng,220,300):integer(rng,...profile.width),node.biome!=='canopy'&&rng()>.3));
    }
    const previous=main.at(-1);main.push(add(previous.x+previous.w+50,previous.y,380,true));
    if(!event&&!simple)for(let i=1;i<main.length-1;i++){
      if(rng()>(node.biome==='canopy'?.25:.5))continue;const p=main[i],y=p.y-integer(rng,85,105);
      if(y>=300)add(p.x+integer(rng,0,Math.max(0,p.w-150)),y,integer(rng,140,Math.min(220,p.w)),false,true);
    }
  }
  const last=main.at(-1),width=last.x+last.w,spawn={x:150,y:first.y,platformId:first.id},exit={x:width-110,y:last.y,platformId:last.id};
  const enemies=[],pickups=[];
  const addEnemy=(type,p)=>{const elite=node.type==='elite',hp=Math.round((type==='ghost'?460+node.depth*12:type==='archer'?34+node.depth*5:42+node.depth*6)*(elite?1.45:1)),w=type==='ghost'?126:44;
    enemies.push({id:enemies.length,type,x:p.x+p.w*(.4+rng()*.2),y:p.y,home:p,hp,maxHp:hp,h:type==='ghost'?148:94,w,facing:-1,vx:0,clock:rng()*4,mode:'idle',timer:0,cooldown:1+rng(),flash:0,death:0,attackId:0});};
  if(boss){addEnemy('ghost',first);enemies[0].x=width*.72;}
  else if(!event){for(const p of main.slice(1,-1))if(rng()<.76)addEnemy(rng()<.35?'archer':'fan',p);for(const p of platforms.filter(p=>p.optional))if(rng()<.55)addEnemy('archer',p);if(!enemies.length)addEnemy('fan',main[1]);}
  if(!boss)for(const p of platforms.slice(1,-1))if(rng()<.6||p.optional)pickups.push({x:p.x+30,y:p.y-26,platformId:p.id,kind:rng()<.16?'heart':'coin',taken:false});
  const shrinePlatform=main[Math.floor(main.length/2)],shrine=['rest','treasure'].includes(node.type)?{kind:node.type,x:shrinePlatform.x+shrinePlatform.w/2,y:shrinePlatform.y,platformId:shrinePlatform.id,used:false}:null;
  const merchantPlatform=node.type==='shop'?shrinePlatform:node.depth===0?last:null;
  const merchant=merchantPlatform?{x:node.type==='shop'?merchantPlatform.x+merchantPlatform.w/2:exit.x-145,y:merchantPlatform.y,platformId:merchantPlatform.id}:null;
  const decorations=platforms.map(p=>({kind:profile.prop,x:p.x+Math.min(p.w-25,integer(rng,25,90)),y:p.y,variant:integer(rng,0,3)}));
  return{nodeId:node.id,index:node.depth,type:node.type,biome:node.biome,seed:node.seed,width,platforms,spawn,enemies,pickups,exit,shrine,merchant,decorations,cleared:event,rewardTaken:node.type==='shop',background:profile.background,title:`${profile.name} · ${ROOM_TYPES[node.type].name}`,generation:{attempt,fallback:simple}};
}
export function generateRoom(node){
  for(let attempt=0;attempt<8;attempt++){const room=buildRoom(node,attempt),validation=validateRoom(room);if(validation.valid){room.navigation=validation;return room;}}
  const room=buildRoom(node,8,true),validation=validateRoom(room);
  if(!validation.valid)throw Error(`Unsafe generated room: ${validation.errors.join(', ')}`);
  room.navigation=validation;return room;
}
