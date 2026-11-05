export const WORLD={width:2600,height:2000};
export function seedNumber(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function random(state,key){let t=state[key]+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);state[key]>>>=0;return ((t^t>>>14)>>>0)/4294967296;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function blocked(world,x,y,r=14){return x<60||x>WORLD.width-60||y<60||y>WORLD.height-60||world.obstacles.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);}
export function moveBody(world,b,dx,dy,r=14){const x=clamp(b.x+dx,60,WORLD.width-60),y=clamp(b.y+dy,60,WORLD.height-60);if(!blocked(world,x,b.y,r))b.x=x;if(!blocked(world,b.x,y,r))b.y=y;}
export function lineBlocked(world,a,b,r=2){const d=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(d/18));for(let i=1;i<=steps;i++){const t=i/steps;if(blocked(world,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,r))return true;}return false;}
export function reachable(world,start={x:1300,y:1000}){
 const queue=[[Math.floor(start.x/100),Math.floor(start.y/100)]],seen=new Set([queue[0].join(',')]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=a+','+b;if(a<1||a>24||b<1||b>18||seen.has(key)||blocked(world,a*100+50,b*100+50,22))continue;seen.add(key);queue.push([a,b]);}}
 return seen;
}
export function generateWorld(seed,map='forest'){
 const rng={value:seedNumber(seed+':'+map+':world69')},rand=()=>random(rng,'value'),w={version:69,map,obstacles:[],points:[],hazards:[]};
 const cells=[];for(let y=2;y<18;y+=3)for(let x=2;x<24;x+=3)if(Math.hypot(x*100+50-1300,y*100+50-1000)>300)cells.push([x,y]);
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 const types=['rift','rift','chest','spring','nest','shrine'];
 for(const [i,type]of types.entries()){const [x,y]=cells[i];w.points.push({id:'p'+i,type,x:x*100+50,y:y*100+50,state:'ready',progress:0,radius:type==='rift'?125:55,rewardSeed:Math.floor(rand()*2**32)});}
 for(const [x,y]of cells.slice(6)){if(w.obstacles.length>=13)break;const o={x:x*100+10,y:y*100+10,w:80+(rand()>.5?80:0),h:80,style:Math.floor(rand()*3)};if(w.points.some(p=>Math.hypot(p.x-(o.x+o.w/2),p.y-(o.y+o.h/2))<220))continue;w.obstacles.push(o);const paths=reachable(w);if(w.points.some(p=>!paths.has(Math.floor(p.x/100)+','+Math.floor(p.y/100))))w.obstacles.pop();}
 for(const [x,y]of cells.slice(-7)){const px=x*100+50,py=y*100+50;if(!blocked(w,px,py,80)&&!w.points.some(p=>Math.hypot(p.x-px,p.y-py)<190))w.hazards.push({x:px,y:py,radius:68,offset:rand()*8});}
 return w;
}
export function pathTo(world,start,target){
 const sx=clamp(Math.floor(start.x/100),1,24),sy=clamp(Math.floor(start.y/100),1,18),tx=clamp(Math.floor(target.x/100),1,24),ty=clamp(Math.floor(target.y/100),1,18),key=(x,y)=>x+','+y;
 const queue=[[sx,sy]],previous=new Map([[key(sx,sy),null]]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===tx&&y===ty)break;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=key(a,b);if(a<1||a>24||b<1||b>18||previous.has(k)||blocked(world,a*100+50,b*100+50,22))continue;previous.set(k,key(x,y));queue.push([a,b]);}}
 if(!previous.has(key(tx,ty)))return [];const route=[];for(let k=key(tx,ty);k;k=previous.get(k)){const [x,y]=k.split(',').map(Number);route.unshift({x:x*100+50,y:y*100+50});}route.push({x:target.x,y:target.y});return route;
}
// Local deterministic steering: choose the clear side of an obstacle. Enemies
// use the same collision bodies as the player; ranged projectiles use cover too.
export function steer(world,e,target,dt,speed){
 const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx),step=speed*dt;
 if(!blocked(world,e.x+dx/d*40,e.y+dy/d*40,e.radius*.7)){moveBody(world,e,dx/d*step,dy/d*step,e.radius*.7);return;}
 const side=e.id%2?1:-1;for(const turn of [side*.8,-side*.8,side*1.57,-side*1.57,Math.PI]){const angle=a+turn,x=Math.cos(angle),y=Math.sin(angle);if(!blocked(world,e.x+x*45,e.y+y*45,e.radius*.7)){moveBody(world,e,x*step,y*step,e.radius*.7);return;}}
}
