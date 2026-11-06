// Deterministic topology, collision and navigation share one physical geometry.
export const VIEW={width:1280,height:800};
export const FLOOR={left:130,right:1150,top:205,bottom:680};
export const DIRECTIONS={n:{dx:0,dy:-1,opposite:'s',x:640,y:205},e:{dx:1,dy:0,opposite:'w',x:1150,y:442},s:{dx:0,dy:1,opposite:'n',x:640,y:680},w:{dx:-1,dy:0,opposite:'e',x:130,y:442}};
export function hash(s){let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function random(s){let t=s.rng+=0x6d2b79f5;s.rng>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
export const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
export function distances(rooms,start=0,includeSecret=false){const d={[start]:0},q=[start];for(const id of q)for(const r of rooms)if(r.id!==id&&adjacent(rooms[id],r)&&(includeSecret||r.type!=='secret')&&d[r.id]===undefined){d[r.id]=d[id]+1;q.push(r.id);}return d;}
function overlaps(o,x,y,r){return x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r;}
export function blocked(room,x,y,r=16){const FLOOR=boundsFor(room);return x<FLOOR.left+r||x>FLOOR.right-r||y<FLOOR.top+r||y>FLOOR.bottom-r||room.obstacles.some(o=>o.hp!==0&&overlaps(o,x,y,r));}
export function blockedShot(room,x,y,r=6){const FLOOR=boundsFor(room);return x<FLOOR.left+r||x>FLOOR.right-r||y<FLOOR.top+r||y>FLOOR.bottom-r||room.obstacles.some(o=>o.hp!==0&&o.kind!=='gap'&&overlaps(o,x,y,r));}
export const surfaceSpeed=(room,x,y)=>room.terrain?.some(t=>x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h)?.62:1;
export function moveBody(room,p,dx,dy,r=16){const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));for(let i=0;i<n;i++){const f=surfaceSpeed(room,p.x,p.y),x=dx/n*f,y=dy/n*f;if(!blocked(room,p.x+x,p.y,r))p.x+=x;if(!blocked(room,p.x,p.y+y,r))p.y+=y;}}
export function clearLine(room,a,b,r=16){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/8));for(let i=0;i<=n;i++)if(blocked(room,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,r))return false;return true;}
const graphs=new Map();
function grid(room,radius=32){const key=room.layoutKey+'|'+radius+'|'+room.obstacles.filter(o=>o.hp!==0).map(o=>[o.x,o.y,o.w,o.h,o.kind].join(',')).join(';');if(graphs.has(key))return graphs.get(key);const nodes=[],lookup=new Map();for(let y=boundsFor(room).top+40;y<=boundsFor(room).bottom-32;y+=40)for(let x=boundsFor(room).left+40;x<=boundsFor(room).right-32;x+=40)if(!blocked(room,x,y,radius)){const p={x,y,key:x+','+y,edges:[]};nodes.push(p);lookup.set(p.key,p);}for(const p of nodes)for(const [dx,dy]of [[40,0],[-40,0],[0,40],[0,-40]]){const t=lookup.get((p.x+dx)+','+(p.y+dy));if(t&&clearLine(room,p,t,radius))p.edges.push(t);}const g={nodes,lookup,fields:new Map()};graphs.set(key,g);if(graphs.size>40)graphs.delete(graphs.keys().next().value);return g;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function nearestNode(graph,p){let best=null,d=Infinity;for(const n of graph.nodes){const a=distance(n,p);if(a<d){d=a;best=n;}}return best;}
export function findPath(room,from,to,radius=32){const graph=grid(room,32),a=[...graph.nodes].sort((a,b)=>distance(a,from)-distance(b,from)).find(n=>clearLine(room,from,n,radius)),b=nearestNode(graph,to);if(!a||!b)return [];let field=graph.fields.get(b.key);if(!field){field=new Map([[b.key,null]]);const q=[b];for(const n of q)for(const t of n.edges)if(!field.has(t.key)){field.set(t.key,n);q.push(t);}graph.fields.set(b.key,field);if(graph.fields.size>12)graph.fields.delete(graph.fields.keys().next().value);}if(!field.has(a.key))return [];const path=[];for(let n=a;n;n=field.get(n.key))path.push({x:n.x,y:n.y});return path;}
export function steer(room,p,to,dt,speed,radius=p.radius||16){let target=to;if(!clearLine(room,p,to,radius)){const route=findPath(room,p,to,radius);if(!route.length)return;target=[...route].reverse().find(n=>clearLine(room,p,n,radius))||route[0];}const d=distance(target,p),step=Math.min(d,speed*dt);if(d>2)moveBody(room,p,(target.x-p.x)/d*step,(target.y-p.y)/d*step,radius);}
export function walkableLayout(room){const g=grid(room,32);if(!g.nodes.length)return false;const q=[g.nodes[0]],seen=new Set([q[0].key]);for(const n of q)for(const t of n.edges)if(!seen.has(t.key)){seen.add(t.key);q.push(t);}if(seen.size!==g.nodes.length)return false;return Object.values(doorsFor(room)).every(d=>{const p={x:d.x-d.dx*78,y:d.y-d.dy*78};return !blocked(room,p.x,p.y,32)&&distance(nearestNode(g,p),p)<62;});}
// A collision-free point may still be a tiny pocket missed by the coarse grid.
// Spawns/rewards must have an actual radius-safe segment into the connected graph.
export function reachable(room,p,radius=32){return !blocked(room,p.x,p.y,radius)&&grid(room,32).nodes.some(n=>distance(n,p)<80&&clearLine(room,p,n,radius));}
export function nearestFree(room,p,radius=24){const safety=Math.max(32,radius);if(reachable(room,p,safety))return {x:p.x,y:p.y};const spots=grid(room,32).nodes.filter(n=>!blocked(room,n.x,n.y,safety));const n=spots.sort((a,b)=>distance(a,p)-distance(b,p))[0];if(!n)throw Error('No reachable spawn in validated room');return {x:n.x,y:n.y};}

export const boundsFor=r=>r.bounds||FLOOR;
export const viewFor=r=>r.view||VIEW;
export function doorsFor(r){const a=boundsFor(r),x=(a.left+a.right)/2,y=(a.top+a.bottom)/2;return {n:{...DIRECTIONS.n,x,y:a.top},s:{...DIRECTIONS.s,x,y:a.bottom},e:{...DIRECTIONS.e,x:a.right,y},w:{...DIRECTIONS.w,x:a.left,y}};}
