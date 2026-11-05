export const VIEW={width:1280,height:800};
export const FLOOR={left:130,right:1150,top:205,bottom:680};
export const DIRECTIONS={n:{dx:0,dy:-1,opposite:'s',x:640,y:205},e:{dx:1,dy:0,opposite:'w',x:1150,y:442},s:{dx:0,dy:1,opposite:'n',x:640,y:680},w:{dx:-1,dy:0,opposite:'e',x:130,y:442}};
export function hash(s){let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function random(state){let t=state.rng+=0x6d2b79f5;state.rng>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
const neighbors=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
export function distances(rooms,start=0){const d={[start]:0},q=[start];for(const id of q)for(const r of rooms)if(r.id!==id&&neighbors(rooms[id],r)&&r.type!=='secret'&&d[r.id]===undefined){d[r.id]=d[id]+1;q.push(r.id);}return d;}
export function generateFloor(seed){
 const s={rng:hash(seed+':rooms73')},rooms=[{id:0,x:0,y:0,type:'start',visited:true,cleared:true,unlocked:true}];
 for(let i=0;i<2000&&rooms.length<12;i++){const a=rooms[Math.floor(random(s)*rooms.length)],dir=Object.values(DIRECTIONS)[Math.floor(random(s)*4)],b={x:a.x+dir.dx,y:a.y+dir.dy};if(Math.abs(b.x)>3||Math.abs(b.y)>3||rooms.some(r=>r.x===b.x&&r.y===b.y)||rooms.filter(r=>neighbors(r,b)).length!==1)continue;rooms.push({id:rooms.length,...b,type:'combat',visited:false,cleared:false,unlocked:true});}
 const ds=distances(rooms),leaves=rooms.filter(r=>r.id&&rooms.filter(a=>neighbors(a,r)).length===1).sort((a,b)=>ds[b.id]-ds[a.id]);
 const boss=leaves.shift()||rooms.at(-1);boss.type='boss';
 const near=rooms.filter(r=>r.id&&r!==boss).sort((a,b)=>ds[a.id]-ds[b.id]||a.id-b.id);const gift=near.find(r=>ds[r.id]>=2)||near[0];gift.type='treasure';gift.unlocked=false;
 const shop=near.find(r=>r!==gift&&ds[r.id]>=2)||near.find(r=>r!==gift);shop.type='shop';shop.cleared=true;
 const second=leaves.find(r=>r!==gift&&r!==shop)||near.filter(r=>r!==gift&&r!==shop).at(-1);if(second){second.type='treasure';second.unlocked=false;}
 const candidates=[];for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const a={x,y};if(!rooms.some(r=>r.x===x&&r.y===y)){const ns=rooms.filter(r=>neighbors(a,r)&&r.type!=='boss');if(ns.length>=2)candidates.push(a);}}
 const secret=candidates[Math.floor(random(s)*candidates.length)]||{x:rooms[0].x-1,y:rooms[0].y};if(!rooms.some(r=>r.x===secret.x&&r.y===secret.y))rooms.push({id:rooms.length,...secret,type:'secret',visited:false,cleared:true,unlocked:false});
 return rooms.map(r=>({...r,depth:ds[r.id]||1,entered:0,rewarded:false,initialized:false,enemies:[],obstacles:[],pickups:[],pedestal:null,stock:[]}));
}
export const links=(g,room=g.rooms[g.room])=>Object.entries(DIRECTIONS).flatMap(([dir,d])=>{const to=g.rooms.find(r=>r.x===room.x+d.dx&&r.y===room.y+d.dy);return to?[{dir,to:to.id,...d}]:[];});
export function visibleRooms(g){const here=g.rooms.filter(r=>r.visited);return g.rooms.filter(r=>r.type!=='secret'||r.unlocked).filter(r=>r.visited||here.some(a=>neighbors(a,r)));}
export function blocked(room,x,y,r=16){return x<FLOOR.left+r||x>FLOOR.right-r||y<FLOOR.top+r||y>FLOOR.bottom-r||room.obstacles.some(o=>o.hp!==0&&x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);}
export function moveBody(room,p,dx,dy,r=16){if(!blocked(room,p.x+dx,p.y,r))p.x+=dx;if(!blocked(room,p.x,p.y+dy,r))p.y+=dy;}
export function makeObstacles(seed,room){
 if(['start','treasure','shop','secret','boss'].includes(room.type))return [];
 const s={rng:hash(seed+':layout:'+room.id)},variant=Math.floor(random(s)*5),out=[];
 const add=(x,y,w=60,h=50,kind='rock')=>out.push({x,y,w,h,kind,hp:kind==='pot'?1:-1});
 if(variant===0){for(const x of [370,850])for(const y of [320,525])add(x,y);}
 if(variant===1){for(const x of [430,730]){add(x,330,70,55,'stump');add(x,540,70,55,'stump');}}
 if(variant===2){for(const x of [350,830])add(x,430,100,55,'log');}
 if(variant===3){for(const x of [300,950])for(const y of [300,560])add(x,y,45,40,'pot');}
 if(variant===4){add(570,360,95,60);add(570,535,95,45,'log');}
 return out;
}
