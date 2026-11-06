import {blockedShot,VIEW,FLOOR,moveBody} from './dungeon76-world.js';
import {hurtPoint,segmentDistance,inheritedChild} from './dungeon76-build.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=e=>e.hp>0,TAU=Math.PI*2;
export function spawnPlan(g,api,plan,x,y,angle,extra={}){
 if(plan.shape==='beam'){
  const segments=traceBeam(g.rooms[g.room],{x,y},angle,plan.range,plan.bounces);
  api.bullet({kind:'beam',x,y,vx:0,vy:0,life:.2,radius:plan.radius,damage:plan.damage,plan,segments,done:false,returned:false,...extra});return;
 }
 if(plan.shape==='cleave'){
  api.effect('cleave',x,y,{angle,radius:plan.range,life:.22});
  for(const e of g.rooms[g.room].enemies){const h=hurtPoint(e),a=Math.atan2(h.y-y,h.x-x),d=Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)));if(live(e)&&e.appear<=0&&dist(h,{x,y})<plan.range+e.radius&&d<.95&&api.los({x,y},h)){api.hit(e,plan.damage,'cleave');impact(g,api,{x:h.x,y:h.y,vx:Math.cos(angle),vy:Math.sin(angle),plan,child:false,damage:plan.damage},e);}}
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
export function traceBeam(room,from,angle,range,bounces){
 let p={...from},vx=Math.cos(angle),vy=Math.sin(angle),start={...from},segments=[],remaining=range,inside=blockedShot(room,p.x,p.y,4);
 for(let i=0;i<500&&remaining>0;i++){const step=Math.min(7,remaining),q={x:p.x+vx*step,y:p.y+vy*step},next=blockedShot(room,q.x,q.y,4);
  if(next&&!inside){segments.push({a:start,b:{...p}});if(bounces--<=0)return segments;const rx=blockedShot(room,q.x,p.y,4),ry=blockedShot(room,p.x,q.y,4);if(rx||!ry)vx=-vx;if(ry)vy=-vy;start={...p};remaining-=step;continue;}
  p=q;inside=next;remaining-=step;if(p.x<0||p.x>VIEW.width||p.y<0||p.y>VIEW.height)break;
 }
 segments.push({a:start,b:p});return segments;
}
export function advanceFriendly(g,dt,api){
 const r=g.rooms[g.room],p=g.player;
 for(const b of [...g.bullets]){
  b.life-=dt;b.age+=dt;const old={x:b.x,y:b.y};b.lock=Math.max(0,(b.lock||0)-dt);
  if(b.kind==='beam'){
   const returning=(b.plan.returning||b.plan.rangeReturn)&&b.age>=.075&&!b.returned;
   if(!b.done||returning){if(returning){b.returned=true;b.hits={};}for(const e of r.enemies)if(live(e)&&e.appear<=0&&!b.hits[e.id]&&b.segments.some(s=>segmentDistance(hurtPoint(e),s.a,s.b)<e.radius+b.radius)){b.hits[e.id]=1e9;api.hit(e,b.damage*(returning?.55:1),'beam');impact(g,api,b,e);}b.done=true;}continue;
  }
  if(b.kind==='chain'){const target=api.nearest(b,b.last,480);if(target){const h=hurtPoint(target),d=dist(h,b)||1;b.vx=(h.x-b.x)/d*590;b.vy=(h.y-b.y)/d*590;}}
  if(b.returning&&b.age>.5||b.returned){if(!b.returned){b.returned=true;b.hits={};}const target=hurtPoint(p),d=dist(target,b);if(d<20){b.life=0;continue;}b.vx=(target.x-b.x)/d*650;b.vy=(target.y-b.y)/d*650;}
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.travel=(b.travel||0)+Math.hypot(b.x-old.x,b.y-old.y);
  if(b.kind==='boulder'){
   for(const [axis,v,max]of [['x','vx',VIEW.width-50],['y','vy',VIEW.height-50]])if(b[axis]<50||b[axis]>max){b[axis]=b[axis]<50?100-b[axis]:2*max-b[axis];b[v]*=-1;g.telemetry.bounce++;api.effect('pulse',b.x,b.y,{radius:40,life:.2});}
   if(g.augments.includes('trail')&&(b.trailAt||0)<=g.time&&g.zones.filter(z=>z.kind==='fire').length<35){b.trailAt=g.time+.32;g.zones.push({kind:'fire',x:Math.max(FLOOR.left,Math.min(FLOOR.right,b.x)),y:Math.max(FLOOR.top,Math.min(FLOOR.bottom,b.y)),age:0,life:1,radius:38,timer:0});g.telemetry.augTrail++;}
  }else if(blockedShot(r,b.x,b.y,b.radius)&&!blockedShot(r,old.x,old.y,b.radius)){
   const crate=r.obstacles.find(o=>o.kind==='pot'&&o.hp>0&&b.x>o.x-10&&b.x<o.x+o.w+10&&b.y>o.y-10&&b.y<o.y+o.h+10);if(crate)api.breakCrate(crate);
   if(b.wallBounces>0){let rx=blockedShot(r,b.x,old.y,b.radius),ry=blockedShot(r,old.x,b.y,b.radius);if(!rx&&!ry)rx=Math.abs(b.vx)>=Math.abs(b.vy),ry=!rx;if(rx)b.vx=-b.vx;if(ry)b.vy=-b.vy;b.x=old.x;b.y=old.y;b.wallBounces--;b.hits={};g.telemetry.wallBounce++;if(b.plan?.flags.lightning)api.lightning({x:b.x,y:b.y});}
   else if(b.returning||b.plan?.rangeReturn){b.returned=true;b.hits={};b.x=old.x;b.y=old.y;}else b.life=0;
  }
  if(b.plan&&b.travel>=b.plan.range&&!b.returned){if(b.plan.rangeReturn||b.returning){b.returned=true;b.hits={};}else b.life=0;}
  if(b.x<0||b.x>VIEW.width||b.y<0||b.y>VIEW.height)b.life=0;
  for(const e of r.enemies){
   if(!live(e)||b.life<=0||e.appear>0||b.lock>0||(b.hits[e.id]||0)>g.time||segmentDistance(hurtPoint(e),old,b)>e.radius+b.radius)continue;
   const shield=e.role==='guard'&&e.state==='move'&&Math.sign(b.vx)===-Math.sign(e.aimX-e.x);
   api.hit(e,b.damage*(shield?.4:1),b.kind);impact(g,api,b,e);
   if(b.kind==='chain'){if(b.plan?.flags.lightning)api.lightning(e);b.hits={[e.id]:g.time+.08};b.last=e.id;b.lock=.085;b.bounces--;if(b.bounces<=0||!api.nearest(b,e.id,480))b.life=0;break;}
   b.hits[e.id]=b.kind==='boulder'?g.time+.45:1e9;if(b.kind==='boulder'||b.returning||b.returned)continue;if(b.pierce>0)b.pierce--;else b.life=0;
  }
 }
 g.bullets=g.bullets.filter(b=>b.life>0);
}
