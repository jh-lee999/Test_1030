import {BOARD,FOES,preview,hasFusion} from './bonk-engine.js?v=48';
import {STAGE_ART} from './platformer-art.js?v=43';
import {drawButterMotion} from './butter-original-motion.js';
const TAU=Math.PI*2;
export const HERO_PRESENTATION={x:150,y:875,size:78};
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function box(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,value,x,y,size=16,color='#f8ebc8',align='center'){c.fillStyle=color;c.font=`700 ${size}px system-ui,sans-serif`;c.textAlign=align;c.fillText(value,x,y);}
function enemy(c,g,e,images){
  const src=STAGE_ART.monsters[e.type],key=e.dead?'die':g.phase==='enemy'?(e.type==='archer'&&g.turn%2===0||e.type==='ghost'?'attack':'walk'):'idle',clip=src.clips[key],img=images.monsters[e.type]?.[key];
  if(e.dead&&e.death>clip.duration)return;
  const t=e.dead?e.death:g.phase==='enemy'?g.enemyClock:e.anim,frame=Math.min(clip.count-1,Math.floor((clip.loop?(t%clip.duration)/clip.duration:Math.min(1,t/clip.duration))*clip.count));
  const size=e.type==='ghost'?128:84,scale=src.gameScale?src.gameScale*size/100:e.type==='ghost'?1.15:size/130;
  c.save();c.translate(e.x,e.y+28);if(e.dead)c.globalAlpha=Math.max(0,1-e.death/clip.duration);
  c.fillStyle='#0b1d1744';c.beginPath();c.ellipse(0,5,e.r,7,0,0,TAU);c.fill();
  if(img?.naturalWidth){if(e.flash)c.filter='brightness(1.5)';c.drawImage(img,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);c.filter='none';}
  else{circle(c,0,-23,e.r,e.type==='guard'?'#acb4d3':'#b99dbb');text(c,FOES[e.type].name,0,-18,13);}
  c.restore();if(e.dead)return;
  if(e.mark){c.strokeStyle='#f4afd2';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,e.r+9,0,TAU);c.stroke();text(c,'◎',e.x+e.r+7,e.y-23,21,'#ffd3e7');}
  box(c,e.x-24,e.y+34,48,23,10,'#152a24ee');text(c,Math.ceil(e.hp),e.x,e.y+51,16);
  const intent=e.type==='archer'?(g.turn%2===0?'✧ 사격 −5':'다음 턴 사격'):e.type==='ghost'?(g.turn%2===0?'✧ 탄막 + 소환':'↓ 전진'):e.type==='guard'?(g.turn%2===1?'◈ 정면 방어':'방패 빈틈'):'↓ 76 전진';
  box(c,e.x-53,e.y-size*.6-26,106,21,6,'#172c26d9');text(c,intent,e.x,e.y-size*.6-11,11,e.type==='archer'&&g.turn%2===0?'#ffbdab':'#d3dec0');
  if(e.type==='ghost'){box(c,192,71,416,8,4,'#192a27');box(c,192,71,416*e.hp/e.maxHp,8,4,'#dda7db');}
}
export function renderGame(c,g,images,{reduced=false}={}){
  c.clearRect(0,0,BOARD.w,BOARD.h);const bg=images.backgrounds[g.stage<2?'forest':'night'];
  c.fillStyle='#20392e';c.fillRect(0,0,800,960);
  if(bg?.naturalWidth){const h=960,w=h*bg.naturalWidth/bg.naturalHeight;c.drawImage(bg,(800-w)/2,0,w,h);}
  c.fillStyle='#102e29bb';c.fillRect(0,0,800,960);
  const shade=c.createLinearGradient(0,0,0,960);shade.addColorStop(0,'#13251e77');shade.addColorStop(.5,'#22463755');shade.addColorStop(1,'#10261ef5');c.fillStyle=shade;c.fillRect(0,0,800,960);
  box(c,32,96,736,784,26,'#122c2440');c.strokeStyle='#b2c99766';c.lineWidth=3;c.beginPath();c.roundRect(BOARD.left,BOARD.top,BOARD.right-BOARD.left,BOARD.bottom-BOARD.top,18);c.stroke();
  for(let x=BOARD.left+35;x<BOARD.right;x+=50)for(let y=150;y<760;y+=50)circle(c,x,y,1.5,'#c2dba322');
  text(c,['숲의 첫 장난','방패 뒤의 사수','별빛이 뒤엉킨 길','이불령의 마지막 문'][g.stage],400,42,23);
  text(c,g.stage===3?'수호자를 쓰러뜨리면 아공간 탈출':'벽과 범퍼를 경유하면 방패의 방어도 뚫어요',400,g.stage===3?95:70,12,'#c1d0af');
  c.save();c.setLineDash([8,8]);c.strokeStyle='#eda49366';c.lineWidth=2;c.beginPath();c.moveTo(64,BOARD.danger);c.lineTo(736,BOARD.danger);c.stroke();c.restore();text(c,'이 선에 닿은 적은 직접 공격해요',400,BOARD.danger+22,12,'#e1b0a0');
  for(const p of g.pegs){circle(c,p.x,p.y,p.r+9,'#a3d8bc14');circle(c,p.x,p.y,p.r+2,'#274f3b');circle(c,p.x,p.y,p.r,p.flash?'#efffca':'#94c9a0');circle(c,p.x-4,p.y-5,5,'#d7e9a9');circle(c,p.x,p.y,6,'#4c7956');text(c,'✦',p.x,p.y+5,13,'#d7edbc');}
  if(g.phase==='aim'){
    const points=preview(g);c.save();c.setLineDash([6,9]);c.lineWidth=2;c.strokeStyle=g.useKing?'#ffdb8b':'#e9ddb7b0';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();
    c.strokeStyle='#f0e4b9';c.lineWidth=1.5;c.beginPath();c.arc(g.aim.x,g.aim.y,12,0,TAU);c.moveTo(g.aim.x-19,g.aim.y);c.lineTo(g.aim.x+19,g.aim.y);c.moveTo(g.aim.x,g.aim.y-19);c.lineTo(g.aim.x,g.aim.y+19);c.stroke();
  }
  for(const e of g.enemies)enemy(c,g,e,images);
  for(const b of g.balls){
    const color=b.king?'#f6cc89':b.low?'#aff2ff':b.child?'#ffcd98':'#f8e9c2';
    c.strokeStyle=color+(b.king?'aa':'77');c.lineWidth=b.king?b.r*.8:b.r;c.lineCap='round';c.beginPath();b.trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
    circle(c,b.x,b.y,b.r+3,'#10271e55');circle(c,b.x,b.y,b.r,b.king?'#b3936f':color);circle(c,b.x-b.r*.25,b.y-b.r*.25,b.r*.3,b.king?'#dfc18c':'#fffdf0');
    if(b.king){c.strokeStyle='#f8d992';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,b.r+3,g.time*3,g.time*3+TAU*.7);c.stroke();}
    if(b.child&&hasFusion(g,'fireworks'))text(c,'✦',b.x,b.y+5,16,'#ffe6ac');
  }
  for(const e of g.effects){const f=e.time/e.life;c.save();c.globalAlpha=1-f;c.translate(e.x,e.y);
    if(e.type==='text')text(c,e.text,0,-f*36,22,e.color);
    else if(e.type==='beam'){c.strokeStyle=e.color;c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(400-e.x,850-e.y);c.stroke();}
    else if(e.type==='blast'){circle(c,0,0,e.r*f,(e.color||'#f4c88b')+'25');c.strokeStyle=e.color;c.lineWidth=3;c.beginPath();c.arc(0,0,e.r*f,0,TAU);c.stroke();}
    else{const n=e.type==='burst'?10:5;for(let i=0;i<n;i++){const a=i/n*TAU,r=(e.type==='burst'?48:24)*f;c.strokeStyle=e.color||'#fbdeb0';c.lineWidth=2;c.beginPath();c.moveTo(Math.cos(a)*r*.3,Math.sin(a)*r*.3);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke();}}
    c.restore();}
  // The original single-view character is intact. The table launcher, not a fake
  // rear-view weapon/rig, shows the actual aiming direction.
  box(c,240,900,500,44,14,'#152d25d9');text(c,g.phase==='flight'?`${g.combo} HIT · ${Math.ceil(g.turnDamage)} 피해`:g.phase==='enemy'?'적의 반격':g.phase==='aim'?'조준 후 클릭 · Space로도 발사':'',490,928,18);
  c.save();c.translate(HERO_PRESENTATION.x,HERO_PRESENTATION.y);drawButterMotion(c,images.butter,{size:HERO_PRESENTATION.size,time:g.time,action:g.action,gait:{amount:0,phase:0,clock:g.time}});c.restore();
  const l={x:g.launchX,y:BOARD.launch.y};c.save();c.translate(l.x,l.y);const a=Math.atan2(g.aim.y-l.y,g.aim.x-l.x)+Math.PI/2;c.rotate(a);c.strokeStyle='#e7c57f';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(0,29);c.lineTo(0,3);c.moveTo(-22,-14);c.lineTo(0,5);c.lineTo(22,-14);c.stroke();c.strokeStyle='#f6deba';c.lineWidth=2;c.beginPath();c.moveTo(-22,-14);c.lineTo(0,14);c.lineTo(22,-14);c.stroke();circle(c,0,10,g.useKing?13:7,g.useKing?'#efcc8d':'#faf0cb');c.restore();
  if(g.phase==='flight'&&g.returnSet){c.strokeStyle='#e0e8c6';c.lineWidth=2;c.beginPath();c.arc(g.returnX,BOARD.launch.y,12,0,TAU);c.stroke();text(c,'다음 발사',g.returnX,BOARD.launch.y-22,10,'#c9d7b1');}
  if(!reduced&&g.phase==='flight'&&g.combo>3)text(c,g.combo+' 연쇄',680,850,24,g.combo>10?'#ffce89':'#dce9b6');
  if(g.unlockMessage&&g.unlockUntil>g.time){box(c,160,90,480,39,14,'#6a6235ee');text(c,'✦ '+g.unlockMessage,400,116,21,'#ffe4a4');}
}
