import {drawButterMotion,butterReleasePoint} from './butter-original-motion.js';
import {STAGE_ART} from './platformer-art.js?v=43';
import {ENCOUNTERS} from './dice-engine.js?v=52';
export const HERO={x:190,y:220,size:80};
export const ENEMY_SCALE={fan:.9,archer:.9,guard:.52,ghost:1};
const TAU=Math.PI*2;
function text(c,s,x,y,size,color='#f9e7bc'){c.font=`800 ${size}px system-ui,sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);}
export function renderDiceScene(c,g,images,{reduced=false}={}){
 const phase=g.phase==='paused'?g.returnPhase:g.phase;
 c.clearRect(0,0,1000,300);const bg=images.backgrounds[g.stage<2?'forest':'night'];
 c.fillStyle='#2a2437';c.fillRect(0,0,1000,300);
 if(bg?.naturalWidth){const w=1000,h=w/bg.naturalWidth*bg.naturalHeight;c.drawImage(bg,0,(300-h)*.5,w,h);}
 c.fillStyle='#231b37a8';c.fillRect(0,0,1000,300);
 const glow=c.createRadialGradient(500,220,20,500,220,560);glow.addColorStop(0,'#d9b77b22');glow.addColorStop(1,'#1a152caa');c.fillStyle=glow;c.fillRect(0,0,1000,300);
 c.strokeStyle='#ead8a122';c.lineWidth=2;c.beginPath();c.ellipse(500,252,450,36,0,0,TAU);c.stroke();
 c.save();c.translate(HERO.x,HERO.y);drawButterMotion(c,images.butter,{size:HERO.size,time:reduced?0:g.time,action:reduced?null:g.action,gait:{amount:0,phase:0}});c.restore();
 const enemy=ENCOUNTERS[g.stage].enemy,src=STAGE_ART.monsters[enemy],p=g.pending,dying=g.enemyHp===0;
 const key=dying?'die':phase==='resolve'&&p?.applied?'attack':'idle',clip=src.clips[key],img=images.monsters[enemy]?.[key];
 let t=dying?Math.max(0,(p?.clock||0)-(p?.hitAt||0)):key==='attack'?Math.max(0,p.clock-p.hitAt):g.time;
 const frame=reduced?0:Math.min(clip.count-1,Math.floor((clip.loop?(t%clip.duration)/clip.duration:Math.min(1,t/clip.duration))*clip.count)),scale=ENEMY_SCALE[enemy];
 c.save();c.translate(810,228);c.fillStyle='#100d2344';c.beginPath();c.ellipse(0,7,65,11,0,0,TAU);c.fill();
 if(img?.naturalWidth)c.drawImage(img,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);
 else{text(c,enemy==='ghost'?'☁':'♟',0,-25,80,'#c4a5dd');}
 c.restore();
 if(phase==='resolve'&&p){
  const release=butterReleasePoint(g.action?.type||'normal')*(g.action?.duration||.75),f=(p.clock-release)/(p.hitAt-release);
  if(f>=0&&f<1){const x=250+f*535,y=155-Math.sin(f*Math.PI)*55;c.strokeStyle='#f7d38c88';c.lineWidth=6;c.beginPath();c.moveTo(x-35,y+6);c.lineTo(x,y);c.stroke();c.fillStyle='#ffe8ac';c.beginPath();c.arc(x,y,p.result.damage>=200?17:10,0,TAU);c.fill();}
  if(p.applied){const fade=Math.max(0,1-(p.clock-p.hitAt)/.55);c.save();c.globalAlpha=fade;text(c,'−'+p.result.damage,810,73-(1-fade)*30,50,'#ffdea2');c.restore();}
 }
 text(c,'버터',190,277,18);text(c,ENCOUNTERS[g.stage].enemy==='ghost'?'아공간의 이불령':'셰이디의 시험',810,277,18,'#d6c9e4');
 text(c,g.stage===3?'LAST BET':'ROUND 0'+(g.stage+1),500,97,14,'#d9c59b');
 text(c,phase==='resolve'?g.lastResult.name:'한 번 더 굴릴까?',500,145,29);
 text(c,phase==='resolve'?String(g.lastResult.damage)+' DAMAGE':'행운은, 만드는 거야.',500,185,phase==='resolve'?40:16,phase==='resolve'?'#ffdaa0':'#baafc8');
}
