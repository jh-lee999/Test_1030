import {nearestFree} from './dungeon80-world.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function biomeView(g){
 const r=g.rooms[g.room],b=r.biome;if(!b)return null;
 if(b.kind==='portals')return {kind:b.kind,phase:'portal',marks:b.points,radius:26};
 if(r.cleared||b.clock<0)return {kind:b.kind,phase:'quiet',marks:[],radius:b.kind==='spores'?65:55};
 const period=r.route==='wild'?4.6:5.4,cycle=Math.floor(b.clock/period),t=b.clock%period,marks=r.route==='wild'?[b.points[cycle%b.points.length],b.points[(cycle+1)%b.points.length]]:[b.points[cycle%b.points.length]];
 return {kind:b.kind,phase:t<1.05?'warn':t<1.4?'active':'quiet',marks:t<1.4?marks:[],radius:b.kind==='spores'?65:55,cycle,progress:Math.min(1,t/1.05)};
}
export function tickBiome(g,dt,{damage,hit,emit=()=>{},effect=()=>{}}){
 const r=g.rooms[g.room],b=r.biome;if(!b)return;
 if(b.kind==='portals'){
  for(const a of [g.player,...r.enemies]){
   if(a.hp<=0||a.appear>0||(a.portalAt||0)>g.time)continue;
   const i=b.points.findIndex(p=>distance(a,p)<26);if(i<0)continue;
   const to=nearestFree(r,b.points[1-i],32);a.x=to.x;a.y=to.y;a.portalAt=g.time+1.4;
   if(a===g.player){a.invuln=Math.max(a.invuln,.18);emit('portal');}else a.portalGraceUntil=g.time+.18;
   effect('pulse',to.x,to.y,{radius:38,life:.3});
  }
  return;
 }
 if(r.cleared)return;b.clock+=dt;const v=biomeView(g);if(v.phase!=='active')return;
 const token=g.floorIndex+':'+r.id+':'+v.cycle;
 if(b.cycle!==v.cycle){b.cycle=v.cycle;emit('hazard');}
 for(const a of [g.player,...r.enemies])if(a.hp>0&&!(a.appear>0)&&a.biomeHitToken!==token&&v.marks.some(p=>distance(a,p)<v.radius+(a===g.player?0:a.radius*.5))){
  a.biomeHitToken=token;const mark=v.marks.find(p=>distance(a,p)<v.radius+(a.radius||0));
  if(a===g.player)damage(10,{kind:'hazard',label:b.kind==='spores'?'버섯 포자':'낙하 책',x:mark.x,y:mark.y});else hit(a,12,'terrain');
 }
}
