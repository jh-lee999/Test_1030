import {boundsFor} from './dungeon84-world.js';
import {CRATE} from './assets/sanctuary75/atlas.js';
const boxes=new WeakMap(),axes=['x','y'];
// Body/navigation retain their ground footprints. Shots hit the visible wooden
// box (same atlas alpha bounds and scale as drawCrate), not just its lower half.
export function shotBounds(o){
 const old=boxes.get(o);if(old&&old.x===o.x&&old.y===o.y&&old.w===o.w&&old.h===o.h&&old.kind===o.kind)return old.box;
 let box;
 if(o.kind!=='pot')box={left:o.x,right:o.x+o.w,top:o.y,bottom:o.y+o.h};
 else{
 const scale=(o.w+8)/(CRATE.bounds[2]-CRATE.bounds[0]);
 box={left:o.x-4,right:o.x+o.w+4,top:Math.min(o.y,o.y+o.h+(CRATE.bounds[1]-CRATE.foot[1])*scale),bottom:o.y+o.h};
 }boxes.set(o,{x:o.x,y:o.y,w:o.w,h:o.h,kind:o.kind,box});return box;
}
export function blockedShot(room,x,y,r=6){
 const b=boundsFor(room);if(x<b.left+r||x>b.right-r||y<b.top+r||y>b.bottom-r)return true;
 return room.obstacles.some(o=>{if(o.hp===0||o.kind==='gap')return false;const b=shotBounds(o);return x>b.left-r&&x<b.right+r&&y>b.top-r&&y<b.bottom+r;});
}
// Slab sweep: returns the FIRST contact, including a muzzle already inside a
// box. The same radius is used for detection and identification, at any speed.
export function segmentBox(a,b,box,r=0){
 let enter=0,leave=1,mask=0;
 for(const axis of axes){const lo=box[axis==='x'?'left':'top']-r,hi=box[axis==='x'?'right':'bottom']+r,d=b[axis]-a[axis];
  if(Math.abs(d)<1e-12){if(a[axis]<lo||a[axis]>hi)return null;continue;}
  let near=(lo-a[axis])/d,far=(hi-a[axis])/d;if(near>far)[near,far]=[far,near];
  if(near>enter){enter=near;mask=axis==='x'?1:2;}else if(Math.abs(near-enter)<1e-9)mask|=axis==='x'?1:2;
  leave=Math.min(leave,far);if(enter>leave)return null;
 }
 if(leave<0||enter>1)return null;return {t:Math.max(0,enter),axes:{x:!!(mask&1),y:!!(mask&2)}};
}
export function firstShotHit(room,a,b,r=6){
 const bounds=boundsFor(room);let best=null;
 const put=(t,obstacle,axes)=>{if(t>=0&&t<=1&&(!best||t<best.t))best={t,obstacle,axes,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};};
 for(const axis of axes){const lo=bounds[axis==='x'?'left':'top']+r,hi=bounds[axis==='x'?'right':'bottom']-r,d=b[axis]-a[axis];
  // A tall source muzzle can start above the floor. Permit entry, but stop a
  // segment when it exits the opposite wall (also for one long beam segment).
  if(d>0&&a[axis]<=hi&&b[axis]>hi)put((hi-a[axis])/d,null,{x:axis==='x',y:axis==='y'});
  if(d<0&&a[axis]>=lo&&b[axis]<lo)put((lo-a[axis])/d,null,{x:axis==='x',y:axis==='y'});
 }
 for(const o of room.obstacles){if(o.hp===0||o.kind==='gap')continue;const hit=segmentBox(a,b,shotBounds(o),r);if(hit)put(hit.t,o,hit.axes);}
 return best;
}
