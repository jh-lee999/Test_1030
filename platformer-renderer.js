import {VIEW,FLOOR,HERO_SIZE,STAGES,heroPose,clamp} from './platformer-engine.js?v=44';
import {BIOMES,ROOM_TYPES,ACTS} from './platformer-world.js?v=43';
import {drawButterMotion,selectButterFrame} from './butter-original-motion.js';
import {STAGE_ART} from './platformer-art.js?v=43';
const TAU=Math.PI*2;
function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
function text(ctx,value,x,y,size=16,color='#fff1cd',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);}
function rounded(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function decorate(ctx,d,time,reduced){
  ctx.save();ctx.translate(d.x,d.y);
  if(d.kind==='pillar'){rounded(ctx,-15,-90-d.variant*12,30,100,3,'#777987');ctx.fillStyle='#989ca9';ctx.fillRect(-20,-95-d.variant*12,40,10);ctx.strokeStyle='#4c5268';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-78);ctx.lineTo(4,-50);ctx.lineTo(-6,-38);ctx.stroke();}
  else if(d.kind==='lantern'){ctx.strokeStyle='#9c8660';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-95);ctx.lineTo(28,-95);ctx.stroke();ctx.strokeStyle='#d2b578';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(26,-95);ctx.lineTo(26,-70);ctx.stroke();ellipse(ctx,26,-61,13,18,'#ead997');ellipse(ctx,26,-61,23,28,'#f4e9aa22');}
  else if(d.kind==='mushroom'){for(let i=0;i<2;i++){ctx.fillStyle='#b6a6cb';ctx.fillRect(i*24-4,-25-i*17,7,28+i*17);ellipse(ctx,i*24,-28-i*17,18,9,i?'#bd9fd6':'#8995c5');ellipse(ctx,i*24-5,-31-i*17,3,2,'#f7e5eb');}ellipse(ctx,12,-30,38,43,'#c7b7ee15');}
  else{for(let i=0;i<3;i++){ctx.strokeStyle='#91ae5b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(i*13,0);ctx.lineTo(i*13,-16-i%2*7);ctx.stroke();for(let a=0;a<5;a++)ellipse(ctx,i*13+Math.cos(a*1.25)*4,-18-i%2*7+Math.sin(a*1.25)*4,3,3,d.variant%2?'#eec3a4':'#f3dfa0');}}
  ctx.restore();
}
function roomOverview(ctx,g){
  const x=22,y=653,w=230,h=48;rounded(ctx,x-7,y-10,w+14,h+15,7,'#18251ee6');
  const mapX=v=>x+v/g.room.width*w,mapY=v=>y+(v-280)/380*h;
  for(const p of g.room.platforms){ctx.fillStyle=p.optional?'#b4a7d2':'#b7c99a';ctx.fillRect(mapX(p.x),mapY(p.y),Math.max(2,p.w/g.room.width*w),3);}
  for(const e of g.room.enemies)if(e.hp>0)ellipse(ctx,mapX(e.x),mapY(e.y)-4,2,2,'#ed9a95');
  if(g.room.merchant)ellipse(ctx,mapX(g.room.merchant.x),mapY(g.room.merchant.y)-7,4,4,'#ffd27b');
  ellipse(ctx,mapX(g.room.exit.x),mapY(g.room.exit.y)-4,3,3,'#cfc1ef');ellipse(ctx,mapX(g.player.x),mapY(g.player.y)-4,3,3,'#ffed9d');
}
function monster(ctx,e,images){
  const source=STAGE_ART.monsters[e.type],key=e.hp<=0?'die':e.mode==='attack'?'attack':e.mode==='walk'?'walk':'idle';
  let clip=source.clips[key],image=images.monsters[e.type][key];
  const phase=key==='die'?clamp(e.death/clip.duration,0,1):key==='attack'?clamp(e.timer/(e.type==='ghost'?1.17:e.type==='archer'?.97:.88),0,1):(e.clock/clip.duration)%1;
  let frame=Math.min(clip.count-1,Math.floor(phase*(clip.loop?clip.count:clip.count-1)));
  if(!image?.naturalWidth){clip=source.clips.idle;image=images.monsters[e.type].poster;frame=0;}
  if(e.hp<=0&&e.death>clip.duration)return;
  const scale=source.gameScale?(source.gameScale*e.h/100):e.type==='ghost'?1.65:e.boss?1.1:.75;
  ellipse(ctx,e.x,e.y+2,e.type==='ghost'?62:28,7,'#17231555');
  ctx.save();ctx.translate(e.x,e.y);if(e.facing>0)ctx.scale(-1,1);
  if(e.hp<=0)ctx.globalAlpha=clamp(1-e.death/clip.duration,0,1);
  if(e.flash>0)ctx.filter='brightness(1.8)';
  if(image?.naturalWidth)ctx.drawImage(image,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);
  else{ellipse(ctx,0,-35,25,35,'#ac9cb8');text(ctx,'?',0,-27,24);}
  ctx.restore();
  if(e.hp>0&&['rusher','guard','caster','drone'].includes(e.type)){
    const label={rusher:'도약 돌진',guard:e.mode==='attack'?'방패 빈틈':'정면 방어',caster:'바닥 저주',drone:e.droneState==='aim'?'조준 고정':e.droneState==='recover'?'사격 후 빈틈':'거리 확보'}[e.type];
    rounded(ctx,e.x-35,e.y-e.h-43,70,19,4,'#202b28dd');text(ctx,label,e.x,e.y-e.h-29,10,e.type==='guard'?'#a5e1f3':'#ffd5a7');
    if(e.type==='guard'&&e.mode!=='attack'){ctx.strokeStyle='#a5e1f3';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(e.x+e.facing*34,e.y-72);ctx.lineTo(e.x+e.facing*38,e.y-22);ctx.stroke();}
  }
  if(e.hp>0&&e.burnTime>0){for(let i=0;i<3;i++){const rise=(e.clock*24+i*13)%40;ellipse(ctx,e.x-14+i*14,e.y-15-rise,3,6,'#ffc080bb');}}
  if(e.hp>0&&e.hp<e.maxHp&&e.type!=='ghost'&&!e.boss){rounded(ctx,e.x-24,e.y-e.h-22,48,5,2,'#1c2924bb');rounded(ctx,e.x-24,e.y-e.h-22,48*e.hp/e.maxHp,5,2,'#f3afa1');}
  if(e.mode==='attack'&&e.hp>0){
    const release=e.boss?(e.windup??.95):e.type==='rusher'?.55:e.type==='guard'?.65:e.type==='caster'?1:e.type==='drone'?.7:e.type==='ghost'?.75:e.type==='archer'?.55:.46;
    if(e.timer<release){const amount=e.timer/release;ctx.strokeStyle='#ffbd83';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y-e.h-10,10, -Math.PI/2,-Math.PI/2+TAU*amount);ctx.stroke();text(ctx,'!',e.x,e.y-e.h-5,13,'#ffe3a1');
      if(e.type==='fan'){ctx.fillStyle='#fa895343';ctx.fillRect(e.facing>0?e.x:e.x-95,e.y-5,95,5);}
      if(e.type==='rusher'){ctx.save();ctx.setLineDash([6,6]);ctx.strokeStyle='#ffbf83';ctx.beginPath();ctx.moveTo(e.x,e.y-12);ctx.quadraticCurveTo(e.x+e.facing*140,e.y-150,e.x+e.facing*280,e.y);ctx.stroke();ctx.restore();}
      if(e.type==='drone'&&e.aimAngle!==undefined){ctx.save();ctx.setLineDash([5,7]);ctx.strokeStyle='#ffacb688';ctx.beginPath();ctx.moveTo(e.x,e.y-e.h*.55);ctx.lineTo(e.x+Math.cos(e.aimAngle)*360,e.y-e.h*.55+Math.sin(e.aimAngle)*360);ctx.stroke();ctx.restore();}
    }
  }
}
function merchant(ctx,g,images){
  const m=g.room.merchant;if(!m)return;
  const open=g.room.cleared&&g.room.rewardTaken,near=g.player.grounded&&Math.abs(g.player.x-m.x)<=100&&Math.abs(g.player.y-m.y)<=40;
  // Friendly reuse of an intact fan Idle clip, not a newly sourced NPC rig.
  monster(ctx,{type:'fan',x:m.x-38,y:m.y-24,hp:1,maxHp:1,h:94,facing:g.player.x>=m.x?1:-1,clock:g.time,mode:'idle',flash:0},images);
  ctx.save();ctx.translate(m.x,m.y);
  for(const x of [-64,64])rounded(ctx,x-3,-139,6,139,2,'#765a40');
  rounded(ctx,-76,-148,152,26,7,'#dcc38c');
  for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#8b9c6a':'#efdbac';ctx.fillRect(-72+i*24,-144,24,28);}
  rounded(ctx,-64,-42,128,42,5,'#866a45');rounded(ctx,-69,-48,138,10,3,'#d6b782');
  rounded(ctx,20,-66,24,17,4,'#e8c597');text(ctx,'✦',32,-52,13,'#7a5938');
  text(ctx,'주머니 상인',0,-166,15,'#ffdfa1');
  text(ctx,open?(near?'F / B · 거래하기':'상품 · 회복 · 계약'):'전투 보상 선택 후 개점',0,-190,13,open?'#ffedb4':'#c1c7b0');
  if(open&&near){rounded(ctx,-30,-34,60,25,5,'#493c2c');text(ctx,'상점',0,-16,13,'#ffe1a3');}
  ctx.restore();
}
export function renderGame(ctx,g,images,{started=true,reducedMotion=false}={}){
  const W=VIEW.width,H=VIEW.height,room=g.room,p=g.player,time=g.time,theme=BIOMES[room.biome]||BIOMES.grove;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#344b2b';ctx.fillRect(0,0,W,H);
  const bg=images.backgrounds[room.background];
  if(bg?.naturalWidth){const bw=W+(room.width-W)*.22,bh=bw*bg.naturalHeight/bg.naturalWidth;ctx.drawImage(bg,-g.camera*.22,FLOOR-bh*.83-g.cameraY*.12,bw,bh);}
  ctx.fillStyle=theme.fog+'36';ctx.fillRect(0,0,W,H);
  const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#13291d77');shade.addColorStop(.4,'#1d33100a');shade.addColorStop(1,'#101b1477');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  // Far fireflies remain decorative, not collision geometry.
  for(let i=0;i<22;i++){const x=((i*173-g.camera*.12)%W+W)%W,y=150+(i*97)%380;ellipse(ctx,x,y+(reducedMotion?0:Math.sin(time+i)*9),1.8,1.8,`rgba(255,239,157,${.25+Math.sin(time*.6+i)*.15})`);}
  ctx.save();if(!reducedMotion&&g.shake>0)ctx.translate(Math.sin(time*119)*g.shake*17,Math.cos(time*93)*g.shake*10);ctx.translate(-g.camera,-g.cameraY);
  if(room.act===1)for(let i=0;i<7;i++){const x=i*470;rounded(ctx,x,170,54,600,8,'#262f44aa');ctx.strokeStyle='#89b6d433';ctx.lineWidth=8;ctx.beginPath();ctx.arc(x+235,270,210,Math.PI,0);ctx.stroke();}
  if(room.act===2)for(let i=0;i<8;i++){const x=i*410+150,y=230+(i%3)*60;ellipse(ctx,x,y,95,125,'#33204477');ctx.strokeStyle='#d3a2f433';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,90,120,0,0,TAU);ctx.stroke();text(ctx,'✦',x,y+10,35,'#ddb6e955');}
  const main=room.platforms.filter(p=>!p.optional).sort((a,b)=>a.x-b.x);let covered=main[0];
  for(const next of main.slice(1)){if(next.x>covered.x+covered.w){const start=covered.x+covered.w,top=Math.min(covered.y,next.y)+8,fade=ctx.createLinearGradient(0,top,0,top+160);fade.addColorStop(0,theme.fog+'88');fade.addColorStop(1,'#131f29');ctx.fillStyle=fade;ctx.fillRect(start,top,next.x-start,H-top+300);}if(next.x+next.w>covered.x+covered.w)covered=next;}
  for(const d of room.decorations||[])if(d.x>g.camera-100&&d.x<g.camera+W+100)decorate(ctx,d,time,reducedMotion);
  for(const platform of room.platforms){
    if(platform.x+platform.w<g.camera-30||platform.x>g.camera+W+30)continue;
    const depth=platform.ground?H-platform.y+150:32;
    rounded(ctx,platform.x,platform.y+5,platform.w,depth,platform.ground?0:theme.material==='stone'?3:10,theme.body);
    ctx.fillStyle=theme.grain;ctx.fillRect(platform.x+5,platform.y+12,platform.w-10,6);
    ctx.strokeStyle='#352e2160';ctx.lineWidth=2;
    for(let x=platform.x+13;x<platform.x+platform.w;x+=47){ctx.beginPath();ctx.moveTo(x,platform.y+22);ctx.lineTo(x+24,platform.y+26);ctx.stroke();}
    rounded(ctx,platform.x-3,platform.y-3,platform.w+6,12,5,theme.edge);rounded(ctx,platform.x-3,platform.y-4,platform.w+6,7,4,theme.top);
    for(let x=platform.x+9;x<platform.x+platform.w;x+=25){ctx.strokeStyle=theme.top;ctx.beginPath();ctx.moveTo(x,platform.y);ctx.lineTo(x-3,platform.y-6-(Math.floor(x)%7));if(theme.material!=='stone')ctx.lineTo(x+3,platform.y-2);ctx.stroke();}
    if(!platform.ground&&theme.material==='wood'){for(const x of [platform.x+24,platform.x+platform.w-28]){ctx.strokeStyle=theme.edge;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,platform.y+28);ctx.bezierCurveTo(x-8,platform.y+37,x+10,platform.y+48,x+2,platform.y+60);ctx.stroke();ellipse(ctx,x+4,platform.y+45,7,3,theme.top);}}
  }
  for(const item of room.pickups)if(!item.taken){const y=item.y+(reducedMotion?0:Math.sin(time*3+item.x)*3);ellipse(ctx,item.x,item.y+23,12,3,'#12251d44');if(item.kind==='coin'){ellipse(ctx,item.x,y,9,12,'#f6d680');ellipse(ctx,item.x,y,6,8,'#b79347');text(ctx,'✦',item.x,y+5,15,'#fff4b4');}else{text(ctx,'♥',item.x,y+8,28,'#f6b1a8');}}
  const exit=room.exit,open=room.cleared&&room.rewardTaken;
  for(const m of room.marks||[]){const t=clamp(m.time/m.delay,0,1);ellipse(ctx,m.x,m.y-2,m.r,10,'#d6a2ee44');ctx.strokeStyle='#edb7ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y-2,m.r*t,10*t,0,0,TAU);ctx.stroke();text(ctx,'저주!',m.x,m.y-26,13,'#f3d1ff');}
  for(const h of room.hazards||[]){
    const phase=(h.clock+h.offset)%h.period,warning=phase>=h.period-1.3,active=phase>=h.period-.4;
    rounded(ctx,h.x-h.w/2,h.y-5,h.w,6,3,room.cleared?'#9d91a144':active?'#f7b1ef':warning?'#f1b96baa':'#9f8ac855');
    if(!room.cleared&&warning){rounded(ctx,h.x-h.w/2,h.y-65,h.w,60,4,active?'#e8a4ee88':'#ecc17f25');text(ctx,active?'✦':'!',h.x,h.y-30,20,active?'#fff1fc':'#ffda95');}
  }
  merchant(ctx,g,images);
  if(room.shrine){const s=room.shrine;ctx.save();ctx.translate(s.x,s.y);if(s.kind==='treasure'){rounded(ctx,-28,-34,56,34,5,s.used?'#786d4b':'#c7a65d');rounded(ctx,-28,-43,56,17,6,'#e3c57e');ctx.fillStyle='#75572e';ctx.fillRect(-4,-28,8,10);}else{ellipse(ctx,0,-10,36,12,'#a4b68a');ellipse(ctx,0,-12,26,7,s.used?'#849d85':'#bce5bf');text(ctx,'♥',0,-30,28,'#c7e9b8');}if(!s.used)text(ctx,`F / ↓ ${s.kind==='rest'?'40% 회복':'보물 열기'}`,0,-65,14);else text(ctx,'이용 완료',0,-60,12,'#c0c7a5');ctx.restore();}
  ctx.save();ctx.translate(exit.x,exit.y);ctx.fillStyle='#263d30';ctx.beginPath();ctx.roundRect(-44,-148,88,148,[44,44,2,2]);ctx.fill();ctx.lineWidth=7;ctx.strokeStyle=open?'#e5d891':'#6e8667';ctx.stroke();
  if(open){const aura=ctx.createRadialGradient(0,-75,5,0,-75,90);aura.addColorStop(0,'#fff6b1bb');aura.addColorStop(1,'#b3e19000');ctx.fillStyle=aura;ctx.fillRect(-85,-165,170,170);text(ctx,'F / ↓',0,-65,16);text(ctx,room.index===STAGES-1?'탈출':room.type==='boss'?'다음 지역':'경로 선택',0,-40,13);}
  else{text(ctx,'봉인',0,-65,16,'#a9bb99');text(ctx,room.shrine?'쉼터 / 보물 이용':'적을 모두 처치',0,-40,11,'#a9bb99');}ctx.restore();
  for(const e of room.enemies)if(e.x>g.camera-220&&e.x<g.camera+W+220)monster(ctx,e,images);
  for(const b of g.boulders){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.shadowColor='#ffdf92';ctx.shadowBlur=18;ctx.fillStyle='#9c8060';ctx.strokeStyle='#493e31';ctx.lineWidth=5;ctx.beginPath();for(let i=0;i<9;i++){const angle=i/9*TAU,r=b.r*(.94+.08*Math.sin(i*8));if(!i)ctx.moveTo(Math.cos(angle)*r,Math.sin(angle)*r);else ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#c2a77d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-b.r*.5,-b.r*.4);ctx.lineTo(b.r*.05,-b.r*.65);ctx.lineTo(b.r*.5,-b.r*.2);ctx.stroke();ctx.restore();}
  const ground=room.platforms.filter(q=>p.x>=q.x&&p.x<=q.x+q.w&&q.y>=p.y).sort((a,b)=>a.y-b.y)[0];
  if(ground){const scale=clamp(1-(ground.y-p.y)/500,.3,1);ellipse(ctx,p.x,ground.y+2,29*scale,6*scale,'#1c281b55');}
  if(p.skillTime>0){ctx.strokeStyle='#ffeab599';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-50,55,64,0,0,TAU);ctx.stroke();}
  if(p.shield>0){ctx.strokeStyle='#b3eafa99';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-42,43,54,0,0,TAU);ctx.stroke();}
  const pose=heroPose(p);ctx.save();ctx.translate(p.x,p.y-HERO_SIZE*.28);if(p.facing>0)ctx.scale(-1,1);
  if(p.invulnerable>0&&Math.floor(time*14)%2===0)ctx.globalAlpha=.45;
  if(p.dash>0){ctx.save();ctx.globalAlpha=.2;ctx.translate(p.facing>0?40:-40,0);drawButterMotion(ctx,images.butter,pose);ctx.restore();}
  if(!drawButterMotion(ctx,images.butter,pose)){ellipse(ctx,0,-25,23,36,'#ecd18e');text(ctx,'버터',0,-20,13,'#52422c');}ctx.restore();
  for(const b of g.projectiles){const angle=Math.atan2(b.vy,b.vx);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);ctx.strokeStyle=b.owner==='enemy'?'#c6a4e9aa':b.homing?'#b7edffbb':'#ffe8a6bb';ctx.lineWidth=b.r;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-b.r*3,0);ctx.lineTo(0,0);ctx.stroke();ellipse(ctx,0,0,b.r,b.r,b.owner==='enemy'?'#dabcf6':b.homing?'#e1faff':'#b29b78');ellipse(ctx,-2,-2,b.r*.4,b.r*.4,'#fff5da');ctx.restore();}
  for(const e of g.effects){const f=e.time/e.duration;ctx.save();ctx.globalAlpha=1-f;ctx.translate(e.x,e.y);
    if(e.type==='text')text(ctx,e.text,0,-f*35,20,e.color);
    else if(e.type==='hit'||e.type==='burst'){ctx.strokeStyle=e.color||'#fff1c2';ctx.lineWidth=3;const count=e.type==='burst'?12:6;for(let i=0;i<count;i++){const a=i/count*TAU,r=(e.type==='burst'?65:28)*f;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.4,Math.sin(a)*r*.4);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}}
    else if(e.type==='jump'||e.type==='land'){ctx.strokeStyle='#efedc0';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,15+f*30,5+f*4,0,0,TAU);ctx.stroke();}
    else if(e.type==='chain'){ctx.strokeStyle='#b1e6fa';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,10+f*34,0,TAU);ctx.stroke();}
    else if(e.type==='shot'){ellipse(ctx,e.dir*5,0,12*(1-f),5*(1-f),e.color);}
    else if(e.type==='slash'){ctx.strokeStyle='#f8ccae';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,35,-1,1);ctx.stroke();}
    else if(e.type==='dash'){ctx.strokeStyle='#ffefbb';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-e.dir*f*70,-15+i*10);ctx.lineTo(-e.dir*(f*70+35),-15+i*10);ctx.stroke();}}ctx.restore();
  }
  ctx.restore();
  if(started&&g.roomIntro>0){ctx.save();ctx.globalAlpha=clamp(g.roomIntro,0,1);text(ctx,`${room.act+1}막 · ${room.local+1}/7  /  ${room.encounter?.hint||ACTS[room.act].rule}`,W/2,190,13,'#ffedb4');text(ctx,room.title,W/2,227,30);ctx.restore();}
  if(started&&room.type==='boss'){const boss=room.enemies[0];if(boss.hp>0){text(ctx,ACTS[room.act].boss+(boss.hp<boss.maxHp*.5?' · 격노':''),W/2,132,13);rounded(ctx,W/2-190,143,380,8,4,'#202123bb');rounded(ctx,W/2-190,143,380*boss.hp/boss.maxHp,8,4,'#c99ada');}}
  if(started&&g.room.cleared&&p.x<exit.x-250)text(ctx,'출구 →',W-90,H-85,15,'#ffedb4');
  if(started)roomOverview(ctx,g);
  ctx.canvas.dataset.butterFrame=`${selectButterFrame(pose).key}/${selectButterFrame(pose).index}`;
}
