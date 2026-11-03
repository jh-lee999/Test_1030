import {BUTTER_ORIGINAL} from './assets/butter-original36/atlas.js?v=36';
export {BUTTER_ORIGINAL};
const TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const wrap=n=>((n%1)+1)%1;
export const BUTTER_STRIDE_DISTANCE=188;
export const BUTTER_POSTER='./assets/butter-original36/poster.png';
export const butterReleasePoint=type=>BUTTER_ORIGINAL.clips[type==='high'?'high':type==='low'?'low':'shoot'].release;

export function advanceButterGait(gait,distance,dx,dy,dt){
  gait.clock=(gait.clock||0)+dt;
  if(distance>.001){gait.phase=(gait.phase+distance/BUTTER_STRIDE_DISTANCE*TAU)%TAU;gait.dx=dx;gait.dy=dy;}
  gait.amount+=((distance>.001?1:0)-gait.amount)*(1-Math.exp(-dt*18));
  if(gait.amount<.002)gait.amount=0;
}

// Two clocks choose a WHOLE rendered frame. No part clipping, limb drawing,
// rescaling of joints, per-frame alignment, or horizontal mirroring at runtime.
export function selectButterFrame({gait={phase:0,amount:0},action,time=gait.clock||0,reference=false}){
  const moving=gait.amount>.15&&!reference;
  let key,phase,index;
  if(reference){key='idle';phase=0;}
  else if(action){
    key=action.type==='high'?'high':moving?'walkShoot':action.type==='low'?'low':'shoot';
    phase=clamp(action.time/Math.max(.001,action.duration));
    if(key==='walkShoot'&&action.type==='low'){
      const low=butterReleasePoint('low'),normal=butterReleasePoint('normal');
      phase=phase<low?phase/low*normal:normal+(phase-low)/(1-low)*(1-normal);
    }
  }else if(moving){key='walk';phase=wrap(gait.phase/TAU);}
  else{key='idle';phase=wrap(time/BUTTER_ORIGINAL.clips.idle.duration);}
  const clip=BUTTER_ORIGINAL.clips[key];
  if(key==='walkShoot'){
    const walk=Math.floor(wrap(gait.phase/TAU)*clip.gaitFrames),shot=Math.round(phase*(clip.shotFrames-1));
    index=walk*clip.shotFrames+shot;
  }else index=clip.loop?Math.min(clip.count-1,Math.floor(phase*clip.count)):Math.round(phase*(clip.count-1));
  return {key,clip,index,phase,rect:[index%clip.columns*clip.width,Math.floor(index/clip.columns)*clip.height,clip.width,clip.height],origin:clip.origin,muzzle:clip.anchors[index]};
}

export function butterMuzzleOffset(state){
  const frame=selectButterFrame(state),scale=(state.size??112)/112;
  return {x:frame.muzzle[0]*scale,y:frame.muzzle[1]*scale+(state.size??112)*.28};
}

export function drawButterMotion(ctx,images,state){
  let frame=selectButterFrame(state),image=images[frame.key];
  if(!image?.naturalWidth){
    if(images.idle?.naturalWidth){frame=selectButterFrame({reference:true});image=images.idle;}
    else if(images.poster?.naturalWidth){frame=selectButterFrame({reference:true});image=images.poster;frame={...frame,rect:[0,0,frame.clip.width,frame.clip.height]};}
    else return false;
  }
  const size=state.size??112,scale=size/112;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,...frame.rect,-frame.origin[0]*scale,size*.28-frame.origin[1]*scale,frame.clip.width*scale,frame.clip.height*scale);
  ctx.restore();return true;
}
