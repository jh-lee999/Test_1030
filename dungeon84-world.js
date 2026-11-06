import * as N from './dungeon81-nav.js';
export * from './dungeon81-nav.js';
const {hash,random,adjacent,distances,DIRECTIONS,blocked,nearestFree,walkableLayout,boundsFor,doorsFor}=N;
const dirs=Object.values(DIRECTIONS),pick=(rng,a)=>a[Math.floor(random(rng)*a.length)];
export function shuffle(rng,a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const stream=(seed,scope)=>({rng:hash(String(seed)+'::84::'+scope)});
export function floorRules(seed,level,branch='root'){const rng=stream(seed,'rules:'+level+':'+branch);return {style:pick(rng,['spine','forks','loop','winding']),curse:level>0&&random(rng)<.22?pick(rng,['dusk','lost','expanse']):'none',branch};}
function vacant(rs,p){return !rs.some(r=>r.x===p.x&&r.y===p.y)&&Math.abs(p.x)<=9&&Math.abs(p.y)<=9;}
function neighbors(rs,p){return rs.filter(r=>adjacent(r,p));}
function terminals(rs){const out=[];for(const from of rs.filter(r=>r.type==='combat'))for(const d of dirs){const p={x:from.x+d.dx,y:from.y+d.dy};if(vacant(rs,p)&&neighbors(rs,p).length===1&&!out.some(q=>q.x===p.x&&q.y===p.y))out.push({...p,parent:from.id});}return out;}
function weighted(rng,a,weight){let n=random(rng)*a.reduce((s,p)=>s+weight(p),0);for(const p of a){n-=weight(p);if(n<=0)return p;}return a.at(-1);}
export const ARCHETYPES=['pursuit','crossfire','bastion','swarm','ambush','siege','hazard'];
const floorCache=new Map();
export function generateFloor(seed,level=0,route='normal',branch='root'){const key=JSON.stringify([seed,level,route,branch]);if(!floorCache.has(key)){floorCache.set(key,buildFloor(seed,level,route,branch));if(floorCache.size>32)floorCache.delete(floorCache.keys().next().value);}return structuredClone(floorCache.get(key));}
function buildFloor(seed,level=0,route='normal',branch='root'){
 const rules=floorRules(seed,level,branch),settings=stream(seed,'specials:'+level),optional=[pick(settings,['sanctuary','forge']),pick(settings,['challenge','rush','bargain'])];
 if(random(settings)<.4)optional.push('puzzle');if(route==='wild')optional.push('archive');
 for(let attempt=0;attempt<160;attempt++){
  const rng=stream(seed,'topology:'+level+':'+attempt),rs=[{id:0,x:0,y:0,type:'start'}],spine=5+level,target=11+level+Math.floor(random(rng)*2)+(rules.curse==='expanse'?2:0);let failed=false;
  for(let i=0;i<spine;i++){const from=rs.at(-1),options=shuffle(rng,dirs).map(d=>({x:from.x+d.dx,y:from.y+d.dy})).filter(p=>vacant(rs,p)&&neighbors(rs,p).length===1);if(!options.length){failed=true;break;}const prev=rs.at(-2),dx=prev?from.x-prev.x:0,dy=prev?from.y-prev.y:0,chosen=weighted(rng,options,p=>rules.style==='spine'?(p.x-from.x===dx&&p.y-from.y===dy?5:1):rules.style==='winding'?(p.x-from.x===dx&&p.y-from.y===dy?.3:3):1);rs.push({id:rs.length,...chosen,type:'combat',spine:true});}if(failed)continue;
  for(let i=0;i<300&&rs.length<target;i++){const candidates=rs.filter(r=>r.type==='combat'&&r.id!==spine&&neighbors(rs,r).length<3),from=candidates.length?weighted(rng,candidates,r=>rules.style==='forks'?(r.spine?1:4):rules.style==='spine'?(r.spine?4:1):1):null;if(!from)break;const opts=shuffle(rng,dirs).map(d=>({x:from.x+d.dx,y:from.y+d.dy})).filter(p=>vacant(rs,p)&&neighbors(rs,p).length===1);if(!opts.length)continue;rs.push({id:rs.length,...opts[0],type:'combat',spine:false});}if(rs.length<target)continue;
  const ds=distances(rs),bossCell=terminals(rs).filter(p=>ds[p.parent]>=spine).sort((a,b)=>ds[b.parent]-ds[a.parent]||a.x-b.x||a.y-b.y)[0];if(!bossCell)continue;
  const boss={id:rs.length,...bossCell,type:'boss'};rs.push(boss);const bonus=shuffle(rng,dirs).map(d=>({x:boss.x+d.dx,y:boss.y+d.dy})).find(p=>vacant(rs,p)&&neighbors(rs,p).length===1);if(!bonus)continue;rs.push({id:rs.length,...bonus,type:'omen'});
  let placement=0;for(const [type,depth]of [['treasure',2],['shop',3+level],['treasure',spine-1],['supersecret',spine],...optional.map(t=>[t,3+level])]){
   const options=terminals(rs).filter(p=>placement===0?ds[p.parent]<=3:placement===1?ds[p.parent]>=2&&ds[p.parent]<spine:placement===2?ds[p.parent]>=3:true);if(!options.length){failed=true;break;}
   const cell=weighted(rng,options,p=>1/(1+Math.abs(ds[p.parent]+1-depth)*3));rs.push({id:rs.length,...cell,type});
   placement++;
  }if(failed)continue;
  // A loop is a real geometric connection, never a fake line through a leaf.
  if(rules.style==='loop'){
   const options=[];for(const r of rs.filter(r=>r.type==='combat'))for(const d of dirs){const p={x:r.x+d.dx,y:r.y+d.dy};if(!vacant(rs,p))continue;const ns=neighbors(rs,p);if(ns.length===2&&ns.every(n=>n.type==='combat')&&Math.abs(ds[ns[0].id]-ds[ns[1].id])<=2)options.push(p);}
   for(const p of shuffle(rng,options)){const next=[...rs,{id:rs.length,...p,type:'combat'}];if(distances(next)[boss.id]>=spine+1){rs.push(next.at(-1));break;}}
   const core=rs.filter(r=>['start','combat','boss'].includes(r.type));if(core.reduce((n,r)=>n+core.filter(q=>adjacent(r,q)).length,0)/2<core.length)continue;
  }
  const secrets=[];for(let y=-10;y<=10;y++)for(let x=-10;x<=10;x++){const p={x,y};if(!vacant(rs,p))continue;const ns=neighbors(rs,p);if(ns.length&&ns.every(r=>['start','combat'].includes(r.type)))secrets.push({...p,score:ns.length});}if(!secrets.length)continue;
  const best=Math.max(...secrets.map(p=>p.score)),secret=pick(rng,secrets.filter(p=>p.score===best));rs.push({id:rs.length,...secret,type:'secret'});
  const depth=distances(rs),bag=shuffle(stream(seed,'archetypes:'+level),ARCHETYPES),assigned=new Map();for(const r of rs)if(depth[r.id]===undefined)depth[r.id]=1+Math.min(...neighbors(rs,r).map(n=>depth[n.id]??99));
  return rs.map(r=>{
   const rr=stream(seed,'room:'+level+':'+r.id),roll=random(rr),shape=r.type==='combat'&&depth[r.id]>2?(roll<.73?'normal':roll<.88?'wide':roll<.98?'tall':'grand'):'normal',width=['wide','grand'].includes(shape)?1920:1280,height=['tall','grand'].includes(shape)?1200:800;
   let archetype=r.id===1?'pursuit':bag.find(a=>!neighbors(rs,r).some(n=>assigned.get(n.id)===a))||bag[0];bag.push(bag.shift());assigned.set(r.id,archetype);
   return {...r,shape,view:{width,height},bounds:{left:130,right:width-130,top:205,bottom:height-120},style:rules.style,curse:rules.curse,branch,level,route,layoutKey:String(seed)+':world84:'+route+':'+branch+':'+level+':'+r.id,depth:depth[r.id],archetype,variant:Math.floor(random(rr)*8),visited:r.id===0,cleared:!['combat','boss'].includes(r.type),unlocked:!['treasure','secret','supersecret','archive','omen'].includes(r.type),enabled:r.type!=='omen',entered:0,rewarded:false,initialized:false,enemies:[],obstacles:[],terrain:[],pickups:[],artifacts:[],chests:[],pedestal:null,stock:[],restocks:0,challenge:{state:'ready',wave:0,damageStart:0},bossGift:false,event:null,rush:null,encounter:null,biome:null};
  });
 }
 throw Error('Unable to build validated84 floor: '+seed);
}
export const links=(g,r=g.rooms[g.room])=>Object.entries(doorsFor(r)).flatMap(([dir,d])=>{const to=g.rooms.find(t=>t.x===r.x+d.dx&&t.y===r.y+d.dy&&t.enabled!==false);return to?[{dir,to:to.id,...d}]:[];});
export function visibleRooms(g){const seen=g.rooms.filter(r=>r.visited);return g.rooms.filter(r=>r.enabled!==false&&(!['secret','supersecret','archive'].includes(r.type)||r.unlocked)&&(r.visited||!(g.curse==='lost'&&!g.curseLifted)&&seen.some(v=>adjacent(v,r))));}
export function scalePoint(r,p){const a=boundsFor(r);return {x:a.left+(p.x-130)*(a.right-a.left)/1020,y:a.top+(p.y-205)*(a.bottom-a.top)/475};}
const patterns={pursuit:[[.35,.35,100,48],[.65,.65,100,48]],crossfire:[[.3,.32,65,100],[.7,.68,65,100],[.5,.5,72,58]],bastion:[[.3,.3,100,58],[.7,.3,100,58],[.3,.7,100,58],[.7,.7,100,58]],swarm:[[.5,.25,100,55],[.5,.75,100,55]],ambush:[[.32,.5,65,110],[.68,.5,65,110]],siege:[[.25,.35,80,65],[.5,.55,110,55],[.75,.35,80,65]],hazard:[[.3,.28,80,60],[.7,.72,80,60],[.5,.5,70,55]]};
const geometryCache=new Map();
export function makeObstacles(seed,r){
 if(!['combat','boss','challenge','rush'].includes(r.type))return [];if(geometryCache.has(r.layoutKey))return geometryCache.get(r.layoutKey).map(o=>({...o}));
 const rng=stream(r.layoutKey,'geometry'),a=boundsFor(r),out=[],base=patterns[r.archetype]||patterns.bastion,candidates=[];
 for(const [u0,v0,w0,h0]of base){let u=u0,v=v0,w=w0,h=h0;if(r.variant&1)u=1-u;if(r.variant&2)v=1-v;if(r.variant&4){[u,v]=[v,u];[w,h]=[h,w];}candidates.push({x:a.left+u*(a.right-a.left)-w/2,y:a.top+v*(a.bottom-a.top)-h/2,w,h,kind:r.level===0?'rock':r.level===1?'shelf':'crystal',hp:1});}
 const extra=r.shape==='normal'?0:r.shape==='grand'?4:2;for(let i=0;i<extra;i++)candidates.push({x:a.left+140+random(rng)*(a.right-a.left-320),y:a.top+90+random(rng)*(a.bottom-a.top-230),w:64,h:64,kind:i%2?'gap':r.level===0?'log':'shelf',hp:i%2?-1:1});
 if(r.type!=='boss')for(let i=0;i<3;i++)candidates.push({x:a.left+120+random(rng)*(a.right-a.left-290),y:a.top+75+random(rng)*(a.bottom-a.top-175),w:52,h:42,kind:'pot',hp:1});
 for(const o of candidates){if(Object.values(doorsFor(r)).some(d=>o.x<d.x+85&&o.x+o.w>d.x-85&&o.y<d.y+85&&o.y+o.h>d.y-85)||out.some(t=>o.x<t.x+t.w+22&&o.x+o.w>t.x-22&&o.y<t.y+t.h+22&&o.y+o.h>t.y-22))continue;if(walkableLayout({...r,obstacles:[...out,o]}))out.push(o);}
 geometryCache.set(r.layoutKey,out.map(o=>({...o})));if(geometryCache.size>120)geometryCache.delete(geometryCache.keys().next().value);return out;
}
export function makeTerrain(seed,r){
 if(!['combat','boss','challenge','rush'].includes(r.type)||!(r.level===0||r.branch==='canopy'))return [];
 const room={...r,obstacles:makeObstacles(seed,r)},rng=stream(r.layoutKey,'terrain'),a=boundsFor(r),out=[];
 for(let i=0;i<(r.archetype==='hazard'?3:2);i++){const t={x:a.left+150+random(rng)*(a.right-a.left-430),y:a.top+80+random(rng)*(a.bottom-a.top-220),w:100+random(rng)*60,h:50+random(rng)*30,kind:'moss',factor:.62};if(!blocked(room,t.x+t.w/2,t.y+t.h/2,32))out.push(t);}return out;
}
export function makeBiome(seed,r){if(!['combat','boss','challenge','rush'].includes(r.type))return null;const room={...r,obstacles:makeObstacles(seed,r)},rng=stream(r.layoutKey,'hazards'),kind=r.route==='eclipse'?pick(rng,['books','spores','portals']):r.branch==='canopy'?'spores':r.branch==='echo'?'books':['spores','books','portals'][r.level],a=boundsFor(r),points=[];for(let i=0;i<(kind==='portals'?2:3);i++)points.push(nearestFree(room,{x:a.left+(i+1)*(a.right-a.left)/(kind==='portals'?3:4),y:a.top+(i%2?.67:.33)*(a.bottom-a.top)},32));return {kind,points,clock:-2,cycle:-1};}
export const templateIndex=(seed,r,wave=0)=>(ARCHETYPES.indexOf(r.archetype)+r.variant+wave)%12;
