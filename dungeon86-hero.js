import {ELITE_ART} from './assets/trickcal-elites71/atlas.js';
import {imageReady,loopFrame} from './dungeon86-motion.js';
// Whole original Velvet source cells, one uniform scale for every clip/frame.
export function drawVelvet(c,g,images,reduced){
 const p=g.player,a=p.action,wanted=a?.type==='high'?'high':a?'attack':p.gait.amount>.05?'walk':'idle',source=images.elites?.velvet||{},key=imageReady(source[wanted])?wanted:p.gait.amount>.05&&imageReady(source.walk)?'walk':'idle',clip=ELITE_ART.heroes.velvet.clips[key],im=source[key],t=key===wanted&&a?a.time/a.duration*clip.duration:key==='walk'?p.gait.phase/6.28318530718*clip.duration:g.time;
 let index=clip.loop?Math.floor((t%clip.duration)/clip.duration*clip.count):Math.min(clip.count-1,Math.floor(t/clip.duration*clip.count));index=Math.max(0,index);
 c.save();c.scale(a?.facing||p.facing,1);const scale=.8;
 if(im?.naturalWidth)c.drawImage(im,index%clip.columns*clip.width,Math.floor(index/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);
 else{const poster=images.elites?.velvet?.poster;if(poster?.naturalWidth){const idle=ELITE_ART.heroes.velvet.clips.idle;c.drawImage(poster,-idle.origin[0]*scale,-idle.origin[1]*scale,idle.width*scale,idle.height*scale);}else{c.fillStyle='#b696b4';c.beginPath();c.arc(0,-26,20,0,Math.PI*2);c.fill();}}
 c.restore();
}
