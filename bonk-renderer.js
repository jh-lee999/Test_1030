import {BOARD,FOES,preview,hasFusion} from './bonk-engine.js?v=48';
import {STAGE_ART} from './platformer-art.js?v=43';
import {drawButterMotion} from './butter-original-motion.js';
import {enemyIntent} from './bonk-ui.js?v=49';
const TAU=Math.PI*2;
export const HERO_PRESENTATION={x:150,y:875,size:78};
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function box(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,value,x,y,size=16,color='#f8ebc8',align='center'){c.fillStyle=color;c.font=`700 ${size}px system-ui,sans-serif`;c.textAlign=align;c.fillText(value,x,y);}
function enemy(c,g,e,images,selected=false){
  const src=STAGE_ART.monsters[e.type],key=e.dead?'die':g.phase==='enemy'?(e.type==='archer'&&g.turn%2===0||e.type==='ghost'?'attack':'walk'):'idle',clip=src.clips[key],img=images.monsters[e.type]?.[key];
  if(e.dead&&e.death>clip.duration)return;
  const t=e.dead?e.death:g.phase==='enemy'?g.enemyClock:e.anim,frame=Math.min(clip.count-1,Math.floor((clip.loop?(t%clip.duration)/clip.duration:Math.min(1,t/clip.duration))*clip.count));
  const size=e.type==='ghost'?128:84,scale=src.gameScale?src.gameScale*size/100:e.type==='ghost'?1.15:size/130;
  if(selected&&!e.dead){circle(c,e.x,e.y,e.r+10,'#f8df9c19');c.strokeStyle='#f3d994';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,e.r+10,0,TAU);c.stroke();}
  c.save();c.translate(e.x,e.y+28);if(e.dead)c.globalAlpha=Math.max(0,1-e.death/clip.duration);
  c.fillStyle='#0b1d1744';c.beginPath();c.ellipse(0,5,e.r,7,0,0,TAU);c.fill();
  if(img?.naturalWidth){if(e.flash)c.filter='brightness(1.5)';c.drawImage(img,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,-clip.origin[0]*scale,-clip.origin[1]*scale,clip.width*scale,clip.height*scale);c.filter='none';}
  else{circle(c,0,-23,e.r,e.type==='guard'?'#acb4d3':'#b99dbb');text(c,FOES[e.type].name,0,-18,13);}
  c.restore();if(e.dead)return;
  if(e.mark){c.strokeStyle='#f4afd2';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,e.r+9,0,TAU);c.stroke();text(c,'◎',e.x+e.r+7,e.y-23,21,'#ffd3e7');}
  box(c,e.x-28,e.y+33,56,25,9,'#112a24f2');text(c,Math.ceil(e.hp),e.x,e.y+51,18,'#f9efd3');
  box(c,e.x-31,e.y+60,62,5,2,'#132e23');box(c,e.x-31,e.y+60,62*e.hp/e.maxHp,5,2,e.type==='ghost'?'#dab0da':'#bccb90');
  const intent=enemyIntent(g,e),caption=intent.icon+' '+intent.short;
  box(c,e.x-36,e.y-size*.6-29,72,26,8,'#132d25ee');c.strokeStyle=intent.color+'77';c.lineWidth=1;c.beginPath();c.roundRect(e.x-36,e.y-size*.6-29,72,26,8);c.stroke();text(c,caption,e.x,e.y-size*.6-10,17,intent.color);
  if(e.type==='ghost'){box(c,192,71,416,8,4,'#192a27');box(c,192,71,416*e.hp/e.maxHp,8,4,'#dda7db');}
}
export function renderGame(c,g,images,{reduced=false,selectedId=null}={}){
  c.clearRect(0,0,BOARD.w,BOARD.h);const bg=images.backgrounds[g.stage<2?'forest':'night'];
  c.fillStyle='#20392e';c.fillRect(0,0,800,960);
  if(bg?.naturalWidth){const h=960,w=h*bg.naturalWidth/bg.naturalHeight;c.drawImage(bg,(800-w)/2,0,w,h);}
  c.fillStyle='#102e298c';c.fillRect(0,0,800,960);
  const shade=c.createLinearGradient(0,0,0,960);shade.addColorStop(0,'#13251e77');shade.addColorStop(.5,'#22463755');shade.addColorStop(1,'#10261ef5');c.fillStyle=shade;c.fillRect(0,0,800,960);
  const rail=c.createLinearGradient(0,96,0,880);rail.addColorStop(0,'#d0b77e');rail.addColorStop(.5,'#897348');rail.addColorStop(1,'#b49d67');
  box(c,BOARD.left-10,BOARD.top-10,BOARD.right-BOARD.left+20,BOARD.bottom-BOARD.top+20,26,rail);box(c,BOARD.left,BOARD.top,BOARD.right-BOARD.left,BOARD.bottom-BOARD.top,18,'#183c2bde');
  c.strokeStyle='#e5d2a066';c.lineWidth=2;c.beginPath();c.roundRect(BOARD.left-5,BOARD.top-5,BOARD.right-BOARD.left+10,BOARD.bottom-BOARD.top+10,22);c.stroke();
  for(const x of [BOARD.left-1,BOARD.right+1])for(const y of [BOARD.top-1,BOARD.bottom+1]){circle(c,x,y,4,'#605b38');circle(c,x-1,y-1,2,'#e4d6ad');}
  for(let x=BOARD.left+35;x<BOARD.right;x+=50)for(let y=150;y<760;y+=50)circle(c,x,y,1.5,'#c2dba322');
  text(c,['숲의 첫 장난','방패 뒤의 사수','별빛이 뒤엉킨 길','이불령의 마지막 문'][g.stage],400,42,23);
  text(c,g.stage===3?'수호자를 쓰러뜨리면 아공간 탈출':'벽과 범퍼를 경유하면 방패의 방어도 뚫어요',400,g.stage===3?95:70,12,'#c1d0af');
  box(c,BOARD.left+3,BOARD.danger,BOARD.right-BOARD.left-6,BOARD.bottom-BOARD.danger-4,12,'#ad61561a');c.save();c.setLineDash([10,7]);c.strokeStyle='#e9ac9488';c.lineWidth=2;c.beginPath();c.moveTo(64,BOARD.danger);c.lineTo(736,BOARD.danger);c.stroke();c.restore();text(c,'!  접촉 피해 위험선',400,BOARD.danger+23,14,'#e7b6a0');
  for(const p of g.pegs){circle(c,p.x,p.y,p.r+9,'#a3d8bc14');circle(c,p.x,p.y,p.r+2,'#274f3b');circle(c,p.x,p.y,p.r,p.flash?'#efffca':'#94c9a0');circle(c,p.x-4,p.y-5,5,'#d7e9a9');circle(c,p.x,p.y,6,'#4c7956');text(c,'✦',p.x,p.y+5,13,'#d7edbc');}
  if(g.phase==='aim'){
    const points=preview(g);c.save();c.lineWidth=6;c.strokeStyle='#132c2377';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([7,10]);c.lineWidth=3;c.strokeStyle=g.useKing?'#ffdb8b':'#f3e0accc';c.stroke();c.restore();
    let contact=0;for(let i=1;i<points.length-1&&contact<3;i++){const a=points[i-1],p=points[i],b=points[i+1],ax=p.x-a.x,ay=p.y-a.y,bx=b.x-p.x,by=b.y-p.y;if(Math.hypot(ax,ay)*Math.hypot(bx,by)>1&&Math.abs(Math.atan2(ax*by-ay*bx,ax*bx+ay*by))>.25){circle(c,p.x,p.y,10,'#f1d89b');text(c,++contact,p.x,p.y+4,12,'#4b5d38');}}
    c.strokeStyle='#f0e4b9';c.lineWidth=1.5;c.beginPath();c.arc(g.aim.x,g.aim.y,12,0,TAU);c.moveTo(g.aim.x-19,g.aim.y);c.lineTo(g.aim.x+19,g.aim.y);c.moveTo(g.aim.x,g.aim.y-19);c.lineTo(g.aim.x,g.aim.y+19);c.stroke();
  }
  for(const e of g.enemies)enemy(c,g,e,images,e.id===selectedId);
  for(const b of g.balls){
    const color=b.king?'#f6cc89':b.low?'#aff2ff':b.child?'#ffcd98':'#f8e9c2';
    c.strokeStyle=color+(b.king?'aa':'77');c.lineWidth=b.king?b.r*.8:b.r;c.lineCap='round';c.beginPath();b.trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
    circle(c,b.x,b.y,b.r+3,'#10271e55');circle(c,b.x,b.y,b.r,b.king?'#b3936f':color);circle(c,b.x-b.r*.25,b.y-b.r*.25,b.r*.3,b.king?'#dfc18c':'#fffdf0');
    if(b.king){c.strokeStyle='#f8d992';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,b.r+3,g.time*3,g.time*3+TAU*.7);c.stroke();}
    if(b.child&&hasFusion(g,'fireworks'))text(c,'✦',b.x,b.y+5,16,'#ffe6ac');
  }
  for(const e of g.effects){const f=e.time/e.life;c.save();c.globalAlpha=1-f;c.translate(e.x,e.y);
    if(e.type==='text'){c.font='800 24px system-ui,sans-serif';c.textAlign='center';c.strokeStyle='#183328';c.lineWidth=4;c.strokeText(e.text,0,-f*36);text(c,e.text,0,-f*36,24,e.color);}
    else if(e.type==='beam'){c.strokeStyle=e.color;c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(400-e.x,850-e.y);c.stroke();}
    else if(e.type==='blast'){circle(c,0,0,e.r*f,(e.color||'#f4c88b')+'25');c.strokeStyle=e.color;c.lineWidth=3;c.beginPath();c.arc(0,0,e.r*f,0,TAU);c.stroke();}
    else{const n=e.type==='burst'?10:5;for(let i=0;i<n;i++){const a=i/n*TAU,r=(e.type==='burst'?48:24)*f;c.strokeStyle=e.color||'#fbdeb0';c.lineWidth=2;c.beginPath();c.moveTo(Math.cos(a)*r*.3,Math.sin(a)*r*.3);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke();}}
    c.restore();}
  // The original single-view character is intact. The table launcher, not a fake
  // rear-view weapon/rig, shows the actual aiming direction.
  const count=3+(g.inventory.pouch||0),tracking=Math.floor(count/3);
  box(c,240,900,500,44,14,'#173326e8');text(c,g.phase==='flight'?`${g.combo} 연쇄 · ${Math.ceil(g.turnDamage)} 피해`:g.phase==='enemy'?'적의 반격':g.phase==='aim'?`일반탄 ${count-tracking} · 추적탄 ${tracking}${g.useKing?' · 왕짱돌 +1':''}`:'',490,928,20);
  c.save();c.translate(HERO_PRESENTATION.x,HERO_PRESENTATION.y);drawButterMotion(c,images.butter,{size:HERO_PRESENTATION.size,time:g.time,action:g.action,gait:{amount:0,phase:0,clock:g.time}});c.restore();
  const l={x:g.launchX,y:BOARD.launch.y};c.save();c.translate(l.x,l.y);const a=Math.atan2(g.aim.y-l.y,g.aim.x-l.x)+Math.PI/2;c.rotate(a);c.strokeStyle='#e7c57f';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(0,29);c.lineTo(0,3);c.moveTo(-22,-14);c.lineTo(0,5);c.lineTo(22,-14);c.stroke();c.strokeStyle='#f6deba';c.lineWidth=2;c.beginPath();c.moveTo(-22,-14);c.lineTo(0,14);c.lineTo(22,-14);c.stroke();circle(c,0,10,g.useKing?13:7,g.useKing?'#efcc8d':'#faf0cb');c.restore();
  if(g.phase==='flight'&&g.returnSet){c.strokeStyle='#e0e8c6';c.lineWidth=2;c.beginPath();c.arc(g.returnX,BOARD.launch.y,12,0,TAU);c.stroke();text(c,'다음 발사',g.returnX,BOARD.launch.y-22,10,'#c9d7b1');}
  if(!reduced&&g.phase==='flight'&&g.combo>3)text(c,g.combo+' 연쇄',680,850,24,g.combo>10?'#ffce89':'#dce9b6');
  if(g.unlockMessage&&g.unlockUntil>g.time){box(c,160,90,480,39,14,'#6a6235ee');text(c,'✦ '+g.unlockMessage,400,116,21,'#ffe4a4');}
}
