// Input controller only. The engine's preview and shot both use the same g.aim.
import {BOARD,aimAt} from './bonk-engine.js?v=48';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const AIM_CONTROL={maxSpeed:Math.PI*1.5,response:18,snap:Math.PI/3000,keyStep:Math.PI/400,fineStep:Math.PI/1800,keySpeed:Math.PI/10,fineSpeed:Math.PI/45};
export const aimAngle=(g,p=g.aim)=>Math.atan2(p.y-BOARD.launch.y,p.x-g.launchX);
export function createAimControl(g){return {target:{...g.aim},applied:g.aim,launchX:g.launchX,phase:g.phase,pending:false};}
export function cancelAim(c,g){Object.assign(c,createAimControl(g));}
function syncAim(c,g){
  // Also respects direct engine aimAt calls in replay/diagnostic clients.
  if(c.applied!==g.aim||c.launchX!==g.launchX||c.phase!==g.phase)cancelAim(c,g);
}
export function setAimTarget(c,g,x,y){
  syncAim(c,g);if(g.phase!=='aim'||c.pending||!Number.isFinite(x)||!Number.isFinite(y))return false;
  c.target={x:clamp(x,BOARD.left,BOARD.right),y:clamp(y,BOARD.top,BOARD.danger-55)};return true;
}
function pointOnRay(g,angle,distance){
  const minY=BOARD.danger-55,dy=BOARD.launch.y-minY;
  angle=clamp(angle,Math.atan2(-dy,BOARD.left-g.launchX),Math.atan2(-dy,BOARD.right-g.launchX));
  const dx=Math.cos(angle),up=-Math.sin(angle),minDistance=dy/up;
  const maxDistance=Math.min((BOARD.launch.y-BOARD.top)/up,Math.abs(dx)<1e-10?Infinity:(dx>0?BOARD.right-g.launchX:g.launchX-BOARD.left)/Math.abs(dx));
  const d=clamp(distance,minDistance,maxDistance);
  return {x:g.launchX+dx*d,y:BOARD.launch.y-up*d};
}
export function nudgeAim(c,g,radians){
  syncAim(c,g);if(!Number.isFinite(radians)||g.phase!=='aim'||c.pending)return false;
  const d=Math.hypot(c.target.x-g.launchX,c.target.y-BOARD.launch.y),p=pointOnRay(g,aimAngle(g,c.target)+radians,d);
  return setAimTarget(c,g,p.x,p.y);
}
export function aimAligned(c,g){return Math.abs(aimAngle(g,c.target)-aimAngle(g))<=AIM_CONTROL.snap;}
export function requestAimShot(c,g){
  syncAim(c,g);if(g.phase!=='aim'||c.pending)return false;c.pending=true;return true;
}
// Exact integration of d(angle)/dt = clamp(error * response, ±maxSpeed).
// No overshoot, frame-count dependence, or event-frequency dependence.
export function easeAngle(current,target,dt){
  if(!(dt>0&&Number.isFinite(dt)))return current;
  const error=target-current,amount=Math.abs(error),{maxSpeed,response}=AIM_CONTROL,threshold=maxSpeed/response;
  const linearTime=Math.max(0,(amount-threshold)/maxSpeed);
  const remaining=dt<=linearTime?amount-maxSpeed*dt:Math.min(amount,threshold)*Math.exp(-response*(dt-linearTime));
  return target-Math.sign(error)*remaining;
}
export function advanceAim(c,g,dt){
  syncAim(c,g);if(g.phase!=='aim')return false;
  const targetAngle=aimAngle(g,c.target),angle=easeAngle(aimAngle(g),targetAngle,dt);
  let p;
  if(Math.abs(targetAngle-angle)<=AIM_CONTROL.snap)p={...c.target};
  else{
    const from=Math.hypot(g.aim.x-g.launchX,g.aim.y-BOARD.launch.y),to=Math.hypot(c.target.x-g.launchX,c.target.y-BOARD.launch.y);
    p=pointOnRay(g,angle,from+(to-from)*(1-Math.exp(-AIM_CONTROL.response*Math.max(0,Number.isFinite(dt)?dt:0))));
  }
  if(p.x!==g.aim.x||p.y!==g.aim.y){aimAt(g,p.x,p.y);c.applied=g.aim;}
  return c.pending&&aimAligned(c,g);
}
