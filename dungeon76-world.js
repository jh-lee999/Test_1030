import * as Base from './dungeon74-world.js';
import {encounterFor} from './dungeon76-encounters.js';
export {VIEW,FLOOR,DIRECTIONS,hash,random,adjacent,distances,links,blocked,blockedShot,moveBody,clearLine,findPath,steer,walkableLayout,nearestFree,reachable} from './dungeon74-world.js';
export const visibleRooms=g=>Base.visibleRooms(g).filter(r=>r.type!=='archive'||r.unlocked);
const {hash,random,adjacent,distances,blocked,walkableLayout,DIRECTIONS,nearestFree}=Base;
function leafCandidates(core){const out=[];for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++)if(!core.some(r=>r.x===x&&r.y===y)){const ns=core.filter(r=>adjacent(r,{x,y}));if(ns.length===1&&ns[0].type==='combat')out.push({x,y,parent:ns[0].id});}return out;}
// Grid adjacency is bipartite. Konig's theorem yields a maximum set of mutually
// nonadjacent leaf cells, so greedy placement cannot paint special rooms into a corner.
function independentLeaves(cells){
 const left=cells.filter(p=>(p.x+p.y)%2===0),right=cells.filter(p=>(p.x+p.y)%2!==0),match=new Map();
 function visit(l,seen){for(const r of right)if(adjacent(l,r)&&!seen.has(r)){seen.add(r);if(!match.has(r)||visit(match.get(r),seen)){match.set(r,l);return true;}}return false;}
 for(const l of left)visit(l,new Set());
 const matchedLeft=new Set(match.values()),zl=new Set(left.filter(l=>!matchedLeft.has(l))),zr=new Set(),queue=[...zl];
 for(const l of queue)for(const r of right)if(adjacent(l,r)&&match.get(r)!==l&&!zr.has(r)){zr.add(r);const next=match.get(r);if(next&&!zl.has(next)){zl.add(next);queue.push(next);}}
 return [...zl,...right.filter(r=>!zr.has(r))];
}
export function generateFloor(seed,level=0,route='normal'){
 const types=['boss','challenge','treasure','treasure','shop','secret','sanctuary','bargain','rush',...(route==='wild'?['archive']:[])];
 for(let attempt=0;attempt<=64;attempt++){
  const rng={rng:hash(seed+':topology76:'+route+':'+level+':'+attempt)};let rooms;
  if(attempt===64){
   const rotation=hash(seed+route+level)%4,rotate=(x,y)=>rotation===0?{x,y}:rotation===1?{x:-y,y:x}:rotation===2?{x:-x,y:-y}:{x:y,y:-x};
   rooms=[{id:0,x:0,y:0,type:'start'},...[-1,-2,-3,-4,-5,1,2,3,4,5].map((x,i)=>({id:i+1,...rotate(x,0),type:'combat'}))];
  }else{
   rooms=Base.generateFloor(seed+':core76:'+route+':'+attempt,level).filter(r=>['start','combat'].includes(r.type)).map(r=>({id:r.id,x:r.x,y:r.y,type:r.type}));
   while(rooms.length<11){const cs=[];for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if(!rooms.some(r=>r.x===x&&r.y===y)&&rooms.filter(r=>adjacent(r,{x,y})).length===1)cs.push({x,y});if(!cs.length)break;const p=cs[Math.floor(random(rng)*cs.length)];rooms.push({id:rooms.length,...p,type:'combat'});}
  }
  if(rooms.length!==11)continue;
  const ds=distances(rooms),cells=leafCandidates(rooms);let selected=null;
  const bosses=[...cells].sort((a,b)=>ds[b.parent]-ds[a.parent]);
  for(const boss of bosses){if(ds[boss.parent]<2)continue;const rest=independentLeaves(cells.filter(p=>p!==boss&&!adjacent(p,boss)));if(rest.length<types.length-1)continue;
   for(let i=rest.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}selected=[boss,...rest.slice(0,types.length-1)];break;}
  if(!selected)continue;
  types.forEach((type,i)=>rooms.push({id:rooms.length,x:selected[i].x,y:selected[i].y,type,level}));
  const depths=distances(rooms);
  return rooms.map(r=>({...r,level,route,layoutKey:seed+':world76:'+route+':'+level+':'+r.id,depth:depths[r.id]||0,visited:r.id===0,cleared:!['combat','boss'].includes(r.type),unlocked:!['treasure','secret','archive'].includes(r.type),entered:0,rewarded:false,initialized:false,enemies:[],obstacles:[],terrain:[],pickups:[],pedestal:null,stock:[],restocks:0,challenge:{state:'ready',wave:0,damageStart:0},bossGift:false,event:null,rush:null,encounter:null,biome:null,layoutFallback:attempt===64}));
 }
 throw Error('Invalid fallback topology');
}
function apron(o){
 const lanes=[{x:590,y:205,w:100,h:112},{x:590,y:568,w:100,h:112},{x:130,y:392,w:120,h:100},{x:1030,y:392,w:120,h:100}];
 return lanes.some(a=>o.x<a.x+a.w&&o.x+o.w>a.x&&o.y<a.y+a.h&&o.y+o.h>a.y);
}
const cache=new Map();
export function makeObstacles(seed,r){
 if(!['combat','boss','challenge','rush'].includes(r.type))return [];
 const key=r.layoutKey;if(cache.has(key))return cache.get(key).map(o=>({...o}));
 const plan=encounterFor(seed,r),rng={rng:hash(seed+':cover76:'+r.level+':'+r.id+':'+r.route)},candidates=r.type==='boss'?[{x:330,y:315,w:65,h:55},{x:880,y:315,w:65,h:55},{x:330,y:550,w:65,h:55},{x:880,y:550,w:65,h:55}].map(o=>({...o,kind:r.level===0?'rock':r.level===1?'shelf':'crystal',hp:1})):plan.cover;
 if(r.type!=='boss')for(let i=0;i<3;i++){const x=280+Math.floor(random(rng)*9)*80,y=random(rng)<.5?290:560;candidates.push({x,y,w:52,h:42,kind:i===2&&random(rng)<.35?'gap':'pot',hp:1});}
 const out=[];for(const o of candidates){if(o.kind==='gap')o.hp=-1;if(apron(o)||r.type!=='combat'&&o.x<725&&o.x+o.w>555&&o.y<500&&o.y+o.h>330||out.some(a=>o.x<a.x+a.w+18&&o.x+o.w>a.x-18&&o.y<a.y+a.h+18&&o.y+o.h>a.y-18))continue;const test={...r,obstacles:[...out,o],terrain:[]};if(walkableLayout(test))out.push(o);}
 cache.set(key,out.map(o=>({...o})));if(cache.size>128)cache.delete(cache.keys().next().value);return out.map(o=>({...o}));
}
export function makeTerrain(seed,r){
 if(r.level!==0||!['combat','boss','challenge','rush'].includes(r.type))return [];
 const geometry={...r,obstacles:makeObstacles(seed,r)},rng={rng:hash(seed+':roots76:'+r.id+':'+r.route)},out=[];
 for(const p of [{x:300,y:300},{x:810,y:510},{x:690,y:310}]){const t={x:p.x+Math.floor(random(rng)*35),y:p.y,w:128,h:62,kind:'moss',factor:.62};if(!blocked(geometry,t.x+t.w/2,t.y+t.h/2,28))out.push(t);}
 return out.slice(0,r.route==='wild'?3:2);
}
export function makeBiome(seed,r){
 if(!['combat','boss','challenge','rush'].includes(r.type))return null;
 const geometry={...r,obstacles:makeObstacles(seed,r),terrain:[]},points=(r.level===0?[{x:365,y:330},{x:865,y:550}]:r.level===1?[{x:380,y:345},{x:640,y:510},{x:900,y:345}]:[{x:350,y:330},{x:930,y:560}]).map(p=>nearestFree(geometry,p,32));
 return {kind:['spores','books','portals'][r.level],points,clock:-2,cycle:-1};
}
