import {BUTTER_2D_LAYOUT,BUTTER_2D_VIEWS} from './assets/butter-2d33/rig.js?v=33';
import {BUTTER_RIG35,BUTTER_LIMB_IMAGE,BUTTER_CLEAN_IMAGE,LIMB_PARTS} from './assets/butter-2d35/rig.js?v=35';
import {BUTTER_MOTION,butterReleasePoint} from './assets/butter-2d35/motion.js?v=35';
import {drawButterMotion as drawFallback,butterMuzzleOffset as fallbackMuzzle} from './butter-motion-cutout34.js?v=34';
export {BUTTER_2D_LAYOUT,BUTTER_2D_VIEWS,BUTTER_MOTION,BUTTER_RIG35,BUTTER_LIMB_IMAGE,BUTTER_CLEAN_IMAGE,butterReleasePoint};
export const BUTTER_STRIDE_DISTANCE=120;
const TAU=Math.PI*2,cache=new WeakMap();
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const mixPoint=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const rotate=(p,pivot,a)=>{const x=p[0]-pivot[0],y=p[1]-pivot[1];return[pivot[0]+x*Math.cos(a)-y*Math.sin(a),pivot[1]+x*Math.sin(a)+y*Math.cos(a)];};
function polygon(points){const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;}
function inverse(path){const p=new Path2D();p.rect(-1000,-1000,2600,2600);p.addPath(path);return p;}

export function advanceButterGait(gait,distance,dx,dy,dt){
  if(distance>.001){gait.phase=(gait.phase+distance/BUTTER_STRIDE_DISTANCE*TAU)%TAU;gait.dx=dx;gait.dy=dy;}
  gait.amount+=((distance>.001?1:0)-gait.amount)*(1-Math.exp(-dt*18));
  if(gait.amount<.002)gait.amount=0;
}

export function butterSpriteState({facingX,facingY,gait,action}){
  const x=action?.dx??facingX,y=action?.dy??facingY;
  const view=Math.abs(x)>Math.abs(y)*.82?x<0?'left':'right':y<0?'up':'down';
  const phase=gait.phase*(gait.dx*x+gait.dy*y<-.25?-1:1);
  const amount=action?.type==='high'?0:clamp(gait.amount);
  const progress=action?clamp(action.time/Math.max(.001,action.duration)):0;
  const release=butterReleasePoint(action?.type);
  const pull=action?(progress<release?smooth(progress/release):1-smooth((progress-release)/.085)):0;
  const drawPull=action?(progress<release?smooth(progress/release):1-smooth((progress-.7)/.3)):0;
  const recoil=action?Math.sin(clamp((progress-release)/.22)*Math.PI):0;
  const ready=action?smooth(progress/.14)*(1-smooth((progress-.78)/.22)):0;
  return {view,flip:false,phase,amount,progress,release,pull,drawPull,recoil,ready,
    firing:!!action,opening:!!action&&progress>=release&&progress<.82,
    walkFrame:amount>.002?Math.floor(((phase%TAU+TAU)%TAU)/TAU*12):0,
    attackFrame:action?Math.min(11,Math.floor(progress*12)):0,
    clip:action?.type==='high'?'high':action?amount>.002?'walkShoot':'shoot':amount>.002?'walk':'idle',
  };
}

export function butterSourceTransform(size,view){
  const scale=BUTTER_2D_LAYOUT.sourceScale*size/112,[fx,fy]=BUTTER_2D_VIEWS[view].foot;
  return {scale,x:-fx*scale,y:size*.28-fy*scale};
}

// Two rigid sections per leg: hip swing + knee fold. No scaling/warping.
// Vertical compensation puts the supporting sole on the same baseline.
export function butterLegTransforms(pose){
  const rig=BUTTER_RIG35[pose.view],base=BUTTER_2D_VIEWS[pose.view];
  const side=['left','right'].includes(pose.view),sign=pose.view==='right'?-1:1;
  return rig.legs.map((rect,i)=>{
    const reuse=pose.amount>.002&&rig.reuse?.rear===i?rig.reuse:null;
    const sourceIndex=reuse?.source??i,[sx,sy,sw]=rig.legs[sourceIndex];
    const sourceHip=[sx+sw/2,sy],hip=reuse?.pivot??[rect[0]+rect[2]/2,rect[1]];
    const sourceKnee=[sourceHip[0],rig.kneeY],sourceSole=[sourceHip[0],base.foot[1]];
    const wave=Math.sin(pose.phase+i*Math.PI),swing=Math.max(0,wave)*pose.amount;
    const angle=wave*pose.amount*(side?BUTTER_MOTION.sideSwing:BUTTER_MOTION.frontSwing)*sign;
    const kneeAngle=angle-(side?BUTTER_MOTION.kneeSwing:.08)*swing*sign;
    const lift=swing*BUTTER_MOTION.bootLift;
    const knee=rotate(sourceKnee,sourceHip,angle).map((v,j)=>v+hip[j]-sourceHip[j]);
    const end=rotate(sourceSole,sourceKnee,kneeAngle).map((v,j)=>v+knee[j]-sourceKnee[j]);
    const ground=base.foot[1]-end[1],dy=ground-lift;
    return {sourceIndex,sourceHip,sourceKnee,sourceSole,hip:[hip[0],hip[1]+dy],knee:[knee[0],knee[1]+dy],sole:[end[0],base.foot[1]-lift],angle,kneeAngle,lift};
  });
}
export const butterBootTransforms=butterLegTransforms;

