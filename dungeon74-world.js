// Deterministic topology, collision and navigation share one physical geometry.
export const VIEW={width:1280,height:800};
export const FLOOR={left:130,right:1150,top:205,bottom:680};
export const DIRECTIONS={n:{dx:0,dy:-1,opposite:'s',x:640,y:205},e:{dx:1,dy:0,opposite:'w',x:1150,y:442},s:{dx:0,dy:1,opposite:'n',x:640,y:680},w:{dx:-1,dy:0,opposite:'e',x:130,y:442}};
export function hash(s){let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function random(s){let t=s.rng+=0x6d2b79f5;s.rng>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
export const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
export function distances(rooms,start=0,includeSecret=false){const d={[start]:0},q=[start];for(const id of q)for(const r of rooms)if(r.id!==id&&adjacent(rooms[id],r)&&(includeSecret||r.type!=='secret')&&d[r.id]===undefined){d[r.id]=d[id]+1;q.push(r.id);}return d;}
function candidates(rooms){const out=[];for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if(!rooms.some(r=>r.x===x&&r.y===y)){const p={x,y},ns=rooms.filter(r=>adjacent(p,r));if(ns.length===1&&ns[0].type==='combat')out.push({...p,parent:ns[0]});}return out;}
function finish(rooms,seed,level){const ds=distances(rooms);return rooms.map(r=>({...r,level,layoutKey:seed+':floor74:'+level+':'+r.id,depth:ds[r.id]||0,visited:r.id===0,cleared:['start','shop','treasure','secret','challenge'].includes(r.type),unlocked:!['treasure','secret'].includes(r.type),entered:0,rewarded:false,initialized:false,enemies:[],obstacles:[],terrain:[],pickups:[],pedestal:null,stock:[],restocks:0,challenge:{state:'ready',wave:0,damageStart:0},bossGift:false}));}
export function generateFloor(seed,level=0){
 for(let attempt=0;attempt<64;attempt++){
 const s={rng:hash(seed+':topology74:'+level+':'+attempt)},rooms=[{id:0,x:0,y:0,type:'start'}];
 for(let i=0;i<4000&&rooms.length<9;i++){const a=rooms[Math.floor(random(s)*rooms.length)],d=Object.values(DIRECTIONS)[Math.floor(random(s)*4)],b={x:a.x+d.dx,y:a.y+d.dy};if(Math.abs(b.x)>3||Math.abs(b.y)>3||rooms.some(r=>r.x===b.x&&r.y===b.y)||rooms.filter(r=>adjacent(r,b)).length!==1)continue;rooms.push({id:rooms.length,...b,type:'combat'});}
 if(rooms.length!==9)continue;let failed=false;
 for(const type of ['boss','challenge','treasure','treasure','shop','secret']){let cs=candidates(rooms);const ds=distances(rooms);if(type==='boss'){const max=Math.max(...cs.map(c=>ds[c.parent.id]));cs=cs.filter(c=>ds[c.parent.id]===max);}else if(type==='shop')cs.sort((a,b)=>ds[a.parent.id]-ds[b.parent.id]);else if(type==='treasure'){const far=cs.filter(c=>ds[c.parent.id]>=1);if(far.length)cs=far;}
  if(!cs.length){failed=true;break;}const p=cs[Math.floor(random(s)*(type==='shop'?Math.min(5,cs.length):cs.length))];rooms.push({id:rooms.length,x:p.x,y:p.y,type});
 }
 if(!failed)return finish(rooms,String(seed),level);
 }throw Error('Unable to place legal terminal rooms');
}
export const links=(g,r=g.rooms[g.room])=>Object.entries(DIRECTIONS).flatMap(([dir,d])=>{const to=g.rooms.find(t=>t.x===r.x+d.dx&&t.y===r.y+d.dy);return to?[{dir,to:to.id,...d}]:[];});
export function visibleRooms(g){const visited=g.rooms.filter(r=>r.visited);return g.rooms.filter(r=>r.type!=='secret'||r.unlocked).filter(r=>r.visited||visited.some(v=>adjacent(v,r)));}
function overlaps(o,x,y,r){return x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r;}
export function blocked(room,x,y,r=16){return x<FLOOR.left+r||x>FLOOR.right-r||y<FLOOR.top+r||y>FLOOR.bottom-r||room.obstacles.some(o=>o.hp!==0&&overlaps(o,x,y,r));}
export function blockedShot(room,x,y,r=6){return x<FLOOR.left+r||x>FLOOR.right-r||y<FLOOR.top+r||y>FLOOR.bottom-r||room.obstacles.some(o=>o.hp!==0&&o.kind!=='gap'&&overlaps(o,x,y,r));}
export const surfaceSpeed=(room,x,y)=>room.terrain?.some(t=>x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h)?.62:1;
export function moveBody(room,p,dx,dy,r=16){const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));for(let i=0;i<n;i++){const f=surfaceSpeed(room,p.x,p.y),x=dx/n*f,y=dy/n*f;if(!blocked(room,p.x+x,p.y,r))p.x+=x;if(!blocked(room,p.x,p.y+y,r))p.y+=y;}}
export function clearLine(room,a,b,r=16){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/8));for(let i=0;i<=n;i++)if(blocked(room,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,r))return false;return true;}
const graphs=new Map();
function grid(room,radius=32){const key=room.layoutKey+'|'+radius+'|'+room.obstacles.filter(o=>o.hp!==0).map(o=>[o.x,o.y,o.w,o.h,o.kind].join(',')).join(';');if(graphs.has(key))return graphs.get(key);const nodes=[],lookup=new Map();for(let y=245;y<=645;y+=40)for(let x=170;x<=1130;x+=40)if(!blocked(room,x,y,radius)){const p={x,y,key:x+','+y,edges:[]};nodes.push(p);lookup.set(p.key,p);}for(const p of nodes)for(const [dx,dy]of [[40,0],[-40,0],[0,40],[0,-40]]){const t=lookup.get((p.x+dx)+','+(p.y+dy));if(t&&clearLine(room,p,t,radius))p.edges.push(t);}const g={nodes,lookup,fields:new Map()};graphs.set(key,g);if(graphs.size>40)graphs.delete(graphs.keys().next().value);return g;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function nearestNode(graph,p){let best=null,d=Infinity;for(const n of graph.nodes){const a=distance(n,p);if(a<d){d=a;best=n;}}return best;}
export function findPath(room,from,to,radius=32){const graph=grid(room,32),a=[...graph.nodes].sort((a,b)=>distance(a,from)-distance(b,from)).find(n=>clearLine(room,from,n,radius)),b=nearestNode(graph,to);if(!a||!b)return [];let field=graph.fields.get(b.key);if(!field){field=new Map([[b.key,null]]);const q=[b];for(const n of q)for(const t of n.edges)if(!field.has(t.key)){field.set(t.key,n);q.push(t);}graph.fields.set(b.key,field);if(graph.fields.size>12)graph.fields.delete(graph.fields.keys().next().value);}if(!field.has(a.key))return [];const path=[];for(let n=a;n;n=field.get(n.key))path.push({x:n.x,y:n.y});return path;}
export function steer(room,p,to,dt,speed,radius=p.radius||16){let target=to;if(!clearLine(room,p,to,radius)){const route=findPath(room,p,to,radius);if(!route.length)return;target=[...route].reverse().find(n=>clearLine(room,p,n,radius))||route[0];}const d=distance(target,p),step=Math.min(d,speed*dt);if(d>2)moveBody(room,p,(target.x-p.x)/d*step,(target.y-p.y)/d*step,radius);}
export function walkableLayout(room){const g=grid(room,32);if(!g.nodes.length)return false;const q=[g.nodes[0]],seen=new Set([q[0].key]);for(const n of q)for(const t of n.edges)if(!seen.has(t.key)){seen.add(t.key);q.push(t);}if(seen.size!==g.nodes.length)return false;return Object.values(DIRECTIONS).every(d=>{const p={x:d.x-d.dx*78,y:d.y-d.dy*78};return !blocked(room,p.x,p.y,32)&&distance(nearestNode(g,p),p)<62;});}
function apron(o){const p=32;return Object.values(DIRECTIONS).some(d=>overlaps(o,d.x-d.dx*60,d.y-d.dy*60,75+p));}
const layouts=new Map(),surfaces=new Map(),layoutKey=(seed,room)=>seed+'|'+room.level+'|'+room.id+'|'+room.type;
export function makeObstacles(seed,room){
 if(!['combat','boss','challenge'].includes(room.type))return [];const key=layoutKey(seed,room);if(layouts.has(key))return layouts.get(key).map(o=>({...o}));const s={rng:hash(seed+':terrain74:'+room.level+':'+room.id)},out=[],count=room.type==='boss'?4:8+Math.floor(random(s)*6)+room.level;
 for(let i=0;i<180&&out.length<count;i++){const x=240+Math.floor(random(s)*10)*80,y=280+Math.floor(random(s)*5)*72,w=[52,70,100][Math.floor(random(s)*3)],h=[38,52,65][Math.floor(random(s)*3)],roll=random(s),kind=roll<.13?'gap':roll<.32?'pot':room.level===1?'shelf':room.level===2?'crystal':roll<.7?'rock':'log';const o={x,y,w,h,kind,hp:kind==='gap'?-1:1};
  if(x+w>1080||y+h>620||apron(o)||room.type!=='combat'&&overlaps(o,640,415,85)||out.some(a=>x<a.x+a.w+20&&x+w>a.x-20&&y<a.y+a.h+20&&y+h>a.y-20))continue;
  const roomTest={...room,obstacles:[...out,o],terrain:[]};if(walkableLayout(roomTest))out.push(o);
 }layouts.set(key,out.map(o=>({...o})));if(layouts.size>96)layouts.delete(layouts.keys().next().value);return out;
}
export function makeTerrain(seed,room){if(!['combat','boss','challenge'].includes(room.type))return [];const key=layoutKey(seed,room);if(surfaces.has(key))return surfaces.get(key).map(t=>({...t}));const base={...room,obstacles:makeObstacles(seed,room)},s={rng:hash(seed+':surface74:'+room.level+':'+room.id)},out=[];for(let i=0;i<3;i++){const x=270+Math.floor(random(s)*8)*80,y=300+Math.floor(random(s)*4)*75,w=100+Math.floor(random(s)*60),h=45+Math.floor(random(s)*35);if(!blocked(base,x+w/2,y+h/2,28))out.push({x,y,w,h,kind:['moss','honey','mist'][room.level],factor:.62});}surfaces.set(key,out.map(t=>({...t})));if(surfaces.size>96)surfaces.delete(surfaces.keys().next().value);return out;}
// A collision-free point may still be a tiny pocket missed by the coarse grid.
// Spawns/rewards must have an actual radius-safe segment into the connected graph.
export function reachable(room,p,radius=32){return !blocked(room,p.x,p.y,radius)&&grid(room,32).nodes.some(n=>distance(n,p)<80&&clearLine(room,p,n,radius));}
export function nearestFree(room,p,radius=24){const safety=Math.max(32,radius);if(reachable(room,p,safety))return {x:p.x,y:p.y};const spots=grid(room,32).nodes.filter(n=>!blocked(room,n.x,n.y,safety));const n=spots.sort((a,b)=>distance(a,p)-distance(b,p))[0];if(!n)throw Error('No reachable spawn in validated room');return {x:n.x,y:n.y};}
