import {FLOOR,viewFor,random} from './dungeon80-world.js';
import {hurtPoint,segmentDistance,inheritedChild} from './dungeon80-build.js';
import {firstShotHit,segmentBox,shotBounds} from './dungeon82-collision.js';
import {enemyContacts} from './dungeon83-contacts.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=e=>e.hp>0,TAU=Math.PI*2;
export function spawnPlan(g,api,plan,x,y,angle,extra={}){
 if(plan.shape==='beam'){
  const segments=traceBeam(g.rooms[g.room],{x,y},angle,plan.range,plan.bounces,o=>api.breakCrate(o),plan.radius);
  api.bullet({kind:'beam',x,y,vx:0,vy:0,life:.2,radius:plan.radius,damage:plan.damage,plan,segments,done:false,returned:false,...extra});return;
 }
 if(plan.shape==='cleave'){
  api.effect('cleave',x,y,{angle,radius:plan.range,life:.22});
  const room=g.rooms[g.room];
  for(const o of room.obstacles){if(o.kind!=='pot'||o.hp<=0)continue;const b=shotBounds(o),p={x:Math.max(b.left,Math.min(b.right,x)),y:Math.max(b.top,Math.min(b.bottom,y))},a=Math.atan2(p.y-y,p.x-x),d=dist(p,{x,y});
   if(d>plan.range||d>0&&Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)))>=.95)continue;
   const hit=firstShotHit(room,{x,y},p,0);if(!hit||hit.obstacle===o)api.breakCrate(o);
  }
  for(const e of g.rooms[g.room].enemies){const h=hurtPoint(e),a=Math.atan2(h.y-y,h.x-x),d=Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)));if(live(e)&&e.appear<=0&&(e.hiddenUntil||0)<=g.time&&dist(h,{x,y})<plan.range+e.radius&&d<.95&&api.los({x,y},h)){api.hit(e,plan.damage,'cleave');impact(g,api,{x:h.x,y:h.y,vx:Math.cos(angle),vy:Math.sin(angle),plan,child:false,damage:plan.damage},e);}}
  return;
 }
 for(let i=0;i<(plan.count||1);i++){const a=angle+(i-((plan.count||1)-1)/2)*(plan.spread||0);
  api.bullet({kind:plan.gun?'gun':plan.weapon==='charge'?'charged':'stone',x,y,vx:Math.cos(a)*plan.speed,vy:Math.sin(a)*plan.speed,life:6,radius:plan.radius,damage:plan.damage,pierce:plan.pierce,wallBounces:plan.bounces,returning:plan.returning,returned:false,travel:0,plan:structuredClone(plan),child:!!plan.child,...extra});
 }
}
// The same bounded impact pipeline runs for pellets, beams, melee and children.
export function impact(g,api,b,e){
 const f=b.plan?.flags||{},h=hurtPoint(e);g.hits++;if(f.primary)g.primaryHits++;
 if(f.frost&&g.hits%3===0){e.freezeUntil=g.time+(e.boss?.15:.65);g.telemetry.frozen++;}
 if(f.lightning&&g.hits%4===0)api.lightning(e);
 if(f.impact&&g.hits%3===0)api.area(e.x,e.y,85,12,'impact');
 if(f.fire&&g.zones.filter(z=>z.kind==='fire').length<35){g.zones.push({kind:'fire',x:e.x,y:e.y,age:0,life:2,radius:40,timer:0});g.telemetry.fire++;}
 if(f.charged&&b.plan.weapon!=='charge'&&g.hits%4===0){api.area(e.x,e.y,70,10,'charged');g.telemetry.charged++;}
 if(f.split&&!b.child){const child=inheritedChild(b.plan),a=Math.atan2(b.vy,b.vx);for(const offset of [-.6,.6])spawnPlan(g,api,child,h.x,h.y,a+offset,{hits:{[e.id]:1e9}});g.telemetry.split++;}
}
export function traceBeam(room,from,angle,range,bounces=0,onCrate=null,radius=4){
 let p={...from},vx=Math.cos(angle),vy=Math.sin(angle),segments=[],remaining=range;
 for(let i=0;i<10&&remaining>0;i++){
  const end={x:p.x+vx*remaining,y:p.y+vy*remaining},hit=firstShotHit(room,p,end,radius),at=hit?{x:hit.x,y:hit.y}:end;
  segments.push({a:{...p},b:at});if(!hit)break;
  if(hit.obstacle?.kind==='pot')onCrate?.(hit.obstacle);
  remaining-=dist(p,at);if(bounces--<=0)break;
  const axes=hit.axes;if(!axes.x&&!axes.y)axes.x=Math.abs(vx)>=Math.abs(vy),axes.y=!axes.x;
  if(axes.x)vx=-vx;if(axes.y)vy=-vy;
  // Keep the reflected origin just outside the struck face, without extending
  // the finite range. A source stuck inside solid cover cannot tunnel through.
  p={x:at.x+vx*.01,y:at.y+vy*.01};remaining-=.01;
 }
 return segments;
}
export function advanceFriendly(g,dt,api){
 const r=g.rooms[g.room],p=g.player;
 for(const b of [...g.bullets]){
  b.life-=dt;b.age+=dt;if(b.life<=0)continue;const old={x:b.x,y:b.y};b.lock=Math.max(0,(b.lock||0)-dt);
  if(b.kind==='beam'){
   const returning=(b.plan.returning||b.plan.rangeReturn)&&b.age>=.075&&!b.returned;
   if(!b.done||returning){if(returning){b.returned=true;b.hits={};}for(const e of r.enemies)if(live(e)&&e.appear<=0&&(e.hiddenUntil||0)<=g.time&&!b.hits[e.id]&&b.segments.some(s=>segmentDistance(hurtPoint(e),s.a,s.b)<e.radius+b.radius)){b.hits[e.id]=1e9;api.hit(e,b.damage*(returning?.55:1)*(b.plan.flags.far&&dist(hurtPoint(e),b)>=300?1.25:1),'beam');impact(g,api,b,e);}b.done=true;}continue;
  }
  if(b.kind!=='boulder'&&b.plan?.flags.seeking&&b.age>=(b.guidanceAt??.12)&&!b.returned&&!(b.returning&&b.age>.5)){
   const speed=Math.hypot(b.vx,b.vy),target=api.nearest(b,null,260,e=>{const h=hurtPoint(e),d=dist(h,b);return d>0&&speed>0&&((h.x-b.x)*b.vx+(h.y-b.y)*b.vy)/(d*speed)>.2&&api.los(b,h);});
   if(target){const h=hurtPoint(target),from=Math.atan2(b.vy,b.vx),to=Math.atan2(h.y-b.y,h.x-b.x),turn=Math.atan2(Math.sin(to-from),Math.cos(to-from)),a=from+Math.max(-1.9*dt,Math.min(1.9*dt,turn));b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;if(!b.guided){b.guided=true;g.telemetry.homing++;}}
  }
  if(b.returning&&b.age>.5||b.returned){if(!b.returned){b.returned=true;b.hits={};}const target=hurtPoint(p),d=dist(target,b);if(d<20){b.life=0;continue;}b.vx=(target.x-b.x)/d*650;b.vy=(target.y-b.y)/d*650;}
  if(b.returned&&b.child&&b.plan?.flags.comet&&!b.cometDone){b.cometDone=true;const plan={...inheritedChild(b.plan,.4),flags:{...b.plan.flags,comet:false,split:false,primary:false},child:true};for(const off of [-.8,.8])spawnPlan(g,api,plan,b.x,b.y,Math.atan2(b.vy,b.vx)+off);g.telemetry.comet=(g.telemetry.comet||0)+2;}
  const travelBefore=b.travel||0,step=Math.hypot(b.vx*dt,b.vy*dt),remaining=b.plan&&!b.returned&&b.kind!=='boulder'?Math.max(0,b.plan.range-travelBefore):Infinity,ratio=step>0?Math.min(1,remaining/step):1;
  const end={x:old.x+b.vx*dt*ratio,y:old.y+b.vy*dt*ratio},length=dist(old,end),rangeEnd=remaining<=step;
  b.x=end.x;b.y=end.y;
  const solid=b.kind==='boulder'?null:firstShotHit(r,old,end,b.radius);
  if(b.kind==='boulder'){
   for(const o of r.obstacles)if(o.kind==='pot'&&o.hp>0&&segmentBox(old,end,shotBounds(o),b.radius))api.breakCrate(o);
   const margin=50*(b.radius||36)/36;for(const [axis,v,max]of [['x','vx',viewFor(r).width-margin],['y','vy',viewFor(r).height-margin]])if(b[axis]<margin||b[axis]>max){b[axis]=b[axis]<margin?2*margin-b[axis]:2*max-b[axis];b[v]*=-1;g.telemetry.bounce++;api.effect('pulse',b.x,b.y,{radius:40,life:.2});}
   if(g.augments.includes('trail')&&(b.trailAt||0)<=g.time&&g.zones.filter(z=>z.kind==='fire').length<35){b.trailAt=g.time+.32;g.zones.push({kind:'fire',x:Math.max(FLOOR.left,Math.min(FLOOR.right,b.x)),y:Math.max(FLOOR.top,Math.min(FLOOR.bottom,b.y)),age:0,life:1,radius:38,timer:0});g.telemetry.augTrail++;}
  }
  const destination={x:b.x,y:b.y};let interrupted=false,progress=0;
  for(let contacts=0;contacts<=r.enemies.length;contacts++){
   // Procs may kill or knock back later targets. Re-evaluate after every hit,
   // rather than applying stale contacts to enemies that have already moved.
   const contact=enemyContacts(g,b,old,destination).find(c=>c.t>=progress-1e-9&&(!solid||c.t<solid.t-1e-9));if(!contact||b.life<=0)break;
   const {e,t}=contact;progress=t;
   b.x=old.x+(destination.x-old.x)*t;b.y=old.y+(destination.y-old.y)*t;b.travel=travelBefore+length*t;
   const shield=e.role==='guard'&&e.state==='move'&&Math.sign(b.vx)===-Math.sign(e.aimX-e.x);
   api.hit(e,b.damage*(shield?.4:1)*(b.plan?.flags.far&&b.travel>=300?1.25:1),b.kind);impact(g,api,b,e);
   if(b.kind==='chain'){
    if(b.plan?.flags.lightning)api.lightning(e);b.hits[e.id]=g.time+.12;b.last=e.id;b.lock=0;
    const bounceAngle=random(g.combatRng)*TAU;b.vx=Math.cos(bounceAngle)*590;b.vy=Math.sin(bounceAngle)*590;b.guidanceAt=b.age+.12;b.bounces--;if(b.bounces<=0)b.life=0;interrupted=true;break;
   }
   b.hits[e.id]=b.kind==='boulder'?g.time+.45:1e9;
   if(b.kind==='boulder'||b.returning||b.returned)continue;
   if(b.pierce>0)b.pierce--;else{b.life=0;interrupted=true;break;}
  }
  if(interrupted)continue;
  b.x=destination.x;b.y=destination.y;b.travel=travelBefore+length;
  if(solid&&b.life>0){
   b.x=solid.x;b.y=solid.y;b.travel=travelBefore+length*solid.t;
   if(solid.obstacle?.kind==='pot')api.breakCrate(solid.obstacle);
   if(b.wallBounces>0){let rx=solid.axes.x,ry=solid.axes.y;if(!rx&&!ry)rx=Math.abs(b.vx)>=Math.abs(b.vy),ry=!rx;if(rx)b.vx=-b.vx;if(ry)b.vy=-b.vy;const n=Math.hypot(b.vx,b.vy)||1;b.x+=b.vx/n*.01;b.y+=b.vy/n*.01;b.wallBounces--;b.hits={};g.telemetry.wallBounce++;if(b.plan?.flags.lightning)api.lightning({x:b.x,y:b.y});}
   else if(b.returning||b.plan?.rangeReturn){b.returned=true;b.hits={};const n=dist(old,solid)||1;b.x+=(old.x-solid.x)/n*.01;b.y+=(old.y-solid.y)/n*.01;}else b.life=0;
  }else if(rangeEnd&&b.life>0&&!b.returned){if(b.plan?.rangeReturn||b.returning){b.returned=true;b.hits={};}else b.life=0;}
  if(b.x<0||b.x>viewFor(r).width||b.y<0||b.y>viewFor(r).height)b.life=0;
 }
 g.bullets=g.bullets.filter(b=>b.life>0);
}