export function butterArmPose(pose){
  const rig=BUTTER_RIG35[pose.view],old=BUTTER_2D_VIEWS[pose.view],t=pose.ready;
  const hold=mixPoint(rig.ready.hold,rig.aim.hold,t);
  const draw=mixPoint(rig.ready.draw,mixPoint(rig.aim.load,rig.aim.draw,pose.drawPull),t);
  if(pose.recoil){hold[1]+=pose.recoil*7;draw[1]-=pose.recoil*9;}
  const angle=mix(rig.ready.angle,rig.aim.angle,t)-pose.recoil*.06;
  const movePoint=p=>rotate(p,old.weapon.pivot,angle).map((v,i)=>v+hold[i]-old.weapon.pivot[i]);
  const fork=rig.forks.map(movePoint),muzzle=mixPoint(fork[0],fork[1],.5),wrist=movePoint(rig.wrist);
  const band=pose.opening?mixPoint(muzzle,draw,Math.exp(-(pose.progress-pose.release)*65)):draw;
  return {hold,wrist,draw,angle,muzzle,fork,band,shoulders:rig.shoulders,elbows:rig.elbows,opening:pose.opening};
}

export function butterTailPose(pose){return {root:BUTTER_RIG35[pose.view].tail.root,angle:Math.sin(pose.phase-BUTTER_MOTION.tailLag)*BUTTER_MOTION.tailSwing*pose.amount};}

export function butterMuzzleOffset(state){
  if(state.fallback)return fallbackMuzzle(state);
  const pose=butterSpriteState(state),p=butterArmPose(pose).muzzle,t=butterSourceTransform(state.size,pose.view);
  return {x:t.x+p[0]*t.scale,y:t.y+p[1]*t.scale};
}

export function prepareButterMotion(atlas){
  if(cache.has(atlas))return cache.get(atlas);
  const parts={};
  for(const [view,rig]of Object.entries(BUTTER_RIG35)){
    const old=BUTTER_2D_VIEWS[view],weapon=polygon(old.weapon.polygon),tail=polygon(rig.tail.polygon);
    // The older draw mask hugs the opaque edge. Clear the whole weapon's
    // bounded occlusion patch, including antialiasing, before restoring it.
    const xs=old.weapon.polygon.map(p=>p[0]),ys=old.weapon.polygon.map(p=>p[1]);
    const weaponClear=new Path2D();weaponClear.rect(Math.min(...xs)-4,Math.min(...ys)-4,Math.max(...xs)-Math.min(...xs)+8,Math.max(...ys)-Math.min(...ys)+8);
    const legs=rig.legs.map(([x,y,w,h],i)=>{
      const shape=new Path2D();
      if(old.bootMasks?.[i]){
        const points=old.bootMasks[i].map(([px,py])=>[px,py===old.boots[i][1]?y:py]);shape.addPath(polygon(points));
      }else shape.rect(x,y,w,h);
      return {shape};
    });
    const legClear=new Path2D();legClear.rect(...rig.legClear);
    const repair=new Path2D(weaponClear);for(const p of rig.armMasks)repair.addPath(polygon(p));
    parts[view]={weapon,tail,legs,repair,
      legHoles:[inverse(legClear)],tailHole:inverse(tail),
      armHoles:[inverse(weaponClear),...rig.armMasks.map(p=>inverse(polygon(p)))]};
  }
  cache.set(atlas,parts);return parts;
}

