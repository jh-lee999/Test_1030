import {selectButterFrame as sourceFrame} from './butter-gun-motion71.js';
import {selectButterFrame as originalFrame} from './butter-original-motion.js';
export const imageReady=im=>!!(im?.naturalWidth>0&&im?.naturalHeight>0&&im.complete!==false);
export function loopFrame(clip,time){return Math.floor((((Number.isFinite(time)?time:0)%clip.duration+clip.duration)%clip.duration)/clip.duration*clip.count);}
export function chooseButterFrame(images,state){
 const requested=sourceFrame(state),select=frame=>imageReady(images[frame.key])?{...frame,image:images[frame.key],requestedKey:requested.key,fallback:frame.key!==requested.key}:null;
 let frame=select(requested);if(frame)return frame;
 // An unavailable moving-fire sheet must not freeze the legs at idle/frame0.
 if(state.gait?.amount>.15){frame=select(originalFrame({...state,action:null}));if(frame)return frame;}
 if(state.action){frame=select(originalFrame({...state,action:{...state.action,type:'normal'}}));if(frame)return frame;}
 frame=select(originalFrame({...state,action:null,gait:{...state.gait,amount:0}}));if(frame)return frame;
 if(imageReady(images.poster)){const idle=originalFrame({reference:true});return {...idle,key:'poster',rect:[0,0,idle.clip.width,idle.clip.height],image:images.poster,requestedKey:requested.key,fallback:true};}return null;
}
export function drawButterMotion(c,images,state){
 const f=chooseButterFrame(images,state);if(!f)return false;const size=state.size??112,s=size/112;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(f.image,...f.rect,-f.origin[0]*s,size*.28-f.origin[1]*s,f.clip.width*s,f.clip.height*s);c.restore();return true;
}
