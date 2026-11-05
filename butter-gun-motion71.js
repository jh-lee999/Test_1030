import {BUTTER_GUN} from './assets/butter-gun71/atlas.js?v=71';
import {selectButterFrame as originalFrame,drawButterMotion as originalDraw,butterReleasePoint as originalRelease,butterMuzzleOffset as originalMuzzle,advanceButterGait} from './butter-original-motion.js';
export {advanceButterGait,BUTTER_GUN};
export const butterReleasePoint=type=>type==='gun'?BUTTER_GUN.clips.gun.release:originalRelease(type);
export function selectButterFrame(state){
 if(state.action?.type!=='gun')return originalFrame(state);
 const moving=state.gait?.amount>.15,key=moving?'walkGun':'gun',clip=BUTTER_GUN.clips[key],phase=Math.max(0,Math.min(1,state.action.time/state.action.duration));
 const walk=Math.floor((((state.gait?.phase||0)/(Math.PI*2))%1+1)%1*clip.gaitFrames),index=moving?walk*clip.shotFrames+Math.round(phase*(clip.shotFrames-1)):Math.round(phase*(clip.count-1));
 return {key,clip,index,phase,rect:[index%clip.columns*clip.width,Math.floor(index/clip.columns)*clip.height,clip.width,clip.height],origin:clip.origin,muzzle:clip.anchors[index]};
}
export function butterMuzzleOffset(state){if(state.action?.type!=='gun')return originalMuzzle(state);const f=selectButterFrame(state),s=(state.size??112)/112;return {x:f.muzzle[0]*s,y:f.muzzle[1]*s+(state.size??112)*.28};}
export function drawButterMotion(c,images,state){
 if(state.action?.type!=='gun')return originalDraw(c,images,state);const f=selectButterFrame(state),im=images[f.key];
 if(!im?.naturalWidth)return originalDraw(c,images,{...state,action:null});const size=state.size??112,s=size/112;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(im,...f.rect,-f.origin[0]*s,size*.28-f.origin[1]*s,f.clip.width*s,f.clip.height*s);c.restore();return true;
}
