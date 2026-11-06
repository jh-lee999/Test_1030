// Full-information diagnostic policy. Reads state; never alters game/RNG/HP.
import {blocked,blockedShot,clearLine,findPath,FLOOR,links} from '../dungeon76-world.js';
import {bossTells} from '../dungeon76-bosses.js';
import {biomeView} from '../dungeon76-biome.js';
import {current} from '../dungeon76-engine.js';
export const priority=['prism','charge','fan','scope','ward','greed','yellow','scythe','weather','lucky','mirror','rust','komi','frost','mace','bell','belt','fireworks'];
export const choose=g=>['echo','trail','repulse','salvage'].find(id=>g.choice?.includes(id))||g.choice?.[0];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function path(room,p,goal){const out=findPath(room,p,goal,16);return [...out].reverse().find(n=>dist(n,p)<190&&clearLine(room,p,n,16))||out[0];}
function route(g,target){const q=[g.room],seen=new Map([[g.room,null]]);for(const id of q){if(id===target.id)break;for(const l of links(g,g.rooms[id])){const r=g.rooms[l.to];if(!seen.has(r.id)&&(!['secret','archive'].includes(r.type)||r.unlocked)&&(r.type!=='treasure'||r.unlocked||g.keys>0)){seen.set(r.id,id);q.push(r.id);}}}if(!seen.has(target.id))return null;let id=target.id;while(seen.get(id)!==g.room&&seen.get(id)!==null)id=seen.get(id);return links(g).find(l=>l.to===id);}
export function pilot(g,state={}){
 const r=current(g),p=g.player,es=r.enemies.filter(e=>e.hp>0&&e.appear<=0),input={x:0,y:0,aim:{...p.aim},fire:false};let goal=null,interact=false,ultimate=false;
 if(!r.cleared&&es.length){const e=[...es].sort((a,b)=>dist(a,p)-dist(b,p))[0];input.target={x:e.x,y:e.y-26};input.aim={x:e.x-p.x,y:e.y-26-(p.y-60)};input.fire=true;ultimate=g.battery>=3&&(es.length>=3||e.boss);
  let best=-Infinity;for(let i=0;i<17;i++){const a=i*Math.PI*2/16,x=i===16?0:Math.cos(a),y=i===16?0:Math.sin(a),future={x:p.x+x*100,y:p.y+y*100};if([.25,.5,.75,1].some(t=>blocked(r,p.x+x*100*t,p.y+y*100*t,20)))continue;
   let score=-Math.abs(dist(future,e)-260)*.016;for(let t=.1;t<.95;t+=.1)if(blockedShot(r,future.x+(e.x-future.x)*t,future.y-50+(e.y-26-(future.y-50))*t,4)){score-=7;break;}for(const m of es){const d=dist(future,m);score-=Math.max(0,190-d)*.09;if(m.state==='tell'&&['shady','caster'].includes(m.role))score-=Math.max(0,140-dist(future,{x:m.aimX,y:m.aimY}))*.2;if(['spin','slash'].includes(m.state))score-=Math.max(0,(m.role==='velvet'?210:150)-d)*.22;if(m.state==='dash')score-=Math.max(0,120-d)*.18;}
   for(const m of es){const v=bossTells(m);if(v){for(const z of v.targets)if(z.r?dist(future,z)<z.r+35:future.x>z.x-25&&future.x<z.x+z.w+25&&future.y>z.y-25&&future.y<z.y+z.h+25)score-=30;if(v.kind==='spin'||v.kind==='ambush')score-=Math.max(0,v.radius+60-dist(future,m))*.3;}}
   const biome=biomeView(g);if(biome&&['warn','active'].includes(biome.phase))for(const m of biome.marks)score-=Math.max(0,biome.radius+35-dist(future,m))*.15;
   for(const b of g.hostile){const q={x:b.x+b.vx*.3,y:b.y+b.vy*.3};score-=Math.max(0,80-dist(future,q))*.09;}
   score-=Math.max(0,210-future.x)*.01+Math.max(0,future.x-1070)*.01+Math.max(0,265-future.y)*.02+Math.max(0,future.y-625)*.02;score+=Math.sin(g.time*.4+a)*.12;
   if(score>best){best=score;input.x=x;input.y=y;}
  }return {input,interact,ultimate};
 }
 if(!r.cleared&&!es.length)return {input,interact,ultimate};
 if(r.type==='challenge'&&r.challenge.state==='ready'&&p.hp>45){goal={x:640,y:415};interact=dist(p,goal)<90;}
 const hearts=r.pickups.filter(q=>q.kind==='heart'&&p.hp<60),resources=r.pickups.filter(q=>q.kind!=='heart'&&(q.kind!=='shield'||g.shield<20));goal=goal||[...hearts,...resources].sort((a,b)=>dist(a,p)-dist(b,p))[0]||null;
 if(!goal&&r.pedestal&&!r.pedestal.taken){goal=r.pedestal;interact=dist(p,goal)<90;}
 if(!goal&&r.type==='shop'){const stock=r.stock.filter(s=>!s.sold&&s.price<=g.coins&&(s.id==='heal'?p.hp<50:s.id==='key'?g.keys<1:!g.items.includes(s.id)));goal=stock.sort((a,b)=>(a.id==='heal'?-20:priority.indexOf(a.id))-(b.id==='heal'?-20:priority.indexOf(b.id)))[0]||null;interact=goal&&dist(p,goal)<80;}
 if(!goal&&r.type==='boss'&&r.cleared){goal={x:640,y:420};interact=dist(p,goal)<90;}
 if(!goal){const available=g.rooms.filter(q=>!q.visited&&!['secret','archive'].includes(q.type)&&(q.type!=='treasure'||q.unlocked||g.keys>0));available.sort((a,b)=>(a.type==='treasure'?-8:a.type==='boss'?20:0)-(b.type==='treasure'?-8:b.type==='boss'?20:0)+Math.abs(a.x-r.x)+Math.abs(a.y-r.y)-Math.abs(b.x-r.x)-Math.abs(b.y-r.y));const target=available.find(t=>t.id===state.target&&route(g,t))||available.find(t=>route(g,t));if(target){state.target=target.id;goal=route(g,target);}}
 if(goal){const t=goal.dir&&dist(p,goal)<100||clearLine(r,p,goal,16)?goal:path(r,p,goal)||goal,d=dist(t,p);if(d>5){input.x=(t.x-p.x)/d;input.y=(t.y-p.y)/d;}}
 return {input,interact,ultimate};
}
