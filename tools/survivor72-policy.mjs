// Full-information diagnostic, not a human player or proof of fun.
import {pathTo,lineBlocked,blocked} from '../survivor71-world.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const recipes=[['thunderweb','firefly'],['dreamoven','popcorn'],['tempest','thunderweb']];
const parties=[['stone','chain','storm','pillow'],['stone','pillow','bomb','chain'],['stone','pillow','storm','chain']];
export function choose(g,family=0){
 const score=o=>{const [kind,id]=o.id.split(':');if(g.draft)return id==='comet'?0:id==='hoarder'?1:2;
  if(id==='yellow')return -150;
  if(kind==='fusion')return recipes[family].includes(id)?-100:-50;
  if(kind==='move'){if(id==='stone'&&g.moves.stone.level<2)return -20;const i=parties[family].indexOf(id);return i<0?50:!g.moves[id]?i:5+g.moves[id].level*2+i*.1;}
  return kind==='relic'?20+['comet','hoarder','echo','mirror','frost','harvest'].indexOf(id):40;
 };return [...g.offers].sort((a,b)=>score(a)-score(b))[0]?.id;
}
export function pilot(g,state,{mode='objective'}={}){
 if(mode==='idle')return {input:{x:0,y:0},interact:false,ultimate:false};
 const p=g.player,points=g.world.points,threats=g.enemies.filter(e=>!e.dead),spring=points.find(q=>q.type==='spring'&&q.state==='ready'),rift=points.filter(q=>q.type==='rift'&&q.state!=='done').sort((a,b)=>distance(a,p)-distance(b,p))[0];
 let target=null,action=false;
 if(mode==='objective'){
  if(p.hp<45&&spring)target=spring;
  else if(rift){target=rift;if(rift.state==='active'){const a=g.time*1.4;target={x:rift.x+Math.cos(a)*75,y:rift.y+Math.sin(a)*75};}else action=distance(rift,p)<95;}
  else{const chest=points.filter(q=>q.type==='chest'&&q.state==='ready').sort((a,b)=>(a.artifact==='yellow'&&!g.relics.includes('yellow')?-1:0)-(b.artifact==='yellow'&&!g.relics.includes('yellow')?-1:0)||distance(a,p)-distance(b,p))[0];if(chest){target=chest;action=distance(chest,p)<95;}}
  if(target===spring)action=distance(spring,p)<95;
 }
 const boss=threats.find(e=>e.final);if(!target&&boss){const a=g.time*.7;target={x:boss.x+Math.cos(a)*220,y:boss.y+Math.sin(a)*220};}
 const gem=g.gems.filter(j=>distance(j,p)<250&&!blocked(g.world,j.x,j.y,20)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
 if(!target)target=gem||{x:1900+430*Math.cos(g.time*.13),y:1400+430*Math.sin(g.time*.13)};
 // Opportunistic XP on the way, without abandoning an active seal.
 if(gem&&!(rift?.state==='active')&&distance(gem,target)<distance(p,target)+80&&distance(gem,p)<140)target=gem;
 let waypoint=target;
 if(lineBlocked(g.world,p,target,18)){
  const key=Math.floor(target.x/100)+','+Math.floor(target.y/100);
  if(state.key!==key||!state.route?.length||g.time>(state.repathAt||0)){state.route=pathTo(g.world,p,target);state.key=key;state.repathAt=g.time+1;}
  while(state.route?.length&&distance(state.route[0],p)<24)state.route.shift();waypoint=state.route?.[0]||target;
 }else state.route=null;
 let x=waypoint.x-p.x,y=waypoint.y-p.y,d=Math.hypot(x,y)||1;x/=d;y/=d;
 for(const e of threats){const n=distance(e,p);if(n<100){const f=(100-n)/100*1.7;x+=(p.x-e.x)/(n||1)*f;y+=(p.y-e.y)/(n||1)*f;}}
 for(const z of g.zones)if(['warning','danger'].includes(z.kind)&&distance(z,p)<z.radius+20){const n=distance(z,p)||1;x+=(p.x-z.x)/n*2;y+=(p.y-z.y)/n*2;}
 for(const e of threats)if(e.eliteId&&['windup','special'].includes(e.state)){const q=e.eliteId==='shady'?{x:e.aimX,y:e.aimY}:e,r=e.eliteId==='velvet'?180:e.eliteId==='shady'?125:0,n=distance(q,p);if(n<r){x+=(p.x-q.x)/(n||1)*3;y+=(p.y-q.y)/(n||1)*3;}}
 d=Math.hypot(x,y)||1;return {input:{x:x/d,y:y/d},interact:action,ultimate:p.ultCooldown<=0&&threats.some(e=>e.boss&&distance(e,p)<600||distance(e,p)<110)};
}
