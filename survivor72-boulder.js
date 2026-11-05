import {arenaFor} from './survivor72-camera.js';
export const BOULDER={speed:640,radius:36,damage:90,life:8,hitCooldown:.45};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function boulderVelocity(player,target,facing,second=false){
 // Aim from the combat foot, NOT from a high muzzle down to the floor.
 // Never allow a horizontal/vertical dead lane: always traverse both axes.
 const dx=target?target.x-player.x:facing===-1?1:-1,dy=target?target.y-player.y:second?1:-1;
 const sx=Math.sign(dx)|| (facing===-1?1:-1),sy=Math.sign(dy)|| (second?1:-1);
 const a=clamp(Math.atan2(Math.abs(dy),Math.abs(dx)),Math.PI/8,Math.PI*3/8);
 return {vx:Math.cos(a)*BOULDER.speed*sx,vy:Math.sin(a)*BOULDER.speed*sy};
}
export function adoptArena(b,player,viewport){
 const next=arenaFor(player,viewport,b.radius),old=b.arena;
 const resized=old&&(Math.abs(next.right-next.left-(old.right-old.left))>.01||Math.abs(next.bottom-next.top-(old.bottom-old.top))>.01);
 const dx=old?next.left-old.left:0,dy=old?next.top-old.top:0,warp=!old||resized||Math.hypot(dx,dy)>80;
 const before={x:b.x,y:b.y};
 if(old&&resized){const u=(b.x-old.left)/(old.right-old.left),v=(b.y-old.top)/(old.bottom-old.top);b.x=next.left+u*(next.right-next.left);b.y=next.top+v*(next.bottom-next.top);}
 else if(old){b.x+=dx;b.y+=dy;}
 b.x=clamp(b.x,next.left,next.right);b.y=clamp(b.y,next.top,next.bottom);b.arena=next;
 if(warp)b.trail=[];else b.trail=(b.trail||[]).map(p=>({x:p.x+dx,y:p.y+dy}));
 return !warp&&(before.x!==b.x||before.y!==b.y)?[{a:before,b:{x:b.x,y:b.y}}]:[];
}
export function advanceBoulder(b,dt,player,viewport){
 const segments=adoptArena(b,player,viewport),a=b.arena;let remaining=dt,bounces=0;
 // Event-time reflection preserves residual distance and both corner normals.
 for(let i=0;i<12&&remaining>1e-9;i++){
  const tx=b.vx>0?(a.right-b.x)/b.vx:b.vx<0?(a.left-b.x)/b.vx:Infinity;
  const ty=b.vy>0?(a.bottom-b.y)/b.vy:b.vy<0?(a.top-b.y)/b.vy:Infinity;
  const t=Math.max(0,Math.min(remaining,tx,ty)),p={x:b.x,y:b.y};
  b.x+=b.vx*t;b.y+=b.vy*t;remaining-=t;segments.push({a:p,b:{x:b.x,y:b.y}});
  const reflectX=tx<=t+1e-9,reflectY=ty<=t+1e-9;
  if(reflectX)b.vx=-b.vx;if(reflectY)b.vy=-b.vy;
  if(reflectX||reflectY)bounces++;else break;
 }
 b.x=clamp(b.x,a.left,a.right);b.y=clamp(b.y,a.top,a.bottom);
 const last=b.trail?.at(-1);if(!last||Math.hypot(b.x-last.x,b.y-last.y)>18)b.trail=[...(b.trail||[]),{x:b.x,y:b.y}].slice(-10);
 return {segments,bounces};
}
export function projectBoulder(b,player,viewport){const projected={...b};adoptArena(projected,player,viewport);return projected;}
