import {patternOf} from './dungeon76-bosses.js';
const clamp=n=>Math.max(0,Math.min(1,n)),TAU=Math.PI*2;
const spellRoles=new Set(['caster','erpin','shady']);
// Read-only presentation: location hints intentionally omit attack angles,
// trajectory endpoints, hit radii, safe wedges and exact rectangle footprints.
export function castHint(g,e){
 if(e.state!=='tell'||e.hp<=0||e.appear>0)return null;
 const elapsed=e.boss?(e.action?.time||0):(e.attackClock||0),duration=e.boss?(patternOf(e)?.tell||1):elapsed+Math.max(0,e.timer),progress=clamp(elapsed/Math.max(.001,duration));
 const markers=[];
 if(e.boss&&['slam','runes'].includes(e.pattern))for(const p of e.targets||[])markers.push({x:p.x,y:p.y});
 if(e.boss&&['ambush','rift'].includes(e.pattern))markers.push({x:e.aimX,y:e.aimY});
 return {x:e.x,y:e.y,progress,kind:spellRoles.has(e.role)?'magic':'dust',color:spellRoles.has(e.role)?'#c8a6e1':'#edc38a',markers};
}
export function enemyFacing(g,e){
 let dx=g.player.x-e.x;
 if(e.state!=='move'){
  if(e.boss&&Number.isFinite(e.lockAngle))dx=Math.cos(e.lockAngle);
  else if(e.role==='rusher'&&['dash','recover'].includes(e.state)&&Number.isFinite(e.vx))dx=e.vx;
  else if(Number.isFinite(e.aimX))dx=e.aimX-e.x;
 }
 return dx>0.01?-1:1;
}
function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function softSpot(c,x,y,color,alpha=1,radius=32){
 c.save();c.globalAlpha*=alpha;const glow=c.createRadialGradient(x,y,0,x,y,radius);
 glow.addColorStop(0,color+'66');glow.addColorStop(.5,color+'28');glow.addColorStop(1,color+'00');
 c.fillStyle=glow;c.beginPath();c.arc(x,y,radius,0,TAU);c.fill();c.restore();
}
export function drawCastHints(c,g,e,{reduced=false}={}){
 const h=castHint(g,e);
 if(h){
  const p=reduced?.8:h.progress,breathe=reduced?1:.8+.2*Math.sin(p*Math.PI);
  softSpot(c,h.x,h.y-25,h.color,breathe,24+p*3);
  c.save();c.globalAlpha*=.5+p*.35;
  if(h.kind==='dust')for(const [dx,dy]of [[-15,4],[13,6],[-5,11]])dot(c,h.x+dx,h.y+dy,2+p*2,'#e3c7a3');
  else for(const dx of [-14,14])dot(c,h.x+dx,h.y-60,2+p*2,h.color);
  // A short, non-directional glint near release; static in reduced-motion mode.
  if(reduced||p>.62){const y=Math.max(135,h.y-(e.boss?145:88));c.fillStyle=h.color;c.fillRect(h.x-2,y-8,4,9);dot(c,h.x,y+6,2,h.color);}
  c.restore();for(const m of h.markers)softSpot(c,m.x,m.y,h.color,.55+p*.4);
 }
 // Only show an actual ground attack after it starts, never its future outline.
 if(e.boss&&e.state==='attack'&&['slam','runes','rift'].includes(e.pattern)){
  c.save();c.fillStyle='#c979ad35';for(const t of e.targets||[])if(t.r)softSpot(c,t.x,t.y,'#e3a1c3',1,t.r);else c.fillRect(t.x,t.y,t.w,t.h);c.restore();
 }
}
export function drawGroundThreat(c,z){
 if(z.triggered)softSpot(c,z.x,z.y,'#e59aa9',.9,z.radius);
 else softSpot(c,z.x,z.y,'#c5a2db',.5+clamp(z.age/.75)*.4);
}
