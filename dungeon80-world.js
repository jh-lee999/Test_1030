import * as N from './dungeon80-nav.js';
import {generateFloor as oldFloor} from './dungeon76-world.js';
export * from './dungeon80-nav.js';
const {hash,random,adjacent,distances,DIRECTIONS,nearestFree,blocked,walkableLayout,boundsFor,doorsFor}=N;
export function floorRules(seed,level,branch='root'){
 const rng={rng:hash(seed+':rules80:'+level+':'+branch)},styles=['blob','snake','branchy','cross'];
 return {style:styles[Math.floor(random(rng)*4)],curse:level>0&&random(rng)<.27?['dusk','lost','expanse'][Math.floor(random(rng)*3)]:'none',branch};
}
function grow(rng,count,style){
 const rs=[{id:0,x:0,y:0,type:'start'}],ds=Object.values(DIRECTIONS);let serial=0;
 for(let i=0;i<2400&&rs.length<count;i++){
  const leaves=rs.filter(a=>rs.filter(b=>adjacent(a,b)).length<=1);let from=rs[Math.floor(random(rng)*rs.length)];
  if(style==='snake'&&random(rng)<.8)from=rs.at(-1);
  if(style==='branchy'&&leaves.length&&random(rng)<.75)from=leaves[Math.floor(random(rng)*leaves.length)];
  let d=ds[Math.floor(random(rng)*4)];if(style==='cross'){const axis=ds[serial++%4],arm=rs.filter(r=>axis.dx?r.y===0&&r.x*axis.dx>=0:r.x===0&&r.y*axis.dy>=0);from=arm.sort((a,b)=>(Math.abs(b.x)+Math.abs(b.y))-(Math.abs(a.x)+Math.abs(a.y)))[0];d=random(rng)<.75?axis:d;}
  const p={x:from.x+d.dx,y:from.y+d.dy};if(Math.abs(p.x)>6||Math.abs(p.y)>6||rs.some(r=>r.x===p.x&&r.y===p.y))continue;
  const ns=rs.filter(r=>adjacent(r,p));if(ns.length>2||ns.length===2&&random(rng)>(style==='blob'?.65:.25))continue;
  rs.push({id:rs.length,...p,type:'combat'});
 }return rs;
}
function leaves(rs){const out=[];for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++)if(!rs.some(r=>r.x===x&&r.y===y)){const ns=rs.filter(r=>adjacent(r,{x,y}));if(ns.length===1&&ns[0].type==='combat')out.push({x,y,parent:ns[0].id});}return out;}
function independent(cells){const left=cells.filter(p=>(p.x+p.y)%2===0),right=cells.filter(p=>(p.x+p.y)%2!==0),match=new Map();function visit(l,seen){for(const r of right)if(adjacent(l,r)&&!seen.has(r)){seen.add(r);if(!match.has(r)||visit(match.get(r),seen)){match.set(r,l);return true;}}return false;}for(const l of left)visit(l,new Set());const matched=new Set(match.values()),zl=new Set(left.filter(l=>!matched.has(l))),zr=new Set(),q=[...zl];for(const l of q)for(const r of right)if(adjacent(l,r)&&match.get(r)!==l&&!zr.has(r)){zr.add(r);const next=match.get(r);if(next&&!zl.has(next)){zl.add(next);q.push(next);}}return [...zl,...right.filter(r=>!zr.has(r))];}
function finish(rs,seed,level,route,rules){
 const ds=distances(rs,0,true);return rs.map(r=>{
  const rng={rng:hash(seed+':shape80:'+level+':'+r.id)},roll=random(rng),shape=r.type==='combat'&&ds[r.id]>1?(roll<.52?'normal':roll<.74?'wide':roll<.94?'tall':'grand'):'normal',width=['wide','grand'].includes(shape)?1920:1280,height=['tall','grand'].includes(shape)?1200:800;
  return {...r,shape,view:{width,height},bounds:{left:130,right:width-130,top:205,bottom:height-120},style:rules.style,curse:rules.curse,branch:rules.branch,level,route,layoutKey:seed+':world80:'+route+':'+level+':'+r.id,depth:ds[r.id]||0,visited:r.id===0,cleared:!['combat','boss'].includes(r.type),unlocked:!['treasure','secret','supersecret','archive','omen'].includes(r.type),enabled:r.type!=='omen',entered:0,rewarded:false,initialized:false,enemies:[],obstacles:[],terrain:[],pickups:[],artifacts:[],chests:[],pedestal:null,stock:[],restocks:0,challenge:{state:'ready',wave:0,damageStart:0},bossGift:false,event:null,rush:null,encounter:null,biome:null};
 });
}
export function generateFloor(seed,level=0,route='normal',branch='root'){
 const rules=floorRules(seed,level,branch),selection={rng:hash(seed+':special80:'+level)},types=['treasure','treasure','shop','supersecret'];
 for(const [type,p]of [['sanctuary',.6],['challenge',.55],['bargain',.4],['rush',.45],['puzzle',.5],['forge',.35]])if(random(selection)<p)types.push(type);
 if(route==='wild')types.push('archive');
 for(let attempt=0;attempt<80;attempt++){
  const rng={rng:hash(seed+':topology80:'+level+':'+attempt)},rs=grow(rng,11+(rules.curse==='expanse'?2:0)+(route==='eclipse'?1:0),rules.style);if(rs.length<11)continue;
  const ds=distances(rs),cells=leaves(rs);let selected;
  for(const boss of [...cells].sort((a,b)=>ds[b.parent]-ds[a.parent])){if(ds[boss.parent]<2)continue;const rest=independent(cells.filter(p=>p!==boss&&!adjacent(p,boss)));if(rest.length<types.length)continue;for(let i=rest.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}selected=[boss,...rest.slice(0,types.length)];break;}
  if(!selected)continue;['boss',...types].forEach((type,i)=>rs.push({id:rs.length,x:selected[i].x,y:selected[i].y,type}));
  const boss=rs.find(r=>r.type==='boss'),bonus=Object.values(DIRECTIONS).map(d=>({x:boss.x+d.dx,y:boss.y+d.dy})).find(p=>!rs.some(r=>r.x===p.x&&r.y===p.y)&&rs.filter(r=>adjacent(r,p)).length===1);if(!bonus)continue;rs.push({id:rs.length,...bonus,type:'omen'});
  let candidates=[];for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++){if(rs.some(r=>r.x===x&&r.y===y))continue;const ns=rs.filter(r=>adjacent(r,{x,y}));if(ns.length&&ns.every(r=>['combat','start'].includes(r.type)))candidates.push({x,y,score:ns.length});}
  candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)continue;rs.push({id:rs.length,x:candidates[0].x,y:candidates[0].y,type:'secret'});
  return finish(rs,seed,level,route,rules);
 }
 const rs=oldFloor(seed,level,route).filter(r=>r.type!=='secret').map((r,id)=>({id,x:r.x,y:r.y,type:r.type==='sanctuary'?'puzzle':r.type}));
 const boss=rs.find(r=>r.type==='boss');for(const type of ['supersecret','omen','secret']){const options=type==='omen'?Object.values(DIRECTIONS).map(d=>({x:boss.x+d.dx,y:boss.y+d.dy})).filter(p=>!rs.some(r=>r.x===p.x&&r.y===p.y)&&rs.filter(r=>adjacent(r,p)).length===1):leaves(rs);const p=options[0];if(!p)throw Error('Fallback special placement');rs.push({id:rs.length,x:p.x,y:p.y,type});}return finish(rs,seed,level,route,rules);
}
export const links=(g,r=g.rooms[g.room])=>Object.entries(doorsFor(r)).flatMap(([dir,d])=>{const to=g.rooms.find(t=>t.x===r.x+d.dx&&t.y===r.y+d.dy&&t.enabled!==false);return to?[{dir,to:to.id,...d}]:[];});
export function visibleRooms(g){const seen=g.rooms.filter(r=>r.visited);return g.rooms.filter(r=>r.enabled!==false&&(!['secret','supersecret','archive'].includes(r.type)||r.unlocked)&&(r.visited||!(g.curse==='lost'&&!g.curseLifted)&&seen.some(v=>adjacent(v,r))));}
export const scalePoint=(r,p)=>({x:130+(p.x-130)*(r.bounds.right-130)/1020,y:205+(p.y-205)*(r.bounds.bottom-205)/475});
const cache=new Map();
export function makeObstacles(seed,r){
 if(!['combat','boss','challenge','rush'].includes(r.type))return [];const key=r.layoutKey;if(cache.has(key))return cache.get(key).map(o=>({...o}));
 const rng={rng:hash(seed+':geometry80:'+r.id+':'+r.level)},a=boundsFor(r),out=[];
 const cover=r.type==='boss'?[{x:330,y:315,w:65,h:55},{x:880,y:315,w:65,h:55},{x:330,y:550,w:65,h:55},{x:880,y:550,w:65,h:55}]:roomCover(seed,r);
 for(const raw of cover){const p=scalePoint(r,raw),o={...raw,...p,kind:raw.kind||(r.level===0?'rock':r.level===1?'shelf':'crystal'),hp:raw.kind==='gap'?-1:1};if(Object.values(doorsFor(r)).some(d=>o.x<d.x+80&&o.x+o.w>d.x-80&&o.y<d.y+80&&o.y+o.h>d.y-80)||out.some(t=>o.x<t.x+t.w+18&&o.x+o.w>t.x-18&&o.y<t.y+t.h+18&&o.y+o.h>t.y-18))continue;if(walkableLayout({...r,obstacles:[...out,o],terrain:[]}))out.push(o);}
 for(let i=0;i<3&&r.type!=='boss';i++){const o={x:a.left+150+random(rng)*(a.right-a.left-300),y:a.top+90+random(rng)*(a.bottom-a.top-180),w:52,h:42,kind:i===2&&random(rng)<.3?'gap':'pot',hp:1};if(o.kind==='gap')o.hp=-1;if(out.some(t=>o.x<t.x+t.w+30&&o.x+o.w>t.x-30&&o.y<t.y+t.h+30&&o.y+o.h>t.y-30))continue;if(walkableLayout({...r,obstacles:[...out,o],terrain:[]}))out.push(o);}
 cache.set(key,out.map(o=>({...o})));if(cache.size>100)cache.delete(cache.keys().next().value);return out;
}
// Same template index as encounters80, without an import cycle.
import {TEMPLATES} from './dungeon76-encounters.js';
export function templateIndex(seed,r,wave=0){const n=hash(seed+':template80:'+r.level+':'+r.branch)%TEMPLATES.length;return (n+r.id*5+wave*7)%TEMPLATES.length;}
function roomCover(seed,r){const t=TEMPLATES[templateIndex(seed,r)],flip=hash(r.layoutKey)%2;return t.cover.map((o,i)=>({...o,x:flip?1280-o.x-o.w:o.x,kind:t.crates?.includes(i)?'pot':i%3===2?'gap':r.level===0?'rock':r.level===1?'shelf':'crystal'}));}
export function makeTerrain(seed,r){if(!['combat','boss','challenge','rush'].includes(r.type)||!(r.level===0||r.branch==='canopy'))return [];const room={...r,obstacles:makeObstacles(seed,r)},rng={rng:hash(r.layoutKey+':moss')};return [{x:300,y:320},{x:800,y:530}].map(p=>({...scalePoint(r,p),w:128,h:62,kind:'moss',factor:.62})).filter(t=>!blocked(room,t.x+t.w/2,t.y+t.h/2,32));}
export function makeBiome(seed,r){if(!['combat','boss','challenge','rush'].includes(r.type))return null;const room={...r,obstacles:makeObstacles(seed,r)},kind=r.route==='eclipse'?['books','spores','portals'][hash(r.layoutKey)%3]:r.branch==='canopy'?'spores':r.branch==='echo'?'books':['spores','books','portals'][r.level];return {kind,points:(kind==='portals'?[{x:350,y:330},{x:930,y:560}]:[{x:380,y:345},{x:640,y:510},{x:900,y:345}]).map(p=>nearestFree(room,scalePoint(r,p),32)),clock:-2,cycle:-1};}
