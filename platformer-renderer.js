import {VIEW,FLOOR,HERO_SIZE,heroPose,clamp} from './platformer-engine.js';
import {drawButterMotion,selectButterFrame} from './butter-original-motion.js';
import {STAGE_ART} from './assets/trickcal-stage37/atlas.js';
const TAU=Math.PI*2;
function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
function text(ctx,value,x,y,size=16,color='#fff1cd',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);}
function rounded(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function monster(ctx,e,images){
  const source=STAGE_ART.monsters[e.type],key=e.hp<=0?'die':e.mode==='attack'?'attack':e.mode==='walk'?'walk':'idle';
  let clip=source.clips[key],image=images.monsters[e.type][key];
  const phase=key==='die'?clamp(e.death/clip.duration,0,1):key==='attack'?clamp(e.timer/(e.type==='ghost'?1.17:e.type==='archer'?.97:.88),0,1):(e.clock/clip.duration)%1;
  let frame=Math.min(clip.count-1,Math.floor(phase*(clip.loop?clip.count:clip.count-1)));
  if(!image?.naturalWidth){clip=source.clips.idle;image=images.monsters[e.type].poster;frame=0;}
  if(e.hp<=0&&e.death>clip.duration)return;
  const scale=e.type==='ghost'?1.65:.75;
  ellipse(ctx,e.x,e.y+2,e.type==='ghost'?62:28,7,'#17231555');
  ctx.save();ctx.translate(e.x,e.y);if(e.facing>0)ctx.scale(-1,1);
  if(e.hp<=0)ctx.globalAlpha=clamp(1-e.death/clip.duration,0,1);
  if(e.flash>0)ctx.filter='brightness(1.8)';
  if(image?.naturalWidth)ctx.drawImage(image,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);
  else{ellipse(ctx,0,-35,25,35,'#ac9cb8');text(ctx,'?',0,-27,24);}
  ctx.restore();
  if(e.hp>0&&e.hp<e.maxHp&&e.type!=='ghost'){rounded(ctx,e.x-24,e.y-e.h-22,48,5,2,'#1c2924bb');rounded(ctx,e.x-24,e.y-e.h-22,48*e.hp/e.maxHp,5,2,'#f3afa1');}
  if(e.mode==='attack'&&e.hp>0){
    const release=e.type==='ghost'?.75:e.type==='archer'?.55:.46;
    if(e.timer<release){const amount=e.timer/release;ctx.strokeStyle='#ffbd83';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y-e.h-10,10, -Math.PI/2,-Math.PI/2+TAU*amount);ctx.stroke();text(ctx,'!',e.x,e.y-e.h-5,13,'#ffe3a1');
      if(e.type==='fan'){ctx.fillStyle='#fa895343';ctx.fillRect(e.facing>0?e.x:e.x-95,e.y-5,95,5);}
    }
  }
}
export function renderGame(ctx,g,images,{started=true,reducedMotion=false}={}){
  const W=VIEW.width,H=VIEW.height,room=g.room,p=g.player,time=g.time;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#344b2b';ctx.fillRect(0,0,W,H);
  const bg=images.backgrounds[room.background];
  if(bg?.naturalWidth){const bw=W+(room.width-W)*.22,bh=bw*bg.naturalHeight/bg.naturalWidth;ctx.drawImage(bg,-g.camera*.22,FLOOR-bh*.83,bw,bh);}
  const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#13291d77');shade.addColorStop(.4,'#1d33100a');shade.addColorStop(1,'#101b1477');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  // Far fireflies remain decorative, not collision geometry.
  for(let i=0;i<22;i++){const x=((i*173-g.camera*.12)%W+W)%W,y=150+(i*97)%380;ellipse(ctx,x,y+(reducedMotion?0:Math.sin(time+i)*9),1.8,1.8,`rgba(255,239,157,${.25+Math.sin(time*.6+i)*.15})`);}
  ctx.save();if(!reducedMotion&&g.shake>0)ctx.translate(Math.sin(time*119)*g.shake*17,Math.cos(time*93)*g.shake*10);ctx.translate(-g.camera,0);
  for(const platform of room.platforms){
    if(platform.x+platform.w<g.camera-30||platform.x>g.camera+W+30)continue;
    const depth=platform.ground?H-FLOOR+40:32;
    rounded(ctx,platform.x,platform.y+5,platform.w,depth,platform.ground?0:10,'#513d2b');
    ctx.fillStyle='#6b5135';ctx.fillRect(platform.x+5,platform.y+12,platform.w-10,6);
    ctx.strokeStyle='#352e2160';ctx.lineWidth=2;
    for(let x=platform.x+13;x<platform.x+platform.w;x+=47){ctx.beginPath();ctx.moveTo(x,platform.y+22);ctx.lineTo(x+24,platform.y+26);ctx.stroke();}
    rounded(ctx,platform.x-3,platform.y-3,platform.w+6,12,5,'#34442b');rounded(ctx,platform.x-3,platform.y-4,platform.w+6,7,4,'#9dba59');
    for(let x=platform.x+9;x<platform.x+platform.w;x+=25){ctx.strokeStyle=x%3?'#b4c86f':'#6d9845';ctx.beginPath();ctx.moveTo(x,platform.y);ctx.lineTo(x-3,platform.y-6-(Math.floor(x)%7));ctx.lineTo(x+3,platform.y-2);ctx.stroke();}
    if(!platform.ground){for(const x of [platform.x+24,platform.x+platform.w-28]){ctx.strokeStyle='#6d894c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,platform.y+28);ctx.bezierCurveTo(x-8,platform.y+37,x+10,platform.y+48,x+2,platform.y+60);ctx.stroke();ellipse(ctx,x+4,platform.y+45,7,3,'#869f4e');}}
  }
  for(const item of room.pickups)if(!item.taken){const y=item.y+(reducedMotion?0:Math.sin(time*3+item.x)*3);ellipse(ctx,item.x,item.y+23,12,3,'#12251d44');if(item.kind==='coin'){ellipse(ctx,item.x,y,9,12,'#f6d680');ellipse(ctx,item.x,y,6,8,'#b79347');text(ctx,'✦',item.x,y+5,15,'#fff4b4');}else{text(ctx,'♥',item.x,y+8,28,'#f6b1a8');}}
  const exit=room.exit,open=room.cleared&&room.rewardTaken;
  ctx.save();ctx.translate(exit.x,exit.y);ctx.fillStyle='#263d30';ctx.beginPath();ctx.roundRect(-44,-148,88,148,[44,44,2,2]);ctx.fill();ctx.lineWidth=7;ctx.strokeStyle=open?'#e5d891':'#6e8667';ctx.stroke();
  if(open){const aura=ctx.createRadialGradient(0,-75,5,0,-75,90);aura.addColorStop(0,'#fff6b1bb');aura.addColorStop(1,'#b3e19000');ctx.fillStyle=aura;ctx.fillRect(-85,-165,170,170);text(ctx,'F / ↓',0,-65,16);text(ctx,room.index===3?'탈출':'다음 구역',0,-40,13);}
  else{text(ctx,'봉인',0,-65,16,'#a9bb99');text(ctx,'적을 모두 처치',0,-40,11,'#a9bb99');}ctx.restore();
  for(const e of room.enemies)if(e.x>g.camera-220&&e.x<g.camera+W+220)monster(ctx,e,images);
  for(const b of g.boulders){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.shadowColor='#ffdf92';ctx.shadowBlur=18;ctx.fillStyle='#9c8060';ctx.strokeStyle='#493e31';ctx.lineWidth=5;ctx.beginPath();for(let i=0;i<9;i++){const angle=i/9*TAU,r=b.r*(.94+.08*Math.sin(i*8));if(!i)ctx.moveTo(Math.cos(angle)*r,Math.sin(angle)*r);else ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#c2a77d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-b.r*.5,-b.r*.4);ctx.lineTo(b.r*.05,-b.r*.65);ctx.lineTo(b.r*.5,-b.r*.2);ctx.stroke();ctx.restore();}
  const ground=room.platforms.filter(q=>p.x>=q.x&&p.x<=q.x+q.w&&q.y>=p.y).sort((a,b)=>a.y-b.y)[0];
  if(ground){const scale=clamp(1-(ground.y-p.y)/500,.3,1);ellipse(ctx,p.x,ground.y+2,29*scale,6*scale,'#1c281b55');}
  if(p.skillTime>0){ctx.strokeStyle='#ffeab599';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-50,55,64,0,0,TAU);ctx.stroke();}
  const pose=heroPose(p);ctx.save();ctx.translate(p.x,p.y-HERO_SIZE*.28);if(p.facing>0)ctx.scale(-1,1);
  if(p.invulnerable>0&&Math.floor(time*14)%2===0)ctx.globalAlpha=.45;
  if(p.dash>0){ctx.save();ctx.globalAlpha=.2;ctx.translate(p.facing>0?40:-40,0);drawButterMotion(ctx,images.butter,pose);ctx.restore();}
  if(!drawButterMotion(ctx,images.butter,pose)){ellipse(ctx,0,-25,23,36,'#ecd18e');text(ctx,'버터',0,-20,13,'#52422c');}ctx.restore();
  for(const b of g.projectiles){const angle=Math.atan2(b.vy,b.vx);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);ctx.strokeStyle=b.owner==='enemy'?'#c6a4e9aa':b.homing?'#b7edffbb':'#ffe8a6bb';ctx.lineWidth=b.r;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-b.r*3,0);ctx.lineTo(0,0);ctx.stroke();ellipse(ctx,0,0,b.r,b.r,b.owner==='enemy'?'#dabcf6':b.homing?'#e1faff':'#b29b78');ellipse(ctx,-2,-2,b.r*.4,b.r*.4,'#fff5da');ctx.restore();}
  for(const e of g.effects){const f=e.time/e.duration;ctx.save();ctx.globalAlpha=1-f;ctx.translate(e.x,e.y);
    if(e.type==='text')text(ctx,e.text,0,-f*35,20,e.color);
    else if(e.type==='hit'||e.type==='burst'){ctx.strokeStyle=e.color||'#fff1c2';ctx.lineWidth=3;const count=e.type==='burst'?12:6;for(let i=0;i<count;i++){const a=i/count*TAU,r=(e.type==='burst'?65:28)*f;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.4,Math.sin(a)*r*.4);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}}
    else if(e.type==='jump'||e.type==='land'){ctx.strokeStyle='#efedc0';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,15+f*30,5+f*4,0,0,TAU);ctx.stroke();}
    else if(e.type==='shot'){ellipse(ctx,e.dir*5,0,12*(1-f),5*(1-f),e.color);}
    else if(e.type==='slash'){ctx.strokeStyle='#f8ccae';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,35,-1,1);ctx.stroke();}
    else if(e.type==='dash'){ctx.strokeStyle='#ffefbb';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-e.dir*f*70,-15+i*10);ctx.lineTo(-e.dir*(f*70+35),-15+i*10);ctx.stroke();}}ctx.restore();
  }
  ctx.restore();
  if(started&&g.roomIntro>0){ctx.save();ctx.globalAlpha=clamp(g.roomIntro,0,1);text(ctx,`0${room.index+1}  /  아공간`,W/2,190,13,'#ffedb4');text(ctx,room.title,W/2,227,30);ctx.restore();}
  if(started&&room.index===3){const boss=room.enemies[0];if(boss.hp>0){text(ctx,'아공간을 지키는 이불령',W/2,132,13);rounded(ctx,W/2-190,143,380,8,4,'#202123bb');rounded(ctx,W/2-190,143,380*boss.hp/boss.maxHp,8,4,'#c99ada');}}
  if(started&&g.room.cleared&&p.x<exit.x-250)text(ctx,'출구 →',W-90,H-85,15,'#ffedb4');
  ctx.canvas.dataset.butterFrame=`${selectButterFrame(pose).key}/${selectButterFrame(pose).index}`;
}