function drawArm(ctx,shoulder,elbow,wrist){
  // Round the elbow instead of joining two rectangular texture cuts. The
  // small original hand attachments remain separate grip/release sprites.
  const toward=(p,q,d)=>{const length=Math.hypot(q[0]-p[0],q[1]-p[1])||1;return mixPoint(p,q,Math.min(.35,d/length));};
  const before=toward(elbow,shoulder,8),after=toward(elbow,wrist,8);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  ctx.moveTo(...shoulder);ctx.lineTo(...before);ctx.quadraticCurveTo(...elbow,...after);ctx.lineTo(...wrist);
  ctx.strokeStyle='#805951';ctx.lineWidth=27;ctx.stroke();
  ctx.strokeStyle='#f4dadd';ctx.lineWidth=21;ctx.stroke();
  ctx.strokeStyle='#fff1f0';ctx.lineWidth=15;ctx.stroke();ctx.restore();
}
function hand(ctx,image,pose,arm){
  const name=arm.opening?'Hand_L_1_B':'Hand_L_2',rect=LIMB_PARTS[name];
  ctx.save();ctx.translate(...arm.draw);ctx.rotate(pose.view==='right'?Math.PI:pose.view==='up'?-.35:0);
  const scale=.95;ctx.drawImage(image,...rect,-rect[2]*scale/2,-rect[3]*scale/2,rect[2]*scale,rect[3]*scale);ctx.restore();
}

export function drawButterMotion(ctx,images,state){
  const pose=butterSpriteState(state),old=BUTTER_2D_VIEWS[pose.view],rig=BUTTER_RIG35[pose.view];
  if(!state.reference&&pose.firing&&(!images.limbs?.naturalWidth||!images.clean?.naturalWidth))return drawFallback(ctx,images,state);
  const t=butterSourceTransform(state.size,pose.view);
  ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.scale,t.scale);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const source=()=>ctx.drawImage(images.atlas,...old.rect,0,0,627,627);
  if(state.reference||pose.clip==='idle'){source();ctx.restore();return;}
  const parts=prepareButterMotion(images.atlas)[pose.view],legs=butterLegTransforms(pose),arm=butterArmPose(pose);
  for(const i of old.bootOrder??[0,1]){
    const leg=legs[i],part=parts.legs[leg.sourceIndex];
    ctx.save();ctx.translate(...leg.hip);ctx.rotate(leg.angle);ctx.translate(-leg.sourceHip[0],-leg.sourceHip[1]);
    ctx.clip(part.shape);ctx.beginPath();ctx.rect(0,0,627,rig.kneeY+5);ctx.clip();source();ctx.restore();
    ctx.save();ctx.translate(...leg.knee);ctx.rotate(leg.kneeAngle);ctx.translate(-leg.sourceKnee[0],-leg.sourceKnee[1]);
    ctx.clip(part.shape);ctx.beginPath();ctx.rect(0,rig.kneeY-3,627,627-rig.kneeY+3);ctx.clip();source();ctx.restore();
  }
  if(pose.firing){ctx.save();ctx.clip(parts.repair);ctx.drawImage(images.clean,...old.rect,0,0,627,627);ctx.restore();}
  const tail=butterTailPose(pose);
  ctx.save();ctx.translate(...tail.root);ctx.rotate(tail.angle);ctx.translate(-tail.root[0],-tail.root[1]);ctx.clip(parts.tail);source();ctx.restore();
  const drawArms=()=>{
    for(const side of ['right','left']){
      const shoulder=arm.shoulders[side],end=side==='right'?arm.wrist:arm.draw;
      const resting=arm.elbows[side],mid=[mix(shoulder[0],end[0],.5),mix(shoulder[1],end[1],.5)+14];
      const elbow=mixPoint(resting,mid,pose.ready);
      drawArm(ctx,shoulder,elbow,end);
    }
    ctx.save();ctx.translate(...arm.hold);ctx.rotate(arm.angle);ctx.translate(-old.weapon.pivot[0],-old.weapon.pivot[1]);ctx.clip(parts.weapon);source();ctx.restore();
    ctx.strokeStyle='#775141';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(...arm.fork[0]);ctx.lineTo(...arm.band);ctx.lineTo(...arm.fork[1]);ctx.stroke();
    hand(ctx,images.limbs,pose,arm);
  };
  // In the rear view both hands reach FORWARD: torso and hair occlude them.
  // Drawing this after the body produces an impossible arm across the back.
  if(pose.firing&&pose.view==='up')drawArms();
  ctx.save();for(const hole of [...parts.legHoles,parts.tailHole,...(pose.firing?parts.armHoles:[])])ctx.clip(hole,'evenodd');source();ctx.restore();
  ctx.save();ctx.beginPath();ctx.arc(...(rig.tail.seam??tail.root),18,0,TAU);ctx.clip();ctx.clip(parts.tail);source();ctx.restore();
  if(pose.firing&&pose.view!=='up')drawArms();
  ctx.restore();
}
