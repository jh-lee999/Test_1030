import {hurtPoint} from './dungeon80-build.js';
// Entry time of a swept bullet against a circular hurtbox, not enemy array order.
export function circleContact(a,b,p,r){
 const x=a.x-p.x,y=a.y-p.y,dx=b.x-a.x,dy=b.y-a.y,c=x*x+y*y-r*r;
 if(c<=0)return 0;const aa=dx*dx+dy*dy;if(aa<1e-12)return null;
 const bb=2*(x*dx+y*dy),disc=bb*bb-4*aa*c;if(disc<0)return null;
 const t=(-bb-Math.sqrt(disc))/(2*aa);return t>=0&&t<=1?t:null;
}
export function enemyContacts(g,b,from,to){
 const out=[];
 for(const e of g.rooms[g.room].enemies){if(e.hp<=0||e.appear>0||(e.hiddenUntil||0)>g.time||b.lock>0||(b.hits[e.id]||0)>g.time)continue;
  const t=circleContact(from,to,hurtPoint(e),e.radius+b.radius);if(t!==null)out.push({e,t});
 }
 return out.sort((a,b)=>a.t-b.t||a.e.id-b.e.id);
}
